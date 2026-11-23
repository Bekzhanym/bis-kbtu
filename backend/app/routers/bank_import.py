from decimal import Decimal

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from .. import models, schemas
from ..bank_import import ROW, extract_text, parse_statement
from ..database import get_db
from ..deps import get_current_user
from ..telegram import notify_limits
from .transactions import _active_category, _out

router = APIRouter(prefix="/api/import", tags=["import"])

MAX_PDF = 5 * 1024 * 1024


@router.post("/kaspi", response_model=schemas.ImportPreview)
async def preview_kaspi(request: Request, user: models.User = Depends(get_current_user),
                        db: Session = Depends(get_db)):
    """Body: the PDF file itself (Content-Type: application/pdf). Returns a preview, saves nothing."""
    pdf = await request.body()
    if len(pdf) > MAX_PDF:
        raise HTTPException(413, "File is larger than 5 MB")
    if not pdf.startswith(b"%PDF"):
        raise HTTPException(400, "Not a PDF file")
    try:
        text = extract_text(pdf)
    except Exception:
        raise HTTPException(400, "Could not read the PDF")
    rows = parse_statement(text)
    if not rows:
        raise HTTPException(400, "No Kaspi expenses found in this file")

    categories = {c.category_name: c.category_id for c in db.query(models.Category).filter_by(is_active=True)}
    T = models.Transaction
    dates = [r.date for r in rows]
    existing = {(t.transaction_date, Decimal(t.amount)) for t in db.query(T).filter(
        T.user_id == user.user_id, T.transaction_date >= min(dates), T.transaction_date <= max(dates))}
    out = []
    for r in rows:
        dup = (r.date, r.amount) in existing
        out.append(schemas.ImportRow(
            transaction_date=r.date, amount=r.amount, operation=r.operation, details=r.details,
            category_id=categories.get(r.category_name) if r.category_name else None,
            selected=r.selected and not dup, duplicate=dup))
    income = sum(1 for line in text.splitlines() if (m := ROW.search(line.strip())) and m["sign"] == "+")
    return schemas.ImportPreview(rows=out, skipped_income=income)


@router.post("/confirm", response_model=list[schemas.TransactionOut], status_code=201)
def confirm_import(data: schemas.ImportConfirm, background: BackgroundTasks,
                   user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Save the rows the user ticked. Atomic: all or nothing, like the split receipt."""
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
    background.add_task(notify_limits, [(user.user_id, t.category_id, t.transaction_date, t.amount) for t in rows])
    return [_out(t, user) for t in rows]
