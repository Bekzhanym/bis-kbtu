from datetime import date, timedelta
from decimal import Decimal

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..deps import get_current_user
from ..utils import month_range

router = APIRouter(prefix="/api/reports", tags=["reports"])


def _pct(now: Decimal, before: Decimal) -> float | None:
    return round(float((now - before) / before * 100), 1) if before else None


def _spent_by_category(db: Session, start: date, end: date) -> dict[int, Decimal]:
    T = models.Transaction
    rows = (db.query(T.category_id, func.sum(T.amount))
            .filter(T.transaction_date >= start, T.transaction_date < end).group_by(T.category_id))
    return {cid: Decimal(total) for cid, total in rows}


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


@router.get("/compare", response_model=schemas.MonthCompare)
def compare_months(month: date = Query(..., description="Any date in the month, e.g. 2026-10-01"),
                   with_month: date | None = Query(None, alias="with",
                                                   description="Month to compare with (default: previous)"),
                   _: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Family spending of one month vs another, per category. Totals only: no names, emails or notes."""
    start, end = month_range(month)
    prev_start, prev_end = month_range(with_month or (start - timedelta(days=1)))
    now, before = _spent_by_category(db, start, end), _spent_by_category(db, prev_start, prev_end)

    categories = []
    for c in db.query(models.Category).order_by(models.Category.category_name):
        a, b = now.get(c.category_id, Decimal(0)), before.get(c.category_id, Decimal(0))
        if not a and not b:
            continue
        categories.append(schemas.CategoryCompare(
            category_id=c.category_id, category_name=c.category_name,
            spent=a, prev_spent=b, diff=a - b, diff_pct=_pct(a, b),
        ))
    total, prev_total = sum(now.values(), Decimal(0)), sum(before.values(), Decimal(0))
    return schemas.MonthCompare(
        month_start=start, prev_month_start=prev_start, total_spent=total, prev_total_spent=prev_total,
        diff=total - prev_total, diff_pct=_pct(total, prev_total), categories=categories,
    )
