"""AI assistant: answers questions about the family budget with Claude.

Privacy: the model only gets what this user can already see in the app: the family monthly
report (totals per category, limits), the comparison with last month, and the user's OWN
expenses as date + category + amount. No emails, no notes, no other people's expenses."""
import logging
import time
from collections import defaultdict, deque
from datetime import date, timedelta
from decimal import Decimal

from sqlalchemy.orm import Session

from . import models
from .core import config
from .telegram import MONTHS, money
from .utils import month_range

log = logging.getLogger(__name__)

MODEL = "claude-opus-5-5"
MAX_QUESTIONS_PER_HOUR = 20

INSTRUCTIONS = """Ты финансовый помощник в приложении Family Budget Tracker (семейный бюджет, Казахстан, суммы в тенге ₸).
Отвечай на языке вопроса (русский, казахский или английский), коротко и по делу: 2–6 предложений или короткий список.
Опирайся только на данные ниже. Если данных не хватает для ответа, так и скажи и подскажи, что внести в приложение.
Считай аккуратно и показывай итоговые цифры. Не придумывай расходы и лимиты, которых нет в данных.
Давай практичные советы по бюджету; не давай инвестиционных, налоговых или юридических рекомендаций.
Если вопрос не про бюджет и расходы, вежливо верни разговор к бюджету."""


class AssistantUnavailable(Exception):
    pass


def build_context(db: Session, user: models.User, today: date | None = None) -> str:
    today = today or date.today()
    start, end = month_range(today)
    prev_start, _ = month_range(start - timedelta(days=1))
    T = models.Transaction

    def spent(s: date, e: date, user_id: int | None = None) -> dict[str, Decimal]:
        q = db.query(T).filter(T.transaction_date >= s, T.transaction_date < e)
        if user_id is not None:
            q = q.filter(T.user_id == user_id)
        out: dict[str, Decimal] = defaultdict(Decimal)
        for t in q:
            out[t.category.category_name] += t.amount
        return out

    now, before = spent(start, end), spent(prev_start, start)
    limits = {b.category.category_name: b.monthly_limit
              for b in db.query(models.Budget).filter_by(month_start=start)}
    days_in_month = (end - start).days

    lines = [f"Сегодня: {today:%d.%m.%Y}, день {today.day} из {days_in_month}.",
             f"Пользователь: {user.full_name}, роль: {'администратор' if user.role == 'admin' else 'участник'}.",
             f"\nРасходы семьи за {MONTHS[start.month - 1]} {start.year} по категориям:"]
    for name in sorted(set(now) | set(limits) | set(before)):
        lim = limits.get(name)
        lines.append(f"- {name}: потрачено {money(now.get(name, Decimal(0)))}"
                     f"{f', лимит {money(lim)}' if lim else ', лимита нет'}"
                     f", в прошлом месяце {money(before.get(name, Decimal(0)))}")
    lines.append(f"Всего семья: {money(sum(now.values(), Decimal(0)))}; "
                 f"в прошлом месяце: {money(sum(before.values(), Decimal(0)))}.")

    mine = db.query(T).filter(T.user_id == user.user_id, T.transaction_date >= start - timedelta(days=60),
                              T.transaction_date < end).order_by(T.transaction_date)
    rows = [f"{t.transaction_date:%d.%m} {t.category.category_name} {money(t.amount)}" for t in mine]
    lines.append("\nЛичные расходы пользователя за последние ~3 месяца (дата, категория, сумма):")
    lines += rows[-150:] or ["нет расходов"]
    return "\n".join(lines)


def call_claude(system: str, question: str) -> str:
    """The only place that talks to the API. Tests replace it."""
    if not config.ANTHROPIC_API_KEY:
        raise AssistantUnavailable("not configured")
    import anthropic  # only this feature needs the SDK

    client = anthropic.Anthropic(api_key=config.ANTHROPIC_API_KEY, timeout=60.0)
    try:
        response = client.beta.messages.create(
            model=MODEL,
            max_tokens=16000,
            output_config={"effort": "low"},  # short chat answers
            # if the model declines, the API retries on a fallback model inside the same call
            betas=["server-side-fallback-2026-07-01"],
            fallbacks="default",
            system=system,
            messages=[{"role": "user", "content": question}],
        )
    except anthropic.RateLimitError:
        raise AssistantUnavailable("busy")
    except (anthropic.APIStatusError, anthropic.APIConnectionError):
        log.exception("Claude API call failed")
        raise AssistantUnavailable("error")
    if response.stop_reason == "refusal":
        return "Я не могу ответить на этот вопрос. Спросите, пожалуйста, что-нибудь про ваш бюджет."
    text = "".join(b.text for b in response.content if b.type == "text").strip()
    return text or "Не получилось сформулировать ответ, попробуйте переформулировать вопрос."


_recent: dict[int, deque] = defaultdict(deque)


def allow(user_id: int, now: float | None = None) -> bool:
    """Simple per-user limit: MAX_QUESTIONS_PER_HOUR questions in a sliding hour (per server process)."""
    now = now or time.monotonic()
    q = _recent[user_id]
    while q and now - q[0] > 3600:
        q.popleft()
    if len(q) >= MAX_QUESTIONS_PER_HOUR:
        return False
    q.append(now)
    return True


def ask(db: Session, user: models.User, question: str) -> str:
    system = f"{INSTRUCTIONS}\n\nДанные:\n{build_context(db, user)}"
    return call_claude(system, question)
