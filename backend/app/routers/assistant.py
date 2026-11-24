from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import assistant, models, schemas
from ..core import config
from ..database import get_db
from ..deps import get_current_user

router = APIRouter(prefix="/api/assistant", tags=["assistant"])


@router.get("/status")
def status(_: models.User = Depends(get_current_user)):
    return {"enabled": bool(config.ANTHROPIC_API_KEY)}


@router.post("", response_model=schemas.AssistantOut)
def ask(data: schemas.AssistantIn, user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not assistant.allow(user.user_id):
        raise HTTPException(429, "Too many questions, try again later")
    try:
        return schemas.AssistantOut(answer=assistant.ask(db, user, data.question))
    except assistant.AssistantUnavailable as e:
        if str(e) == "not configured":
            raise HTTPException(503, "AI assistant is not configured")
        raise HTTPException(503, "AI assistant is temporarily unavailable")
