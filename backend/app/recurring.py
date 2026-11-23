"""Turns recurring expenses into real transactions when their day of the month comes."""
from datetime import date

from sqlalchemy.orm import Session

from . import models


def run_due(db: Session, today: date | None = None) -> int:
    """Create this month's transaction for every active recurring expense whose day has come.
    Safe to call on every request: RecurringRun (unique per month) prevents double charges.
    Only the current month is filled; missed past months are not back-filled."""
    today = today or date.today()
    month = today.replace(day=1)
    done = {r for (r,) in db.query(models.RecurringRun.recurring_id).filter_by(month_start=month)}
    created = 0
    for rec in db.query(models.RecurringExpense).filter_by(is_active=True):
        if rec.recurring_id in done or rec.day_of_month > today.day or not rec.category.is_active:
            continue
        t = models.Transaction(user_id=rec.user_id, category_id=rec.category_id, amount=rec.amount,
                               transaction_date=month.replace(day=rec.day_of_month),
                               note=rec.note or "Регулярный платёж")
        db.add(t)
        db.flush()
        db.add(models.RecurringRun(recurring_id=rec.recurring_id, month_start=month, transaction_id=t.transaction_id))
        created += 1
    if created:
        db.commit()
    return created
