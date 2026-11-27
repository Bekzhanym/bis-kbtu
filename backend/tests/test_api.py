from .conftest import login

TX = {"category_id": 1, "amount": "1500.50", "transaction_date": "2026-10-21", "note": "Lunch"}


# ---------- auth ----------
def test_requires_auth(client):
    assert client.get("/api/transactions").status_code == 401
    assert client.get("/api/reports/monthly?month=2026-10-01").status_code == 401


def test_register_login_and_profile(client):
    r = client.post("/api/auth/register",
                    json={"full_name": "  New Member ", "email": " New@Mail.com ", "password": "secret123"})
    assert r.status_code == 201, r.text
    assert r.json()["user"] == {**r.json()["user"], "email": "new@mail.com", "full_name": "New Member",
                                "role": "member"}
    h = login(client, "new@mail.com", "secret123")
    assert client.patch("/api/auth/me", json={"full_name": "Renamed"}, headers=h).json()["full_name"] == "Renamed"
    r = client.post("/api/auth/change-password", json={"current_password": "wrong", "new_password": "xxxxxxxx1"},
                    headers=h)
    assert r.status_code == 400
    r = client.post("/api/auth/change-password", json={"current_password": "secret123", "new_password": "newpass123"},
                    headers=h)
    assert r.status_code == 200 and r.json()["refresh_token"]
    login(client, "new@mail.com", "newpass123")


def test_register_rejects_bad_input(client):
    bad = [
        {"full_name": "", "email": "a@b.com", "password": "secret123"},
        {"full_name": "A", "email": "not-an-email", "password": "secret123"},
        {"full_name": "A", "email": "a@b.com", "password": "short"},
        {"full_name": "A", "email": "a@b.com", "password": "aaaaaaaa"},   # no digits
        {"full_name": "A", "email": "a@b.com", "password": "12345678"},   # no letters
    ]
    for body in bad:
        assert client.post("/api/auth/register", json=body).status_code == 422
    dup = {"full_name": "A", "email": "DANA.M@example.com", "password": "secret123"}
    assert client.post("/api/auth/register", json=dup).status_code == 409


def test_wrong_password(client):
    r = client.post("/api/auth/login", json={"email": "dana.m@example.com", "password": "nope"})
    assert r.status_code == 401


# ---------- main action: add expense ----------
def test_add_expense_uses_token_user(client, member):
    r = client.post("/api/transactions", json=TX, headers=member)
    assert r.status_code == 201, r.text
    assert r.json()["user_id"] == 2 and r.json()["is_mine"]
    # client cannot pick a different user_id
    assert client.post("/api/transactions", json={**TX, "user_id": 1}, headers=member).status_code == 422


def test_amount_validation(client, member):
    for amount in ["-500", "0", "10.123", None, "abc"]:
        r = client.post("/api/transactions", json={**TX, "amount": amount}, headers=member)
        assert r.status_code == 422, amount
    assert client.post("/api/transactions", json={**TX, "amount": "0.01"}, headers=member).status_code == 201
    assert client.post("/api/transactions", json={**TX, "transaction_date": None}, headers=member).status_code == 422
    assert client.post("/api/transactions", json={**TX, "category_id": 999}, headers=member).status_code == 400


def test_split_is_atomic(client, member):
    before = len(client.get("/api/transactions", headers=member).json())
    bad = {"items": [{**TX, "amount": "6000"}, {**TX, "category_id": 999, "amount": "1000"}]}
    assert client.post("/api/transactions/split", json=bad, headers=member).status_code == 400
    assert len(client.get("/api/transactions", headers=member).json()) == before  # rolled back
    ok = {"items": [{**TX, "amount": "6000"}, {**TX, "category_id": 2, "amount": "1000"}]}
    assert client.post("/api/transactions/split", json=ok, headers=member).status_code == 201
    assert len(client.get("/api/transactions", headers=member).json()) == before + 2


def test_only_own_expenses_editable(client, member):
    # 101 belongs to Alex (user 1)
    assert client.patch("/api/transactions/101", json={"amount": "1"}, headers=member).status_code == 403
    assert client.delete("/api/transactions/101", headers=member).status_code == 403
    tid = client.post("/api/transactions", json=TX, headers=member).json()["transaction_id"]
    r = client.patch(f"/api/transactions/{tid}", json={"amount": "99.99"}, headers=member)
    assert r.json()["amount"] == "99.99"
    assert client.delete(f"/api/transactions/{tid}", headers=member).status_code == 204


