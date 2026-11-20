import secrets
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from sqlalchemy.orm import Session

from .. import models, telegram
from ..core.config import TELEGRAM_BOT_TOKEN, TELEGRAM_BOT_USERNAME, TELEGRAM_WEBHOOK_SECRET
from ..database import get_db
from ..deps import get_current_user

router = APIRouter(prefix="/api/telegram", tags=["telegram"])

CODE_TTL = timedelta(minutes=10)


def _now() -> datetime:
    # naive UTC, the same as stored in the DateTime column
    return datetime.now(timezone.utc).replace(tzinfo=None)

HELP = ("Это бот Family Budget Tracker. Чтобы получать уведомления о лимитах, "
        "откройте Профиль на сайте и нажмите «Подключить Telegram».")


@router.get("/status")
def status(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    return {"enabled": bool(TELEGRAM_BOT_TOKEN), "bot_username": TELEGRAM_BOT_USERNAME or None,
            "linked": db.get(models.TelegramLink, user.user_id) is not None}


@router.post("/link")
def create_link_code(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not TELEGRAM_BOT_TOKEN:
        raise HTTPException(503, "Telegram bot is not configured")
    # only the newest code works: older unused codes of this user are removed
    db.query(models.TelegramLinkCode).filter_by(user_id=user.user_id).delete()
    code = secrets.token_urlsafe(16)  # 22 chars, allowed in a t.me ?start= parameter
    db.add(models.TelegramLinkCode(code=code, user_id=user.user_id, expires_at=_now() + CODE_TTL))
    db.commit()
    url = f"https://t.me/{TELEGRAM_BOT_USERNAME}?start={code}" if TELEGRAM_BOT_USERNAME else None
    return {"code": code, "url": url, "expires_in": int(CODE_TTL.total_seconds())}


@router.delete("/link", status_code=204)
def unlink(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    db.query(models.TelegramLink).filter_by(user_id=user.user_id).delete()
    db.commit()


def linked_text(full_name: str) -> str:
    return f"Готово, {full_name}! Сюда будут приходить уведомления о лимитах бюджета. Отключить: /stop"


@router.post("/test")
def send_examples(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Send one example of every bot message to the user's linked chat (for demos and screenshots)."""
    link = db.get(models.TelegramLink, user.user_id)
    if not link:
        raise HTTPException(400, "Telegram is not linked")
    period = telegram.period_label(date.today().replace(day=1))
    examples = [
        linked_text(user.full_name),
        telegram.warning_text("Food", period, Decimal("82000"), Decimal("100000")),
        telegram.exceeded_text("Food", period, Decimal("110000"), Decimal("100000"), user.full_name),
        telegram.warning_text("Transport", period, Decimal("33500"), Decimal("40000")),
        telegram.exceeded_text("Entertainment", period, Decimal("31200"), Decimal("30000"), user.full_name),
        HELP,
        "Уведомления отключены.",
    ]
    for text in examples:
        telegram._send(link.chat_id, f"[пример] {text}")
    return {"sent": len(examples)}


def _link(db: Session, chat_id: int, code: str) -> str:
    row = db.get(models.TelegramLinkCode, code)
    if not row or row.expires_at < _now():
        return "Код не найден или устарел. Нажмите «Подключить Telegram» в профиле ещё раз."
    other = db.query(models.TelegramLink).filter_by(chat_id=chat_id).first()
    if other and other.user_id != row.user_id:
        return "Этот Telegram уже привязан к другому аккаунту. Сначала отправьте /stop."
    link = db.get(models.TelegramLink, row.user_id)
    if link:
        link.chat_id = chat_id  # user re-links from a new chat: the old chat stops getting messages
    else:
        db.add(models.TelegramLink(user_id=row.user_id, chat_id=chat_id))
    db.delete(row)  # one-time code
    db.commit()
    user = db.get(models.User, row.user_id)
    return linked_text(user.full_name)


@router.post("/webhook", include_in_schema=False)
async def webhook(request: Request, db: Session = Depends(get_db),
                  secret: str | None = Header(None, alias="X-Telegram-Bot-Api-Secret-Token")):
    if not TELEGRAM_WEBHOOK_SECRET or not secrets.compare_digest(secret or "", TELEGRAM_WEBHOOK_SECRET):
        raise HTTPException(403, "Forbidden")
    update = await request.json()
    message = update.get("message") or {}
    chat_id = (message.get("chat") or {}).get("id")
    text = (message.get("text") or "").strip()
    if not chat_id:
        return {"ok": True}  # other update types are ignored

    if text.startswith("/start") and len(text.split()) == 2:
        reply = _link(db, chat_id, text.split()[1])
    elif text == "/stop":
        deleted = db.query(models.TelegramLink).filter_by(chat_id=chat_id).delete()
        db.commit()
        reply = "Уведомления отключены." if deleted else "Этот чат не был привязан."
    else:
        reply = HELP
    telegram._send(chat_id, reply)
    return {"ok": True}
