from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..deps import get_current_user, require_admin

router = APIRouter(prefix="/api/budgets", tags=["budgets"])


def _out(b: models.Budget) -> schemas.BudgetOut:
    return schemas.BudgetOut(budget_id=b.budget_id, category_id=b.category_id,
                             category_name=b.category.category_name,
                             month_start=b.month_start, monthly_limit=b.monthly_limit)


@router.get("", response_model=list[schemas.BudgetOut])
def list_budgets(month: date | None = Query(None), _: models.User = Depends(get_current_user),
                 db: Session = Depends(get_db)):
    q = db.query(models.Budget)
    if month:
        q = q.filter(models.Budget.month_start == month.replace(day=1))
    return [_out(b) for b in q.order_by(models.Budget.month_start.desc(), models.Budget.category_id)]


@router.post("", response_model=schemas.BudgetOut, status_code=201)
def create_budget(data: schemas.BudgetIn, _: models.User = Depends(require_admin),
                  db: Session = Depends(get_db)):
    if not db.get(models.Category, data.category_id):
        raise HTTPException(400, "Category does not exist")
    exists = db.query(models.Budget).filter_by(category_id=data.category_id,
                                               month_start=data.month_start).first()
    if exists:
        raise HTTPException(409, "This category already has a limit for that month")
    b = models.Budget(**data.model_dump())
    db.add(b)
    db.commit()
    db.refresh(b)
    return _out(b)


@router.patch("/{budget_id}", response_model=schemas.BudgetOut)
def update_budget(budget_id: int, data: schemas.BudgetUpdate, _: models.User = Depends(require_admin),
                  db: Session = Depends(get_db)):
    b = db.get(models.Budget, budget_id)
    if not b:
        raise HTTPException(404, "Budget not found")
    b.monthly_limit = data.monthly_limit
    db.commit()
    db.refresh(b)
    return _out(b)


@router.delete("/{budget_id}", status_code=204)
def delete_budget(budget_id: int, _: models.User = Depends(require_admin), db: Session = Depends(get_db)):
    b = db.get(models.Budget, budget_id)
    if not b:
        raise HTTPException(404, "Budget not found")
    db.delete(b)
    db.commit()