# ---------- limited visibility ----------
def test_member_sees_only_own(client, member, admin):
    mine = client.get("/api/transactions", headers=member).json()
    assert {t["user_id"] for t in mine} == {2}
    assert client.get("/api/transactions?scope=all", headers=member).status_code == 403
    assert client.get("/api/users", headers=member).status_code == 403
    # admin sees all, but not other people's notes
    rows = client.get("/api/transactions?scope=all", headers=admin).json()
    assert {t["user_id"] for t in rows} == {1, 2}
    assert all(t["note"] is None for t in rows if t["user_id"] != 1)


def test_filter_greater_than_10000(client, admin):
    rows = client.get("/api/transactions?scope=all&min_amount=10000", headers=admin).json()
    assert sorted(t["transaction_id"] for t in rows) == [101, 102, 103]


# ---------- admin: categories, budgets, roles ----------
def test_admin_only_management(client, member, admin):
    assert client.post("/api/categories", json={"category_name": "Health"}, headers=member).status_code == 403
    r = client.post("/api/categories", json={"category_name": " Health "}, headers=admin)
    assert r.status_code == 201 and r.json()["category_name"] == "Health"
    assert client.post("/api/categories", json={"category_name": "health"}, headers=admin).status_code == 409

    b = {"category_id": 1, "month_start": "2026-10-01", "monthly_limit": "5"}
    assert client.post("/api/budgets", json=b, headers=admin).status_code == 409  # duplicate month
    assert client.post("/api/budgets", json={**b, "month_start": "2026-11-15"}, headers=admin).status_code == 422
    assert client.post("/api/budgets", json={**b, "month_start": "2026-11-01"}, headers=admin).status_code == 201

    assert client.patch("/api/users/2/role", json={"role": "admin"}, headers=member).status_code == 403
    assert client.patch("/api/users/2/role", json={"role": "admin"}, headers=admin).json()["role"] == "admin"


def test_inactive_category_blocks_new_expenses(client, admin, member):
    client.patch("/api/categories/3", json={"is_active": False}, headers=admin)
    assert client.post("/api/transactions", json={**TX, "category_id": 3}, headers=member).status_code == 400


# ---------- monthly report ----------
def test_monthly_report(client, member):
    r = client.get("/api/reports/monthly?month=2026-10-15", headers=member).json()
    food = next(c for c in r["categories"] if c["category_name"] == "Food")
    assert food["spent"] == "110000.00" and food["over_limit"] is True and food["remaining"] == "-10000.00"
    assert r["total_spent"] == "128000.00" and r["my_spent"] == "45000.00"
    assert "email" not in str(r) and "note" not in str(r)


# ---------- month comparison (24B032010) ----------
def test_compare_with_previous_month(client, member):
    sept = {**TX, "amount": "50000.00", "transaction_date": "2026-09-12"}
    assert client.post("/api/transactions", json=sept, headers=member).status_code == 201
    r = client.get("/api/reports/compare?month=2026-10-01", headers=member).json()
    assert r["prev_month_start"] == "2026-09-01"
    assert r["total_spent"] == "128000.00" and r["prev_total_spent"] == "50000.00"
    assert r["diff"] == "78000.00" and r["diff_pct"] == 156.0
    food = next(c for c in r["categories"] if c["category_name"] == "Food")
    assert food["spent"] == "110000.00" and food["prev_spent"] == "50000.00" and food["diff_pct"] == 120.0
    other = [c for c in r["categories"] if c["category_name"] != "Food"]
    assert all(c["prev_spent"] == "0" or c["diff_pct"] is None for c in other)
    assert "email" not in str(r) and "note" not in str(r) and "full_name" not in str(r)


def test_compare_with_explicit_month_and_auth(client, member):
    assert client.get("/api/reports/compare?month=2026-10-01").status_code == 401
    r = client.get("/api/reports/compare?month=2026-10-01&with=2025-01-01", headers=member).json()
    assert r["prev_month_start"] == "2025-01-01" and r["diff_pct"] is None


# ---------- access / refresh tokens (24B032028) ----------
def _tokens(client, email="dana.m@example.com", password="demo12345"):
    return client.post("/api/auth/login", json={"email": email, "password": password}).json()


