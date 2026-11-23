"""Telegram commands /week, /month, /year, /limits: short family reports in the chat.
Only data that every member already sees in the monthly report: totals per category and
the user's own total. No emails, no notes, no other members' individual expenses."""
from datetime import date, timedelta
from decimal import Decimal

from sqlalchemy import func
from sqlalchemy.orm import Session

from . import models
from .telegram import MONTHS, money
from .utils import month_range

PERIODS = {"week": "неделю", "month": "месяц", "year": "год"}


def period_range(kind: str, today: date) -> tuple[date, date, date, date]:
    """(start, end, prev_start, prev_end) with end exclusive. Current period runs up to and including today."""
    if kind == "week":
        start = today - timedelta(days=today.weekday())  # Monday
        return start, today + timedelta(days=1), start - timedelta(days=7), start
    if kind == "month":
        start, _ = month_range(today)
        prev_start, _ = month_range(start - timedelta(days=1))
        return start, today + timedelta(days=1), prev_start, start
    start = date(today.year, 1, 1)
    return start, today + timedelta(days=1), date(today.year - 1, 1, 1), start


def _by_category(db: Session, start: date, end: date, user_id: int | None = None) -> dict[str, Decimal]:
    T = models.Transaction
    q = (db.query(models.Category.category_name, func.sum(T.amount))
         .join(models.Category, models.Category.category_id == T.category_id)
         .filter(T.transaction_date >= start, T.transaction_date < end))
    if user_id is not None:
        q = q.filter(T.user_id == user_id)
    return {name: Decimal(total) for name, total in q.group_by(models.Category.category_name)}


def _change(now: Decimal, before: Decimal) -> str:
    if not before:
        return "прошлый период без расходов"
    pct = round(float((now - before) / before * 100))
    arrow = "📈" if pct > 0 else "📉" if pct < 0 else "➖"
    return f"{arrow} {'+' if pct > 0 else ''}{pct}% к прошлому периоду ({money(before)})"


def period_report(db: Session, user: models.User, kind: str, today: date | None = None) -> str:
    today = today or date.today()
    start, end, prev_start, prev_end = period_range(kind, today)
    cats = _by_category(db, start, end)
    total = sum(cats.values(), Decimal(0))
    prev_total = sum(_by_category(db, prev_start, prev_end).values(), Decimal(0))
    mine = sum(_by_category(db, start, end, user.user_id).values(), Decimal(0))

    lines = [f"📊 Отчёт за {PERIODS[kind]}: {start:%d.%m.%Y} – {today:%d.%m.%Y}"]
    if not total:
        lines.append("Расходов за этот период нет.")
        return "\n".join(lines)
    lines += [f"Семья потратила: {money(total)}", _change(total, prev_total), f"Ваши расходы: {money(mine)}", "",
              "Топ категорий:"]
    for name, amount in sorted(cats.items(), key=lambda x: -x[1])[:5]:
        lines.append(f"• {name}: {money(amount)} ({round(amount / total * 100)}%)")
    return "\n".join(lines)


def limits_report(db: Session, today: date | None = None) -> str:
    today = today or date.today()
    start, end = month_range(today)
    budgets = db.query(models.Budget).filter_by(month_start=start).all()
    title = f"🎯 Лимиты на {MONTHS[start.month - 1]} {start.year}"
    if not budgets:
        return f"{title}\nНа этот месяц лимиты не заданы. Их задаёт администратор на сайте."
    spent = _by_category(db, start, end)
    lines = [title]
    for b in sorted(budgets, key=lambda x: x.category.category_name):
        name = b.category.category_name
        s = spent.get(name, Decimal(0))
        pct = round(s / b.monthly_limit * 100)
        icon = "🔴" if s > b.monthly_limit else "🟡" if pct >= 80 else "🟢"
        rest = f"осталось {money(b.monthly_limit - s)}" if s <= b.monthly_limit else f"превышен на {money(s - b.monthly_limit)}"
        lines.append(f"{icon} {name}: {money(s)} из {money(b.monthly_limit)} ({pct}%), {rest}")
    return "\n".join(lines)
