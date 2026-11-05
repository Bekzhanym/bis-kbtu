# Family Budget Tracker (BIS, KBTU, Task 9)

Семейный учёт расходов: регистрация и вход, добавление расходов, месячные лимиты по категориям и отчёт.

| Часть | Технологии |
|---|---|
| backend | FastAPI, SQLAlchemy, SQLite (или PostgreSQL через `DATABASE_URL`), JWT |
| frontend | React, TypeScript, Vite, React Router |

## Запуск для разработки (два терминала)

```bash
# 1) backend: запускать первым
cd backend
uv venv .venv && uv pip install -p .venv -r requirements-dev.txt   # один раз
.venv/bin/uvicorn app.main:app --reload --port 8000                 # http://localhost:8000/docs

# 2) frontend
cd frontend
npm install        # один раз
npm run dev        # http://localhost:5173
```

При первом запуске база создаётся из `backend/data/*.csv`. Демо-пароль у всех пользователей из CSV: **`demo12345`**.
- `alex.sebelev@example.com`: админ
- `dana.m@example.com`: участник

Чтобы пересоздать базу, остановите backend и удалите `backend/budget.db`.

## Тесты
```bash
cd backend && .venv/bin/python -m pytest -q   # API: авторизация, права, валидация, ROLLBACK, отчёт
cd frontend && npm test                       # валидация форм на клиенте
```

## Деплой (Docker)
```bash
SECRET_KEY=$(openssl rand -hex 32) docker compose up --build -d   # http://localhost:8080
```

## Права доступа
| Действие | Участник | Админ |
|---|---|---|
| Свои расходы: добавить, изменить, удалить | да | да |
| Чужие расходы | нет | видит, но без заметок |
| Месячный отчёт (общие итоги, без email и заметок) | да | да |
| Категории, лимиты, роли, список пользователей с email | нет | да |

`user_id` расхода берётся из токена, а не из запроса клиента. Пароли хранятся отдельно, в таблице `credentials` (PBKDF2-хэш), а не в четырёх основных таблицах.

## API (кратко)
- `POST /api/auth/register`, `POST /api/auth/login`, `GET/PATCH /api/auth/me`, `POST /api/auth/change-password`
- `GET/POST /api/transactions`, `POST /api/transactions/split` (атомарно), `PATCH/DELETE /api/transactions/{id}`
- `GET /api/reports/monthly?month=2026-10-01`
- `GET/POST/PATCH /api/categories` (изменение: только админ), `GET/POST/PATCH/DELETE /api/budgets` (админ), `GET /api/users`, `PATCH /api/users/{id}/role` (админ)