def test_refresh_gives_new_working_tokens(client):
    t = _tokens(client)
    r = client.post("/api/auth/refresh", json={"refresh_token": t["refresh_token"]})
    assert r.status_code == 200
    new = r.json()
    assert client.get("/api/auth/me", headers={"Authorization": f"Bearer {new['access_token']}"}).status_code == 200


def test_token_types_are_not_interchangeable(client):
    t = _tokens(client)
    # refresh token cannot call the API, access token cannot refresh
    assert client.get("/api/auth/me", headers={"Authorization": f"Bearer {t['refresh_token']}"}).status_code == 401
    assert client.post("/api/auth/refresh", json={"refresh_token": t["access_token"]}).status_code == 401
    assert client.post("/api/auth/refresh", json={"refresh_token": "garbage"}).status_code == 401


def test_password_change_revokes_old_refresh_tokens(client):
    old = _tokens(client)
    h = {"Authorization": f"Bearer {old['access_token']}"}
    r = client.post("/api/auth/change-password",
                    json={"current_password": "demo12345", "new_password": "newpass123"}, headers=h)
    assert r.status_code == 200
    assert client.post("/api/auth/refresh", json={"refresh_token": old["refresh_token"]}).status_code == 401
    assert client.post("/api/auth/refresh", json={"refresh_token": r.json()["refresh_token"]}).status_code == 200


def test_expired_access_token_is_rejected(client):
    from datetime import timedelta

    from app.core.security import _encode
    expired = _encode(2, "access", timedelta(seconds=-5))
    assert client.get("/api/auth/me", headers={"Authorization": f"Bearer {expired}"}).status_code == 401


# ---------- database indexes (24B031914) ----------
def test_indexes_exist_and_are_used(client):
    from sqlalchemy import inspect, text

    from app.database import engine
    names = {i["name"] for i in inspect(engine).get_indexes("transactions")}
    assert {"ix_transactions_user_date", "ix_transactions_date_category", "ix_transactions_category"} <= names
    assert "ix_budgets_month" in {i["name"] for i in inspect(engine).get_indexes("budgets")}
    with engine.connect() as conn:
        plan = " ".join(str(r) for r in conn.execute(text(
            "EXPLAIN QUERY PLAN SELECT * FROM transactions "
            "WHERE user_id = 2 AND transaction_date >= '2026-10-01' AND transaction_date < '2026-11-01'")))
    assert "ix_transactions_user_date" in plan


# ---------- filters (24B031677) ----------
def test_amount_range_filter(client, admin):
    r = client.get("/api/transactions?scope=all&min_amount=10000&max_amount=50000", headers=admin).json()
    assert r and all(10000 < float(t["amount"]) <= 50000 for t in r)



def test_password_with_kazakh_letters_is_accepted(client):
    body = {"full_name": "A", "email": "kz@b.com", "password": "әңүөқғ12"}
    assert client.post("/api/auth/register", json=body).status_code == 201


# ---------- error prevention (24B031677) ----------
def test_future_expense_date_is_rejected(client, member):
    from datetime import date, timedelta
    future = (date.today() + timedelta(days=5)).isoformat()
    assert client.post("/api/transactions", json={**TX, "transaction_date": future}, headers=member).status_code == 422
    r = client.post("/api/transactions", json=TX, headers=member).json()
    assert client.patch(f"/api/transactions/{r['transaction_id']}", json={"transaction_date": future},
                        headers=member).status_code == 422


# ---------- Telegram bot, notifications, uniqueness (24B032028) ----------
import pytest  # noqa: E402

SECRET = {"X-Telegram-Bot-Api-Secret-Token": "hook-secret"}


@pytest.fixture()
def tg(monkeypatch):
    """Bot switched on, messages captured instead of sent."""
    from app import telegram
    from app.routers import telegram as router
    sent = []
    monkeypatch.setattr(router, "TELEGRAM_BOT_TOKEN", "test-token")
    monkeypatch.setattr(router, "TELEGRAM_BOT_USERNAME", "family_budget_bot")
    monkeypatch.setattr(router, "TELEGRAM_WEBHOOK_SECRET", "hook-secret")
    monkeypatch.setattr(telegram, "send_message", lambda chat_id, text: sent.append((chat_id, text)) or True)
    return sent


def _say(client, chat_id, text):
    return client.post("/api/telegram/webhook", headers=SECRET,
                       json={"update_id": 1, "message": {"chat": {"id": chat_id}, "text": text}})


