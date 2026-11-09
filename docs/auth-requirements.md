# Авторизация: 10 требований

Ответственный: 24B032028 (Almas861444). Код: `backend/app/core/security.py`, `backend/app/routers/auth.py`,
`backend/app/deps.py`, на клиенте `frontend/src/api/client.ts`.

| № | Требование | Как выполнено | Проверка |
|---|---|---|---|
| 1 | Пароли не хранятся в открытом виде | PBKDF2-SHA256, 200 000 итераций, соль 16 байт, отдельная таблица `credentials` | `test_register_login_and_profile` |
| 2 | Access-токен живёт недолго | JWT, 15 минут (`ACCESS_TOKEN_MINUTES`) | `test_expired_access_token_is_rejected` |
| 3 | Есть refresh-токен для продления сессии | JWT, 7 дней (`REFRESH_TOKEN_DAYS`), `POST /api/auth/refresh` | `test_refresh_gives_new_working_tokens` |
| 4 | Типы токенов не взаимозаменяемы | Поле `type` (`access` / `refresh`) проверяется при разборе | `test_token_types_are_not_interchangeable` |
| 5 | Refresh-токен ротируется | Каждый `/refresh` выдаёт новую пару токенов | `test_refresh_gives_new_working_tokens` |
| 6 | Смена пароля завершает другие сессии | В refresh-токене отпечаток хэша пароля; после смены старые токены дают 401 | `test_password_change_revokes_old_refresh_tokens` |
| 7 | Защищённые эндпоинты требуют токен | `get_current_user` отвечает 401 без токена | `test_requires_auth` |
| 8 | Роли проверяются на сервере | `require_admin` для категорий, лимитов, ролей | тесты прав в `test_api.py` |
| 9 | `user_id` берётся из токена, а не из запроса | `TransactionIn` с `extra="forbid"`, без `user_id` | тесты транзакций |
| 10 | Клиент продлевает сессию незаметно | При 401 `client.ts` один раз вызывает `/refresh` и повторяет запрос; параллельные запросы ждут один и тот же refresh | вручную: `ACCESS_TOKEN_MINUTES=1`, подождать минуту, открыть страницу |

Ограничение: refresh-токен хранится в `localStorage`. Для продакшена надёжнее httpOnly cookie.
