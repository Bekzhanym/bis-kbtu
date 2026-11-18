"""Sending Telegram messages and the budget-limit notifications."""
import json
import logging
import urllib.request
from datetime import date
from decimal import Decimal

from sqlalchemy import func

from . import models
from .core.config import TELEGRAM_BOT_TOKEN
from .database import SessionLocal
from .utils import month_range

log = logging.getLogger(__name__)

MONTHS = ["январь", "февраль", "март", "апрель", "май", "июнь", "июль", "август",
          "сентябрь", "октябрь", "ноябрь", "декабрь"]


def money(v: Decimal) -> str:
    return f"{v:,.0f}".replace(",", " ") + " ₸"


def send_message(chat_id: int, text: str) -> bool:
    """Real sender. Tests replace it with a fake that records messages."""
    if not TELEGRAM_BOT_TOKEN:
        log.info("Telegram is not configured, message to %s skipped", chat_id)
        return False
    req = urllib.request.Request(
        f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
        data=json.dumps({"chat_id": chat_id, "text": text}).encode(),
        headers={"Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as res:
            return res.status == 200
    except Exception:  # a notification must never break saving an expense
        log.exception("Telegram sendMessage failed")
        return False


def _send(chat_id: int, text: str) -> None:
    # looked up at call time so tests can monkeypatch send_message
    send_message(chat_id, text)


def threshold_crossed(before: Decimal, after: Decimal, limit: Decimal) -> int | None:
    """100 if this expense pushed spending over the limit, 80 if over 80%, else None."""
    if before <= limit < after:
        return 100
    if before <= limit * Decimal("0.8") < after <= limit:
        return 80
    return None


def notify_limits(added: list[tuple[int, int, date, Decimal]]) -> None:
    """added: (user_id, category_id, transaction_date, amount) of the expenses just saved.
    Runs after the response is sent (FastAPI BackgroundTasks) with its own DB session."""
    groups: dict[tuple[int, date], tuple[Decimal, int]] = {}
    for user_id, category_id, d, amount in added:
        start, _ = month_range(d)
        total, _ = groups.get((category_id, start), (Decimal(0), user_id))
        groups[(category_id, start)] = (total + amount, user_id)

    with SessionLocal() as db:
        for (category_id, start), (amount, user_id) in groups.items():
            budget = db.query(models.Budget).filter_by(category_id=category_id, month_start=start).first()
            if not budget:
                continue
            _, end = month_range(start)
            T = models.Transaction
            after = Decimal(db.query(func.coalesce(func.sum(T.amount), 0)).filter(
                T.category_id == category_id, T.transaction_date >= start, T.transaction_date < end).scalar())
            level = threshold_crossed(after - amount, after, budget.monthly_limit)
            if not level:
                continue
            author = db.get(models.User, user_id)
            name = budget.category.category_name
            period = f"{MONTHS[start.month - 1]} {start.year}"
            if level == 100:
                text = (f"⚠️ Лимит «{name}» на {period} превышен: {money(after)} из {money(budget.monthly_limit)}. "
                        f"Последний расход добавил(а) {author.full_name}.")
            else:
                text = (f"🔔 По категории «{name}» потрачено {money(after)} из {money(budget.monthly_limit)} "
                        f"({round(after / budget.monthly_limit * 100)}%) за {period}.")
            # the author and every admin, each chat once
            admin_ids = [u for (u,) in db.query(models.User.user_id).filter(models.User.role == "admin")]
            links = db.query(models.TelegramLink).filter(
                models.TelegramLink.user_id.in_({user_id, *admin_ids})).all()
            for chat_id in {link.chat_id for link in links}:
                _send(chat_id, text)
