import type { Transaction } from '../api/types'

export type Sort = 'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc'

export const SORT_LABELS: Record<Sort, string> = {
  date_desc: 'Сначала новые',
  date_asc: 'Сначала старые',
  amount_desc: 'Сначала дорогие',
  amount_asc: 'Сначала дешёвые',
}

/** Text search over what the user can see: category, member name and their own notes. */
export function matchesSearch(t: Transaction, search: string): boolean {
  const q = search.trim().toLowerCase()
  if (!q) return true
  const note = t.is_mine ? t.note ?? '' : '' // never search inside hidden notes
  return [t.category_name, t.user_full_name, note].some((s) => s.toLowerCase().includes(q))
}

export function sortTransactions(rows: Transaction[], sort: Sort): Transaction[] {
  const out = [...rows]
  const byDate = (a: Transaction, b: Transaction) =>
    a.transaction_date.localeCompare(b.transaction_date) || a.transaction_id - b.transaction_id
  const byAmount = (a: Transaction, b: Transaction) => Number(a.amount) - Number(b.amount)
  switch (sort) {
    case 'date_asc': return out.sort(byDate)
    case 'date_desc': return out.sort((a, b) => byDate(b, a))
    case 'amount_asc': return out.sort(byAmount)
    case 'amount_desc': return out.sort((a, b) => byAmount(b, a))
  }
}

/** "От" must not be greater than "до". Returns an error message or undefined. */
export function validateRange(min: string, max: string): string | undefined {
  if (!min || !max) return undefined
  if (Number(min) > Number(max)) return '«От» больше, чем «до»'
}

/** Daily totals for a month: index 0 = day 1. */
export function dailyTotals(rows: Transaction[], month: string): number[] {
  const [y, m] = month.split('-').map(Number)
  const days = new Date(y, m, 0).getDate()
  const out = Array<number>(days).fill(0)
  for (const t of rows) {
    if (!t.transaction_date.startsWith(month)) continue
    out[Number(t.transaction_date.slice(8, 10)) - 1] += Number(t.amount)
  }
  return out
}
