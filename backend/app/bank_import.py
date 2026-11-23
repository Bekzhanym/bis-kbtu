"""Kaspi Gold statement (PDF) -> list of expenses for preview.

A Kaspi statement row looks like:
    02.11.25   - 2 500,00 ₸   Покупка   MAGNUM CASH&CARRY
    01.11.25   + 50 000,00 ₸  Пополнение  С Kaspi Депозита
Only outgoing rows ("-") are expenses. Nothing is saved here: the user checks the preview first.
"""
import io
import re
from dataclasses import dataclass
from datetime import date, datetime
from decimal import Decimal

ROW = re.compile(
    r"(?P<date>\d{2}\.\d{2}\.\d{2,4})\s+(?P<sign>[+\-−])\s*(?P<amount>\d[\d\s  ]*,\d{2})\s*₸\s+"
    r"(?P<op>[А-Яа-яЁё]+)\s*(?P<details>.*)"
)
# operations that are spending; transfers and cash are often not, so they start unticked
SPENDING = {"покупка", "платеж", "платёж", "оплата"}
MAYBE = {"перевод", "снятие", "разное"}

# keyword -> category name used in this app; matched against the merchant text
KEYWORDS: list[tuple[re.Pattern, str]] = [
    (re.compile(r"magnum|small|galmart|anvar|ramstore|toimart|продукт|market|маркет|cafe|кафе|coffee|kfc|"
                r"burger|pizza|пицц|wolt|glovo|chocofood|restaurant|ресторан|бургер|dodo", re.I), "Food"),
    (re.compile(r"yandex\.?go|yandex taxi|такси|taxi|uber|indriver|onay|азс|qazaq ?oil|helios|sinooil|"
                r"gazprom|kmg|fuel|бензин|парковк|parking|avtobys|автобус", re.I), "Transport"),
    (re.compile(r"kino|кино|chaplin|kinopark|cinema|steam|playstation|netflix|spotify|ivi|okko|"
                r"боулинг|bowling|театр|concert|концерт|ticketon|kassir", re.I), "Entertainment"),
]


@dataclass
class Row:
    date: date
    amount: Decimal
    operation: str
    details: str
    category_name: str | None
    selected: bool


def extract_text(pdf: bytes) -> str:
    from pypdf import PdfReader  # imported lazily: only this feature needs it
    reader = PdfReader(io.BytesIO(pdf))
    return "\n".join(page.extract_text() or "" for page in reader.pages)


def _date(s: str) -> date:
    return datetime.strptime(s, "%d.%m.%y" if len(s) == 8 else "%d.%m.%Y").date()


def guess_category(details: str) -> str | None:
    return next((name for pattern, name in KEYWORDS if pattern.search(details)), None)


def parse_statement(text: str) -> list[Row]:
    rows = []
    for line in text.splitlines():
        m = ROW.search(line.strip())
        if not m or m["sign"] == "+":
            continue
        op = m["op"].lower()
        if op not in SPENDING | MAYBE:
            continue
        amount = Decimal(re.sub(r"[\s  ]", "", m["amount"]).replace(",", "."))
        details = " ".join(m["details"].split())[:200]
        rows.append(Row(date=_date(m["date"]), amount=amount, operation=m["op"], details=details,
                        category_name=guess_category(details), selected=op in SPENDING))
    return rows
