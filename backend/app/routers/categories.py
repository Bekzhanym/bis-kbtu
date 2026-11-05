from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..deps import get_current_user, require_admin

router = APIRouter(prefix="/api/categories", tags=["categories"])


def _name_taken(db: Session, name: str, exclude_id: int | None = None) -> bool:
    q = db.query(models.Category).filter(func.lower(models.Category.category_name) == name.lower())
    if exclude_id:
        q = q.filter(models.Category.category_id != exclude_id)
    return db.query(q.exists()).scalar()


@router.get("", response_model=list[schemas.CategoryOut])
def list_categories(_: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(models.Category).order_by(models.Category.category_name).all()


@router.post("", response_model=schemas.CategoryOut, status_code=201)
def create_category(data: schemas.CategoryIn, _: models.User = Depends(require_admin),
                    db: Session = Depends(get_db)):
    name = " ".join(data.category_name.split())
    if _name_taken(db, name):
        raise HTTPException(409, "Category already exists")
    cat = models.Category(category_name=name, description=data.description or None, is_active=True)
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return cat


@router.patch("/{category_id}", response_model=schemas.CategoryOut)
def update_category(category_id: int, data: schemas.CategoryUpdate,
                    _: models.User = Depends(require_admin), db: Session = Depends(get_db)):
    cat = db.get(models.Category, category_id)
    if not cat:
        raise HTTPException(404, "Category not found")
    fields = data.model_dump(exclude_unset=True)
    if "category_name" in fields and fields["category_name"]:
        name = " ".join(fields["category_name"].split())
        if _name_taken(db, name, exclude_id=category_id):
            raise HTTPException(409, "Category already exists")
        cat.category_name = name
    if "description" in fields:
        cat.description = fields["description"] or None
    if fields.get("is_active") is not None:
        # Deactivate instead of delete, so expense history stays intact
        cat.is_active = fields["is_active"]
    db.commit()
    db.refresh(cat)
    return cat
