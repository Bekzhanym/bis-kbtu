export type Role = 'admin' | 'member'

export type User = { user_id: number; full_name: string; email: string; role: Role }
export type TokenResponse = { access_token: string; refresh_token: string; token_type: string; user: User }

export type Category = {
  category_id: number
  category_name: string
  description: string | null
  is_active: boolean
}

export type Transaction = {
  transaction_id: number
  user_id: number
  user_full_name: string
  category_id: number
  category_name: string
  amount: string
  transaction_date: string
  note: string | null
  is_mine: boolean
}

export type TransactionInput = {
  category_id: number
  amount: string
  transaction_date: string
  note: string | null
}

export type Budget = {
  budget_id: number
  category_id: number
  category_name: string
  month_start: string
  monthly_limit: string
}

export type CategoryReport = {
  category_id: number
  category_name: string
  monthly_limit: string | null
  spent: string
  remaining: string | null
  over_limit: boolean
}

export type MonthlyReport = {
  month_start: string
  total_spent: string
  total_limit: string
  my_spent: string
  categories: CategoryReport[]
  members: { user_id: number; full_name: string; spent: string }[]
}

export type CategoryCompare = {
  category_id: number
  category_name: string
  spent: string
  prev_spent: string
  diff: string
  diff_pct: number | null
}

export type MonthCompare = {
  month_start: string
  prev_month_start: string
  total_spent: string
  prev_total_spent: string
  diff: string
  diff_pct: number | null
  categories: CategoryCompare[]
}