def _connect(client, headers, chat_id):
    link = client.post("/api/telegram/link", headers=headers).json()
    assert link["url"] == f"https://t.me/family_budget_bot?start={link['code']}"
    assert _say(client, chat_id, f"/start {link['code']}").status_code == 200
    return link["code"]


def test_telegram_link_flow(client, member, tg):
    assert client.get("/api/telegram/status", headers=member).json()["linked"] is False
    code = _connect(client, member, 555)
    assert "Готово" in tg[-1][1] and tg[-1][0] == 555
    assert client.get("/api/telegram/status", headers=member).json()["linked"] is True
    _say(client, 555, f"/start {code}")  # code is one-time
    assert "устарел" in tg[-1][1]
    _say(client, 555, "/stop")
    assert client.get("/api/telegram/status", headers=member).json()["linked"] is False


def test_telegram_chat_is_unique_per_account(client, member, admin, tg):
    _connect(client, member, 777)
    _connect(client, admin, 777)  # same chat, another account
    assert "уже привязан к другому аккаунту" in tg[-1][1]
    assert client.get("/api/telegram/status", headers=admin).json()["linked"] is False


def test_telegram_webhook_requires_secret(client, tg):
    r = client.post("/api/telegram/webhook", json={"message": {"chat": {"id": 1}, "text": "/stop"}})
    assert r.status_code == 403


def test_limit_notification_goes_to_author_and_admins(client, member, admin, tg):
    _connect(client, member, 1001)
    _connect(client, admin, 2002)
    tg.clear()
    # Transport limit for Oct 2026 is 40 000; push it over
    tx = {"category_id": 2, "amount": "45000.00", "transaction_date": "2026-10-25"}
    assert client.post("/api/transactions", json=tx, headers=member).status_code == 201
    chats = sorted(chat for chat, _ in tg)
    assert chats == [1001, 2002]
    assert "Лимит «Transport»" in tg[0][1] and "превышен" in tg[0][1]
    tg.clear()
    client.post("/api/transactions", json={**tx, "amount": "100.00"}, headers=member)
    assert tg == []  # already over the limit: no repeated alerts


def test_threshold_crossed():
    from decimal import Decimal as D

    from app.telegram import threshold_crossed
    assert threshold_crossed(D(90), D(110), D(100)) == 100
    assert threshold_crossed(D(70), D(85), D(100)) == 80
    assert threshold_crossed(D(85), D(90), D(100)) is None
    assert threshold_crossed(D(110), D(120), D(100)) is None


def test_send_example_notifications(client, member, tg):
    assert client.post("/api/telegram/test", headers=member).status_code == 400  # not linked yet
    _connect(client, member, 4242)
    tg.clear()
    r = client.post("/api/telegram/test", headers=member)
    assert r.status_code == 200 and r.json()["sent"] == len(tg) == 8
    assert all(chat == 4242 and text.startswith("[пример]") for chat, text in tg)
    assert any("превышен" in t for _, t in tg) and any("🔔" in t for _, t in tg)


# ---------- recurring expenses (24B032166) ----------
def test_recurring_expense_is_created_once_a_month(client, member):
    from datetime import date

    from app.database import SessionLocal
    from app.recurring import run_due
    body = {"category_id": 3, "amount": "2990.00", "day_of_month": 28, "note": "Netflix"}
    r = client.post("/api/recurring", json=body, headers=member)
    assert r.status_code == 201 and r.json()["category_name"] == "Entertainment"
    with SessionLocal() as db:
        assert run_due(db, date(2030, 3, 27)) == 0  # day not reached yet
        assert run_due(db, date(2030, 3, 28)) == 1
        assert run_due(db, date(2030, 3, 31)) == 0  # already done this month
        assert run_due(db, date(2030, 4, 28)) == 1  # next month again
    rows = client.get("/api/transactions?month=2030-03-01", headers=member).json()
    assert [(t["amount"], t["transaction_date"], t["note"]) for t in rows] == [("2990.00", "2030-03-28", "Netflix")]


def test_recurring_validation_and_privacy(client, member, admin):
    bad = [{"category_id": 1, "amount": "0", "day_of_month": 5},
           {"category_id": 1, "amount": "100", "day_of_month": 31},
           {"category_id": 1, "amount": "100", "day_of_month": 5, "user_id": 1}]
    for b in bad:
        assert client.post("/api/recurring", json=b, headers=member).status_code == 422
    rid = client.post("/api/recurring", json={"category_id": 1, "amount": "100", "day_of_month": 28},
                      headers=member).json()["recurring_id"]
    assert client.get("/api/recurring", headers=admin).json() == []
    assert client.patch(f"/api/recurring/{rid}", json={"amount": "5"}, headers=admin).status_code == 404
    assert client.delete(f"/api/recurring/{rid}", headers=admin).status_code == 404
    r = client.patch(f"/api/recurring/{rid}", json={"is_active": False}, headers=member)
    assert r.json()["is_active"] is False
    assert client.delete(f"/api/recurring/{rid}", headers=member).status_code == 204


