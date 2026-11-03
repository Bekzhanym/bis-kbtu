import type {
  Budget, Category, MonthlyReport, Role, TokenResponse, Transaction, TransactionInput, User,
} from './types'

const TOKEN_KEY = 'fbt_token'

export const tokenStore = {
  get(): string | null {
    try { return localStorage.getItem(TOKEN_KEY) } catch { return null }
  },
  set(token: string) {
    try { localStorage.setItem(TOKEN_KEY, token) } catch { /* storage unavailable */ }
  },
  clear() {
    try { localStorage.removeItem(TOKEN_KEY) } catch { /* storage unavailable */ }
  },
}

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

// Server messages -> Russian UI text
const MESSAGES: Record<string, string> = {
  'Invalid email or password': 'Неверный email или пароль',
  'Email already registered': 'Этот email уже зарегистрирован',
  'Not authenticated': 'Сессия истекла, войдите снова',
  'Admin role required': 'Нужны права администратора',
  'Current password is incorrect': 'Текущий пароль неверный',
  'Category does not exist or is inactive': 'Категория не существует или отключена',
  'Category already exists': 'Такая категория уже есть',
  'This category already has a limit for that month': 'Для этой категории уже есть лимит на этот месяц',
  'You can only change your own expenses': 'Можно изменять только свои расходы',
  'Only admins can see all family expenses': 'Все расходы семьи видит только администратор',
  'The household must keep at least one admin': 'В семье должен остаться хотя бы один администратор',
  'Database constraint violated': 'Данные нарушают ограничения базы данных',
}

function messageFrom(detail: unknown, fallback: string): string {
  if (typeof detail === 'string') return MESSAGES[detail] ?? detail
  if (Array.isArray(detail)) {
    return detail.map((d) => `${(d.loc ?? []).slice(1).join('.')}: ${d.msg}`).join('; ')
  }
  return fallback
}

type Options = { method?: string; body?: unknown; query?: Record<string, string | number | undefined | null> }

async function request<T>(path: string, { method = 'GET', body, query }: Options = {}): Promise<T> {
  const params = new URLSearchParams()
  for (const [k, v] of Object.entries(query ?? {})) {
    if (v !== undefined && v !== null && v !== '') params.set(k, String(v))
  }
  const url = params.size ? `${path}?${params}` : path
  const token = tokenStore.get()
  const headers: Record<string, string> = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (token) headers.Authorization = `Bearer ${token}`

  let res: Response
  try {
    res = await fetch(url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) })
  } catch {
    throw new ApiError(0, 'Сервер недоступен. Запущен ли backend?')
  }

  if (res.status === 401 && token) {
    tokenStore.clear()
    window.dispatchEvent(new Event('auth:logout'))
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    const fallback = res.status >= 500 || res.status === 502 ? 'Сервер недоступен. Запущен ли backend?' : res.statusText
    throw new ApiError(res.status, messageFrom(data.detail, fallback))
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export const api = {
  // auth & profile
  login: (email: string, password: string) =>
    request<TokenResponse>('/api/auth/login', { method: 'POST', body: { email, password } }),
  register: (full_name: string, email: string, password: string) =>
    request<TokenResponse>('/api/auth/register', { method: 'POST', body: { full_name, email, password } }),
  me: () => request<User>('/api/auth/me'),
  updateMe: (data: { full_name?: string; email?: string }) =>
    request<User>('/api/auth/me', { method: 'PATCH', body: data }),
  changePassword: (current_password: string, new_password: string) =>
    request<void>('/api/auth/change-password', { method: 'POST', body: { current_password, new_password } }),

  // users (admin)
  users: () => request<User[]>('/api/users'),
  setRole: (id: number, role: Role) => request<User>(`/api/users/${id}/role`, { method: 'PATCH', body: { role } }),

  // categories
  categories: () => request<Category[]>('/api/categories'),
  createCategory: (data: { category_name: string; description: string | null }) =>
    request<Category>('/api/categories', { method: 'POST', body: data }),
  updateCategory: (id: number, data: Partial<Omit<Category, 'category_id'>>) =>
    request<Category>(`/api/categories/${id}`, { method: 'PATCH', body: data }),

  // transactions
  transactions: (q: { scope?: 'mine' | 'all'; month?: string; category_id?: number; min_amount?: string } = {}) =>
    request<Transaction[]>('/api/transactions', { query: q }),
  createTransaction: (data: TransactionInput) =>
    request<Transaction>('/api/transactions', { method: 'POST', body: data }),
  createSplit: (items: TransactionInput[]) =>
    request<Transaction[]>('/api/transactions/split', { method: 'POST', body: { items } }),
  updateTransaction: (id: number, data: Partial<TransactionInput>) =>
    request<Transaction>(`/api/transactions/${id}`, { method: 'PATCH', body: data }),
  deleteTransaction: (id: number) => request<void>(`/api/transactions/${id}`, { method: 'DELETE' }),

  // budgets
  budgets: (month?: string) => request<Budget[]>('/api/budgets', { query: { month } }),
  createBudget: (data: { category_id: number; month_start: string; monthly_limit: string }) =>
    request<Budget>('/api/budgets', { method: 'POST', body: data }),
  updateBudget: (id: number, monthly_limit: string) =>
    request<Budget>(`/api/budgets/${id}`, { method: 'PATCH', body: { monthly_limit } }),
  deleteBudget: (id: number) => request<void>(`/api/budgets/${id}`, { method: 'DELETE' }),

  // reports
  monthlyReport: (month: string) => request<MonthlyReport>('/api/reports/monthly', { query: { month } }),
}
