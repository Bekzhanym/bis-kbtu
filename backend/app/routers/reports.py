from datetime import date
from decimal import Decimal

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..deps import get_current_user
from ..utils import month_range

router = APIRouter(prefix="/api/reports", tags=["reports"])


@router.get("/monthly", response_model=schemas.MonthlyReport)
def monthly_report(month: date = Query(..., description="Any date in the month, e.g. 2026-10-01"),
                   user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Shared family totals. Contains no emails and no notes."""
    start, end = month_range(month)
    T = models.Transaction
    in_month = (T.transaction_date >= start, T.transaction_date < end)

    by_cat = dict(db.query(T.category_id, func.sum(T.amount)).filter(*in_month).group_by(T.category_id))
    limits = {b.category_id: b.monthly_limit
              for b in db.query(models.Budget).filter(models.Budget.month_start == start)}

    categories = []
    for c in db.query(models.Category).order_by(models.Category.category_name):
        spent = Decimal(by_cat.get(c.category_id) or 0)
        lim = limits.get(c.category_id)
        if not c.is_active and not spent and lim is None:
            continue
        categories.append(schemas.CategoryReport(
            category_id=c.category_id, category_name=c.category_name, monthly_limit=lim, spent=spent,
            remaining=(lim - spent) if lim is not None else None,
            over_limit=lim is not None and spent > lim,
        ))

    members = [
        schemas.MemberReport(user_id=uid, full_name=name, spent=Decimal(total))
        for uid, name, total in db.query(models.User.user_id, models.User.full_name, func.sum(T.amount))
        .join(T, T.user_id == models.User.user_id).filter(*in_month)
        .group_by(models.User.user_id, models.User.full_name).order_by(func.sum(T.amount).desc())
    ]
    my = next((m.spent for m in members if m.user_id == user.user_id), Decimal(0))

    return schemas.MonthlyReport(
        month_start=start,
        total_spent=sum((c.spent for c in categories), Decimal(0)),
        total_limit=sum((c.monthly_limit for c in categories if c.monthly_limit), Decimal(0)),
        my_spent=my, categories=categories, members=members,
    )
