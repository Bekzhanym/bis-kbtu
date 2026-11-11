from datetime import date
from decimal import Decimal
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..deps import get_current_user
from ..utils import month_range

router = APIRouter(prefix="/api/transactions", tags=["transactions"])


def _out(t: models.Transaction, viewer: models.User) -> schemas.TransactionOut:
    mine = t.user_id == viewer.user_id
    return schemas.TransactionOut(
        transaction_id=t.transaction_id, user_id=t.user_id, user_full_name=t.user.full_name,
        category_id=t.category_id, category_name=t.category.category_name,
        amount=t.amount, transaction_date=t.transaction_date,
        note=t.note if mine else None,  # notes are private to their author
        is_mine=mine,
    )


def _active_category(db: Session, category_id: int) -> models.Category:
    cat = db.get(models.Category, category_id)
    if not cat or not cat.is_active:
        raise HTTPException(400, "Category does not exist or is inactive")
    return cat


def _own(db: Session, transaction_id: int, user: models.User) -> models.Transaction:
    t = db.get(models.Transaction, transaction_id)
    if not t:
        raise HTTPException(404, "Transaction not found")
    if t.user_id != user.user_id:
        raise HTTPException(403, "You can only change your own expenses")
    return t


@router.get("", response_model=list[schemas.TransactionOut])
def list_transactions(
    scope: Literal["mine", "all"] = "mine",
    month: date | None = Query(None, description="Any date inside the month"),
    category_id: int | None = None,
    min_amount: Decimal | None = Query(None, description="Only amounts strictly greater than this"),
    max_amount: Decimal | None = Query(None, description="Only amounts less than or equal to this"),
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if scope == "all" and user.role != "admin":
        raise HTTPException(403, "Only admins can see all family expenses")
    q = db.query(models.Transaction)
    if scope == "mine":
        q = q.filter(models.Transaction.user_id == user.user_id)
    if month:
        start, end = month_range(month)
        q = q.filter(models.Transaction.transaction_date >= start,
                     models.Transaction.transaction_date < end)
    if category_id:
        q = q.filter(models.Transaction.category_id == category_id)
    if min_amount is not None:
        q = q.filter(models.Transaction.amount > min_amount)
    if max_amount is not None:
        q = q.filter(models.Transaction.amount <= max_amount)
    rows = q.order_by(models.Transaction.transaction_date.desc(),
                      models.Transaction.transaction_id.desc()).all()
    return [_out(t, user) for t in rows]


@router.post("", response_model=schemas.TransactionOut, status_code=201)
def create_transaction(data: schemas.TransactionIn, user: models.User = Depends(get_current_user),
                       db: Session = Depends(get_db)):
    _active_category(db, data.category_id)
    t = models.Transaction(user_id=user.user_id, **data.model_dump())
    t.note = t.note or None
    db.add(t)
    db.commit()
    db.refresh(t)
    return _out(t, user)


@router.post("/split", response_model=list[schemas.TransactionOut], status_code=201)
def create_split(data: schemas.SplitIn, user: models.User = Depends(get_current_user),
                 db: Session = Depends(get_db)):
    """Atomic: either every row is saved, or none (ROLLBACK)."""
    try:
        rows = []
        for item in data.items:
            _active_category(db, item.category_id)
            t = models.Transaction(user_id=user.user_id, **item.model_dump())
            t.note = t.note or None
            db.add(t)
            rows.append(t)
        db.commit()
    except Exception:
        db.rollback()
        raise
    for t in rows:
        db.refresh(t)
    return [_out(t, user) for t in rows]


@router.patch("/{transaction_id}", response_model=schemas.TransactionOut)
def update_transaction(transaction_id: int, data: schemas.TransactionUpdate,
                       user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    t = _own(db, transaction_id, user)
    fields = data.model_dump(exclude_unset=True)
    if fields.get("category_id") is not None and fields["category_id"] != t.category_id:
        _active_category(db, fields["category_id"])
    for k, v in fields.items():
        if v is not None or k == "note":
            setattr(t, k, v or None if k == "note" else v)
    db.commit()
    db.refresh(t)
    return _out(t, user)


@router.delete("/{transaction_id}", status_code=204)
def delete_transaction(transaction_id: int, user: models.User = Depends(get_current_user),
                       db: Session = Depends(get_db)):
    db.delete(_own(db, transaction_id, user))
    db.commit()
