import csv
from datetime import date
from decimal import Decimal
from pathlib import Path

from sqlalchemy.orm import Session

from .core.config import DEMO_PASSWORD
from .core.security import hash_password
from .models import Budget, Category, Credential, Transaction, User

DATA_DIR = Path(__file__).resolve().parent.parent / "data"


def _rows(name: str):
    with open(DATA_DIR / name, newline="", encoding="utf-8") as f:
        yield from csv.DictReader(f)


def seed(db: Session) -> None:
    """Load demo CSV data once; give demo users a password if they have none."""
    if not db.query(User).first():
        for r in _rows("users_BIS.csv"):
            db.add(User(user_id=int(r["user_id"]), full_name=r["full_name"].strip(),
                        email=r["email"].strip().lower(), role=r["role"]))
        for r in _rows("categories_BIS.csv"):
            db.add(Category(category_id=int(r["category_id"]), category_name=r["category_name"],
                            description=r["description"] or None,
                            is_active=r["is_active"].lower() in ("t", "true", "1")))
        db.flush()
        for r in _rows("transacions_BIS.csv"):
            db.add(Transaction(
                transaction_id=int(r["transaction_id"]), user_id=int(r["user_id"]),
                category_id=int(r["category_id"]), amount=Decimal(r["amount"]),
                transaction_date=date.fromisoformat(r["transaction_date"]), note=r["note"] or None))
        for r in _rows("budgets_BIS.csv"):
            db.add(Budget(budget_id=int(r["budget_id"]), category_id=int(r["category_id"]),
                          month_start=date.fromisoformat(r["month_start"]),
                          monthly_limit=Decimal(r["monthly_limit"])))
        db.flush()

    with_creds = {c.user_id for c in db.query(Credential.user_id)}
    for u in db.query(User):
        if u.user_id not in with_creds:
            db.add(Credential(user_id=u.user_id, password_hash=hash_password(DEMO_PASSWORD)))
    db.commit()
