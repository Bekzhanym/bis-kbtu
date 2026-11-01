from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import (
    Boolean, CheckConstraint, Date, DateTime, ForeignKey, Numeric, String, UniqueConstraint, func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base

FK = dict(ondelete="RESTRICT", onupdate="RESTRICT")


class User(Base):
    __tablename__ = "users"
    __table_args__ = (CheckConstraint("role IN ('admin', 'member')", name="ck_users_role"),)

    user_id: Mapped[int] = mapped_column(primary_key=True)
    full_name: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str] = mapped_column(String(254), nullable=False, unique=True)
    role: Mapped[str] = mapped_column(String(10), nullable=False, default="member")


class Credential(Base):
    """Separate auth component: passwords are NOT stored in the four business tables."""
    __tablename__ = "credentials"

    user_id: Mapped[int] = mapped_column(ForeignKey("users.user_id", **FK), primary_key=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=func.now())


class Category(Base):
    __tablename__ = "categories"

    category_id: Mapped[int] = mapped_column(primary_key=True)
    category_name: Mapped[str] = mapped_column(String(50), nullable=False, unique=True)
    description: Mapped[str | None] = mapped_column(String(200))
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)


class Transaction(Base):
    __tablename__ = "transactions"
    __table_args__ = (CheckConstraint("amount > 0", name="ck_transactions_amount"),)

    transaction_id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.user_id", **FK), nullable=False)
    category_id: Mapped[int] = mapped_column(ForeignKey("categories.category_id", **FK), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    transaction_date: Mapped[date] = mapped_column(Date, nullable=False)
    note: Mapped[str | None] = mapped_column(String(200))

    user: Mapped[User] = relationship(lazy="joined")
    category: Mapped[Category] = relationship(lazy="joined")


class Budget(Base):
    __tablename__ = "budgets"
    __table_args__ = (
        UniqueConstraint("category_id", "month_start", name="uq_budgets_category_month"),
        CheckConstraint("monthly_limit > 0", name="ck_budgets_limit"),
    )

    budget_id: Mapped[int] = mapped_column(primary_key=True)
    category_id: Mapped[int] = mapped_column(ForeignKey("categories.category_id", **FK), nullable=False)
    month_start: Mapped[date] = mapped_column(Date, nullable=False)
    monthly_limit: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)

    category: Mapped[Category] = relationship(lazy="joined")