# ---------- Telegram reports: /week /month /year /limits (24B032028) ----------
def test_period_ranges():
    from datetime import date

    from app.bot_reports import period_range
    wed = date(2026, 11, 25)
    assert period_range("week", wed) == (date(2026, 11, 23), date(2026, 11, 26), date(2026, 11, 16), date(2026, 11, 23))
    assert period_range("month", wed)[0::2] == (date(2026, 11, 1), date(2026, 10, 1))
    assert period_range("year", wed)[0::2] == (date(2026, 1, 1), date(2025, 1, 1))


def test_month_and_limits_reports_text(client):
    from datetime import date

    from app import models
    from app.bot_reports import limits_report, period_report
    from app.database import SessionLocal
    with SessionLocal() as db:
        dana = db.query(models.User).filter_by(email="dana.m@example.com").one()
        text = period_report(db, dana, "month", date(2026, 10, 31))
        limits = limits_report(db, date(2026, 10, 15))
        empty = period_report(db, dana, "week", date(2030, 1, 1))
    assert "Семья потратила: 128 000 ₸" in text and "Ваши расходы: 45 000 ₸" in text and "• Food: 110 000 ₸" in text
    assert "@" not in text  # no emails
    assert "🔴 Food: 110 000 ₸ из 100 000 ₸ (110%), превышен на 10 000 ₸" in limits
    assert "Расходов за этот период нет" in empty


def test_report_commands_need_a_linked_chat(client, member, tg):
    _say(client, 9090, "/month")
    assert "ещё не привязан" in tg[-1][1]
    _connect(client, member, 9090)
    for cmd in ("/week", "/month@budgetKBTUbot", "/year", "/limits", "/help"):
        _say(client, 9090, cmd)
        assert tg[-1][0] == 9090
    texts = [t for _, t in tg[-5:]]
    assert texts[0].startswith("📊 Отчёт за неделю") and texts[1].startswith("📊 Отчёт за месяц")
    assert texts[2].startswith("📊 Отчёт за год") and texts[3].startswith("🎯 Лимиты") and "/limits" in texts[4]


# ---------- Kaspi statement import (24B031677) ----------
KASPI_TEXT = """Выписка по Kaspi Gold за период с 01.10.26 по 31.10.26
Дата Сумма Операция Детали
01.10.26 + 250 000,00 ₸ Пополнение С Kaspi Депозита
03.10.26 - 65 000,00 ₸ Покупка MAGNUM CASH&CARRY
05.10.26 - 2 300,00 ₸ Покупка Yandex.Go
07.10.26 - 4 500,00 ₸ Покупка Kinopark 7 IMAX
09.10.26 - 10 000,00 ₸ Перевод Айгерим Б.
12.10.26 - 1 990,50 ₸ Покупка ИП Цветы
"""


def test_parse_kaspi_statement():
    from datetime import date
    from decimal import Decimal

    from app.bank_import import parse_statement
    rows = parse_statement(KASPI_TEXT)
    assert [(r.date, r.amount, r.category_name, r.selected) for r in rows] == [
        (date(2026, 10, 3), Decimal("65000.00"), "Food", True),
        (date(2026, 10, 5), Decimal("2300.00"), "Transport", True),
        (date(2026, 10, 7), Decimal("4500.00"), "Entertainment", True),
        (date(2026, 10, 9), Decimal("10000.00"), None, False),  # transfer: unticked by default
        (date(2026, 10, 12), Decimal("1990.50"), None, True),
    ]


