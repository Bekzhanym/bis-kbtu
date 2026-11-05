from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..deps import require_admin

router = APIRouter(prefix="/api/users", tags=["users (admin)"])


@router.get("", response_model=list[schemas.UserOut])
def list_users(_: models.User = Depends(require_admin), db: Session = Depends(get_db)):
    return db.query(models.User).order_by(models.User.user_id).all()


@router.patch("/{user_id}/role", response_model=schemas.UserOut)
def set_role(user_id: int, data: schemas.RoleUpdate, _: models.User = Depends(require_admin),
             db: Session = Depends(get_db)):
    user = db.get(models.User, user_id)
    if not user:
        raise HTTPException(404, "User not found")
    if user.role == "admin" and data.role == "member":
        admins = db.query(models.User).filter(models.User.role == "admin").count()
        if admins <= 1:
            raise HTTPException(400, "The household must keep at least one admin")
    user.role = data.role
    db.commit()
    db.refresh(user)
    return user
