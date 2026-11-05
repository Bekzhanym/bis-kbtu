// Client-side validation: immediate feedback. The server re-checks everything.
export type Errors = Record<string, string>

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const MAX_MONEY = 9_999_999_999.99

export const hasErrors = (e: Errors) => Object.keys(e).length > 0

function collect(entries: Record<string, string | undefined>): Errors {
  const out: Errors = {}
  for (const [k, v] of Object.entries(entries)) if (v) out[k] = v
  return out
}

export function validateName(v: string, max = 100): string | undefined {
  const s = v.trim()
  if (!s) return 'Обязательное поле'
  if (s.length > max) return `Не длиннее ${max} символов`
}

export function validateEmail(v: string): string | undefined {
  const s = v.trim()
  if (!s) return 'Введите email'
  if (s.length > 254) return 'Слишком длинный email'
  if (!EMAIL_RE.test(s)) return 'Некорректный email'
}

export function validatePassword(v: string): string | undefined {
  if (!v) return 'Введите пароль'
  if (v.length < 8) return 'Минимум 8 символов'
  if (v.length > 128) return 'Не длиннее 128 символов'
  if (!/[A-Za-zА-Яа-я]/.test(v) || !/\d/.test(v)) return 'Пароль должен содержать буквы и цифры'
}

/** Accepts "1500", "1500.5", "1 500,50". Returns the value the API expects. */
export function normalizeAmount(v: string): string {
  return v.replace(/\s/g, '').replace(',', '.')
}

export function validateAmount(v: string): string | undefined {
  const s = normalizeAmount(v)
  if (!s) return 'Введите сумму'
  if (!/^-?\d+(\.\d+)?$/.test(s)) return 'Сумма должна быть числом'
  const n = Number(s)
  if (n <= 0) return 'Сумма должна быть больше 0'
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return 'Не больше 2 знаков после запятой'
  if (n > MAX_MONEY) return 'Слишком большая сумма'
}

export function validateDate(v: string): string | undefined {
  if (!v) return 'Укажите дату'
  if (!DATE_RE.test(v) || Number.isNaN(new Date(v + 'T00:00:00').getTime())) return 'Некорректная дата'
}

export function validateNote(v: string, max = 200): string | undefined {
  if (v.trim().length > max) return `Не длиннее ${max} символов`
}

export function validateCategoryId(v: string | number): string | undefined {
  if (!v || Number(v) <= 0) return 'Выберите категорию'
}

export function validateLogin(f: { email: string; password: string }): Errors {
  return collect({ email: validateEmail(f.email), password: f.password ? undefined : 'Введите пароль' })
}

export function validateRegister(f: { full_name: string; email: string; password: string; confirm: string }): Errors {
  return collect({
    full_name: validateName(f.full_name),
    email: validateEmail(f.email),
    password: validatePassword(f.password),
    confirm: f.confirm === f.password ? undefined : 'Пароли не совпадают',
  })
}

export function validateTransaction(f: { category_id: string; amount: string; transaction_date: string; note: string }): Errors {
  return collect({
    category_id: validateCategoryId(f.category_id),
    amount: validateAmount(f.amount),
    transaction_date: validateDate(f.transaction_date),
    note: validateNote(f.note),
  })
}

export function validateBudget(f: { category_id: string; month: string; monthly_limit: string }): Errors {
  return collect({
    category_id: validateCategoryId(f.category_id),
    month: /^\d{4}-\d{2}$/.test(f.month) ? undefined : 'Выберите месяц',
    monthly_limit: validateAmount(f.monthly_limit),
  })
}

export function validateCategory(f: { category_name: string; description: string }): Errors {
  return collect({ category_name: validateName(f.category_name, 50), description: validateNote(f.description) })
}

export function validateProfile(f: { full_name: string; email: string }): Errors {
  return collect({ full_name: validateName(f.full_name), email: validateEmail(f.email) })
}

export function validatePasswordChange(f: { current: string; next: string; confirm: string }): Errors {
  return collect({
    current: f.current ? undefined : 'Введите текущий пароль',
    next: validatePassword(f.next) ?? (f.next === f.current ? 'Новый пароль совпадает со старым' : undefined),
    confirm: f.confirm === f.next ? undefined : 'Пароли не совпадают',
  })
}
