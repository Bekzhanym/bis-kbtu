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
cd frontend && npm test                       # валидация форм и фильтры на клиенте
```
Тесты запускаются в GitHub Actions на каждый push (`.github/workflows/tests.yml`).
Отчёт о тестировании: [docs/test-reports.md](docs/test-reports.md). Требования к авторизации: [docs/auth-requirements.md](docs/auth-requirements.md).

## Деплой (Docker)
```bash
SECRET_KEY=$(openssl rand -hex 32) docker compose up --build -d   # http://localhost:8080
```
Frontend запускается после того, как backend прошёл healthcheck (`/api/health`).
Время жизни токенов: `ACCESS_TOKEN_MINUTES` (15) и `REFRESH_TOKEN_DAYS` (7).
Индексы БД (`ix_transactions_user_date`, `ix_transactions_date_category`, `ix_transactions_category`, `ix_budgets_month`) создаются при старте, в том числе в старой базе.

## Права доступа
| Действие | Участник | Админ |
|---|---|---|
| Свои расходы: добавить, изменить, удалить | да | да |
| Чужие расходы | нет | видит, но без заметок |
| Месячный отчёт (общие итоги, без email и заметок) | да | да |
| Категории, лимиты, роли, список пользователей с email | нет | да |

`user_id` расхода берётся из токена, а не из запроса клиента. Пароли хранятся отдельно, в таблице `credentials` (PBKDF2-хэш), а не в четырёх основных таблицах.

## API (кратко)
- `POST /api/auth/register`, `POST /api/auth/login` → access (15 мин) + refresh (7 дней) токены
- `POST /api/auth/refresh`, `GET/PATCH /api/auth/me`, `POST /api/auth/change-password` (старые refresh-токены перестают работать)
- `GET/POST /api/transactions`, `POST /api/transactions/split` (атомарно), `PATCH/DELETE /api/transactions/{id}`
- `GET /api/transactions?min_amount=&max_amount=&category_id=&month=`: фильтры
- `GET /api/reports/monthly?month=2026-10-01`, `GET /api/reports/compare?month=2026-10-01[&with=2026-09-01]`: сравнение с прошлым месяцем
- `GET/POST/PATCH /api/categories` (изменение: только админ), `GET/POST/PATCH/DELETE /api/budgets` (админ), `GET /api/users`, `PATCH /api/users/{id}/role` (админ)

## Команда
| ID | GitHub | Основная задача | Доп. задача |
|---|---|---|---|
| 24B031914 | bekzhanym | БД, запросы frontend → backend, деплой | сервер (healthcheck), индексы БД |
| 24B032028 | Almas861444 | Backend: эндпоинты, авторизация | access и refresh токены, [10 требований](docs/auth-requirements.md) |
| 24B031677 | deeeemka | GitHub, frontend: главная, регистрация, вход, расходы | фильтры (сумма от/до, поиск, сортировка), дашборд |
| 24B032010 | muenjmtst | БД: месячный отчёт, ограниченный доступ | сравнение с прошлым месяцем |
| 24B032166 | mukhamedzhannn | Тестирование frontend-валидации | CI, [10 тест-репортов](docs/test-reports.md) |
