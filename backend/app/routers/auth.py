from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from .. import models, schemas
from ..core.security import create_access_token, hash_password, verify_password
from ..database import get_db
from ..deps import get_current_user

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _token(user: models.User) -> schemas.TokenOut:
    return schemas.TokenOut(access_token=create_access_token(user.user_id),
                            user=schemas.UserOut.model_validate(user))


@router.post("/register", response_model=schemas.TokenOut, status_code=201)
def register(data: schemas.RegisterIn, db: Session = Depends(get_db)):
    if db.query(models.User).filter(models.User.email == data.email).first():
        raise HTTPException(status.HTTP_409_CONFLICT, "Email already registered")
    # New accounts are always members; only an admin can promote someone
    user = models.User(full_name=data.full_name, email=data.email, role="member")
    db.add(user)
    db.flush()
    db.add(models.Credential(user_id=user.user_id, password_hash=hash_password(data.password)))
    db.commit()
    db.refresh(user)
    return _token(user)


@router.post("/login", response_model=schemas.TokenOut)
def login(data: schemas.LoginIn, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == data.email).first()
    cred = db.get(models.Credential, user.user_id) if user else None
    if not cred or not verify_password(data.password, cred.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid email or password")
    return _token(user)


@router.get("/me", response_model=schemas.UserOut)
def me(user: models.User = Depends(get_current_user)):
    return user


@router.patch("/me", response_model=schemas.UserOut)
def update_me(data: schemas.ProfileUpdate, user: models.User = Depends(get_current_user),
              db: Session = Depends(get_db)):
    if data.email and data.email != user.email:
        if db.query(models.User).filter(models.User.email == data.email).first():
            raise HTTPException(status.HTTP_409_CONFLICT, "Email already registered")
        user.email = data.email
    if data.full_name:
        user.full_name = data.full_name
    db.commit()
    db.refresh(user)
    return user


@router.post("/change-password", status_code=204)
def change_password(data: schemas.PasswordChange, user: models.User = Depends(get_current_user),
                    db: Session = Depends(get_db)):
    cred = db.get(models.Credential, user.user_id)
    if not cred or not verify_password(data.current_password, cred.password_hash):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Current password is incorrect")
    cred.password_hash = hash_password(data.new_password)
    db.commit()
