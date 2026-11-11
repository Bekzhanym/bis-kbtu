// Client-side validation: immediate feedback. The server re-checks everything.
export type Errors = Record<string, string>

// local@domain.tld: no spaces, no dot at the start/end of a part, no ".." (the server rejects these)
const EMAIL_RE = /^(?!\.)(?!.*\.\.)[^\s@]+(?<!\.)@(?!-)[^\s@.]+(\.[^\s@.]+)+$/
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/
const MONTH_RE = /^(\d{4})-(\d{2})$/
const MAX_MONEY = 9_999_999_999.99
const MIN_YEAR = 1900
const MAX_YEAR = 2100

/** Length in characters as the server counts them (an emoji is 1, not 2 UTF-16 units). */
const charLength = (s: string) => [...s].length

export const hasErrors = (e: Errors) => Object.keys(e).length > 0

function collect(entries: Record<string, string | undefined>): Errors {
  const out: Errors = {}
  for (const [k, v] of Object.entries(entries)) if (v) out[k] = v
  return out
}

export function validateName(v: string, max = 100): string | undefined {
  const s = v.trim()
  if (!s) return 'Обязательное поле'
  if (charLength(s) > max) return `Не длиннее ${max} символов`
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
  // \p{L}: any letter, including ё and Kazakh letters (ә, ң, ү…)
  if (!/\p{L}/u.test(v) || !/\d/.test(v)) return 'Пароль должен содержать буквы и цифры'
}

/** Accepts "1500", "1500.5", "1 500,50", "1,500.50", "1.500,50". Returns the value the API expects. */
export function normalizeAmount(v: string): string {
  const s = v.replace(/\s/g, '')
  // Both separators present: the last one is the decimal point, the other one separates thousands
  if (s.includes(',') && s.includes('.')) {
    const decimal = s.lastIndexOf(',') > s.lastIndexOf('.') ? ',' : '.'
    const thousands = decimal === ',' ? '.' : ','
    return s.split(thousands).join('').replace(decimal, '.')
  }
  return s.replace(',', '.')
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
  const m = DATE_RE.exec(v)
  if (!m) return 'Некорректная дата'
  const [y, mo, d] = m.slice(1).map(Number)
  // new Date('2026-02-31') silently becomes 3 March, so compare the parts back
  const dt = new Date(Date.UTC(y, mo - 1, d))
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return 'Такой даты нет'
  if (y < MIN_YEAR || y > MAX_YEAR) return `Год должен быть от ${MIN_YEAR} до ${MAX_YEAR}`
}

export function validateMonth(v: string): string | undefined {
  const m = MONTH_RE.exec(v)
  if (!m) return 'Выберите месяц'
  const [y, mo] = m.slice(1).map(Number)
  if (mo < 1 || mo > 12 || y < MIN_YEAR || y > MAX_YEAR) return 'Некорректный месяц'
}

export function validateNote(v: string, max = 200): string | undefined {
  if (charLength(v.trim()) > max) return `Не длиннее ${max} символов`
}

export function validateCategoryId(v: string | number): string | undefined {
  const n = Number(v)
  if (!Number.isInteger(n) || n <= 0) return 'Выберите категорию'
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
    month: validateMonth(f.month),
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