def test_kaspi_import_preview_and_confirm(client, member, monkeypatch):
    from app.routers import bank_import
    monkeypatch.setattr(bank_import, "extract_text", lambda pdf: KASPI_TEXT)
    pdf = {"headers": {**member, "Content-Type": "application/pdf"}}
    assert client.post("/api/import/kaspi", content=b"hello", **pdf).status_code == 400
    r = client.post("/api/import/kaspi", content=b"%PDF-1.4 fake", **pdf)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["skipped_income"] == 1 and len(data["rows"]) == 5
    # Dana already has 45 000 on 10.10 in the seed data, not 65 000 on 03.10: no duplicate there
    first = data["rows"][0]
    assert first["category_id"] == 1 and first["duplicate"] is False
    items = [{"category_id": row["category_id"] or 1, "amount": row["amount"],
              "transaction_date": row["transaction_date"], "note": row["details"]}
             for row in data["rows"] if row["selected"]]
    saved = client.post("/api/import/confirm", json={"items": items}, headers=member)
    assert saved.status_code == 201 and len(saved.json()) == 4
    # importing the same statement again: everything is marked as a duplicate and unticked
    again = client.post("/api/import/kaspi", content=b"%PDF-1.4 fake", **pdf).json()["rows"]
    assert all(row["duplicate"] and not row["selected"] for row in again if row["operation"] == "Покупка")


def test_kaspi_import_needs_auth_and_limits_size(client, member):
    assert client.post("/api/import/kaspi", content=b"%PDF").status_code == 401
    big = b"%PDF" + b"0" * (5 * 1024 * 1024)
    r = client.post("/api/import/kaspi", content=big, headers={**member, "Content-Type": "application/pdf"})
    assert r.status_code == 413


# ---------- AI assistant (24B032010) ----------
@pytest.fixture()
def ai(monkeypatch):
    """Gemini call captured instead of sent."""
    from app import assistant
    calls = []

    def fake(system, question):
        calls.append((system, question))
        return "Перерасход по Food: 10 000 ₸."
    monkeypatch.setattr(assistant, "call_gemini", fake)
    assistant._recent.clear()
    return calls


def test_assistant_answers_with_family_context(client, member, ai):
    client.post("/api/transactions", json={**TX, "note": "секретная заметка"}, headers=member)
    r = client.post("/api/assistant", json={"question": "Где я перерасходую?"}, headers=member)
    assert r.status_code == 200 and r.json()["answer"].startswith("Перерасход")
    system, question = ai[0]
    assert question == "Где я перерасходую?"
    assert "Food" in system and "лимит" in system
    # privacy: no emails and no notes (own or others') in what goes to the model
    assert "@" not in system and "секретная" not in system and "Supermarket" not in system


def test_assistant_validation_and_rate_limit(client, member, ai):
    assert client.post("/api/assistant", json={"question": "x"}, headers=member).status_code == 422
    assert client.post("/api/assistant", json={"question": "a" * 501}, headers=member).status_code == 422
    assert client.post("/api/assistant", json={"question": "ok?"}).status_code == 401
    codes = [client.post("/api/assistant", json={"question": "Сколько осталось?"}, headers=member).status_code
             for _ in range(21)]
    assert codes[:20] == [200] * 20 and codes[20] == 429


def test_assistant_without_key_is_off(client, member, monkeypatch):
    from app import assistant
    from app.core import config
    monkeypatch.setattr(config, "GEMINI_API_KEY", "")
    assistant._recent.clear()
    assert client.get("/api/assistant/status", headers=member).json() == {"enabled": False}
    r = client.post("/api/assistant", json={"question": "Сколько осталось?"}, headers=member)
    assert r.status_code == 503


def test_call_gemini_request_shape_and_empty_response(monkeypatch):
    import json
    from io import BytesIO
    from app import assistant
    from app.core import config

    sent = {}
    reply = {"candidates": [{"content": {"parts": [{"text": " Ответ "}]}}]}

    def fake_urlopen(request, timeout):
        sent["url"] = request.full_url
        sent["key"] = request.get_header("X-goog-api-key")
        sent["body"] = json.loads(request.data)
        sent["timeout"] = timeout
        return BytesIO(json.dumps(reply).encode())

    monkeypatch.setattr(config, "GEMINI_API_KEY", "test-key")
    monkeypatch.setattr(assistant, "urlopen", fake_urlopen)
    assert assistant.call_gemini("SYS", "Q") == "Ответ"
    assert sent["url"].endswith("/models/gemini-3.5-flash:generateContent")
    assert sent["key"] == "test-key" and sent["timeout"] == 60
    assert sent["body"]["systemInstruction"]["parts"][0]["text"] == "SYS"
    assert sent["body"]["contents"][0]["parts"][0]["text"] == "Q"
    reply.clear()
    assert "Не получилось" in assistant.call_gemini("SYS", "Q")
