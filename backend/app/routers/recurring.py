from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..deps import get_current_user
from ..recurring import run_due
from .transactions import _active_category

router = APIRouter(prefix="/api/recurring", tags=["recurring"])


def _out(r: models.RecurringExpense) -> schemas.RecurringOut:
    return schemas.RecurringOut(recurring_id=r.recurring_id, category_id=r.category_id,
                                category_name=r.category.category_name, amount=r.amount,
                                day_of_month=r.day_of_month, note=r.note, is_active=r.is_active)


def _own(db: Session, recurring_id: int, user: models.User) -> models.RecurringExpense:
    r = db.get(models.RecurringExpense, recurring_id)
    # someone else's template looks the same as a missing one
    if not r or r.user_id != user.user_id:
        raise HTTPException(404, "Recurring expense not found")
    return r


@router.get("", response_model=list[schemas.RecurringOut])
def list_recurring(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = db.query(models.RecurringExpense).filter_by(user_id=user.user_id)
    return [_out(r) for r in rows.order_by(models.RecurringExpense.day_of_month)]


@router.post("", response_model=schemas.RecurringOut, status_code=201)
def create_recurring(data: schemas.RecurringIn, user: models.User = Depends(get_current_user),
                     db: Session = Depends(get_db)):
    _active_category(db, data.category_id)
    r = models.RecurringExpense(user_id=user.user_id, **data.model_dump())
    r.note = r.note or None
    db.add(r)
    db.commit()
    run_due(db)  # if the day has already come this month, the expense appears right away
    db.refresh(r)
    return _out(r)


@router.patch("/{recurring_id}", response_model=schemas.RecurringOut)
def update_recurring(recurring_id: int, data: schemas.RecurringUpdate,
                     user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    r = _own(db, recurring_id, user)
    fields = data.model_dump(exclude_unset=True)
    if fields.get("category_id") is not None and fields["category_id"] != r.category_id:
        _active_category(db, fields["category_id"])
    for k, v in fields.items():
        if v is not None or k == "note":
            setattr(r, k, v or None if k == "note" else v)
    db.commit()
    db.refresh(r)
    return _out(r)


@router.delete("/{recurring_id}", status_code=204)
def delete_recurring(recurring_id: int, user: models.User = Depends(get_current_user),
                     db: Session = Depends(get_db)):
    # transactions already created stay; only future ones stop
    r = _own(db, recurring_id, user)
    db.query(models.RecurringRun).filter_by(recurring_id=r.recurring_id).delete()
    db.delete(r)
    db.commit()
