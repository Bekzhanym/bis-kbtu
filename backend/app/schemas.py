from datetime import date
from decimal import Decimal
from typing import Annotated, Literal

from pydantic import AfterValidator, BaseModel, ConfigDict, EmailStr, Field, StringConstraints

Name = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)]
Email = Annotated[EmailStr, AfterValidator(lambda v: v.strip().lower()), Field(max_length=254)]
def _letters_and_digits(v: str) -> str:
    # Same rule as the frontend: at least one letter (any alphabet) and one digit
    if not any(c.isalpha() for c in v) or not any(c.isdigit() for c in v):
        raise ValueError("Password must contain letters and digits")
    return v


Password = Annotated[str, Field(min_length=8, max_length=128), AfterValidator(_letters_and_digits)]
Money = Annotated[Decimal, Field(gt=0, max_digits=12, decimal_places=2)]
Note = Annotated[str | None, StringConstraints(strip_whitespace=True, max_length=200)]
Role = Literal["admin", "member"]


def _first_of_month(v: date) -> date:
    if v.day != 1:
        raise ValueError("month_start must be the first day of a month")
    return v


MonthStart = Annotated[date, AfterValidator(_first_of_month)]


class ORM(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# ---------- auth / profile ----------
class RegisterIn(BaseModel):
    full_name: Name
    email: Email
    password: Password


class LoginIn(BaseModel):
    email: Email
    password: str


class UserOut(ORM):
    user_id: int
    full_name: str
    email: str
    role: Role


class TokenOut(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserOut


class RefreshIn(BaseModel):
    refresh_token: str


class ProfileUpdate(BaseModel):
    full_name: Name | None = None
    email: Email | None = None


class PasswordChange(BaseModel):
    current_password: str
    new_password: Password


class RoleUpdate(BaseModel):
    role: Role


# ---------- categories ----------
class CategoryOut(ORM):
    category_id: int
    category_name: str
    description: str | None
    is_active: bool


class CategoryIn(BaseModel):
    category_name: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=50)]
    description: Note = None


class CategoryUpdate(BaseModel):
    category_name: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=50)] | None = None
    description: Note = None
    is_active: bool | None = None


# ---------- transactions ----------
class TransactionIn(BaseModel):
    # user_id is NOT accepted from the client: it comes from the auth token
    model_config = ConfigDict(extra="forbid")
    category_id: int
    amount: Money
    transaction_date: date
    note: Note = None


class TransactionUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    category_id: int | None = None
    amount: Money | None = None
    transaction_date: date | None = None
    note: Note = None


class SplitIn(BaseModel):
    items: list[TransactionIn] = Field(min_length=2, max_length=20)


class TransactionOut(BaseModel):
    transaction_id: int
    user_id: int
    user_full_name: str
    category_id: int
    category_name: str
    amount: Decimal
    transaction_date: date
    note: str | None
    is_mine: bool


# ---------- budgets ----------
class BudgetIn(BaseModel):
    category_id: int
    month_start: MonthStart
    monthly_limit: Money


class BudgetUpdate(BaseModel):
    monthly_limit: Money


class BudgetOut(BaseModel):
    budget_id: int
    category_id: int
    category_name: str
    month_start: date
    monthly_limit: Decimal


# ---------- reports ----------
class CategoryReport(BaseModel):
    category_id: int
    category_name: str
    monthly_limit: Decimal | None
    spent: Decimal
    remaining: Decimal | None
    over_limit: bool


class MemberReport(BaseModel):
    user_id: int
    full_name: str
    spent: Decimal


class MonthlyReport(BaseModel):
    month_start: date
    total_spent: Decimal
    total_limit: Decimal
    my_spent: Decimal
    categories: list[CategoryReport]
    members: list[MemberReport]


class CategoryCompare(BaseModel):
    category_id: int
    category_name: str
    spent: Decimal
    prev_spent: Decimal
    diff: Decimal
    diff_pct: float | None  # None when the previous month had 0


class MonthCompare(BaseModel):
    month_start: date
    prev_month_start: date
    total_spent: Decimal
    prev_total_spent: Decimal
    diff: Decimal
    diff_pct: float | None
    categories: list[CategoryCompare]
