// Checks that run BEFORE saving, so the user notices a likely mistake while it is still cheap to fix.
import type { MonthlyReport, Transaction, TransactionInput } from '../api/types'
import { kzt } from './format'

export type Warning = { kind: 'confirm' | 'info'; text: string }

/** Same category, amount and date as an expense that already exists: probably entered twice. */
export function findDuplicate(input: TransactionInput, existing: Transaction[], ignoreId?: number): Transaction | undefined {
  return existing.find((t) => t.is_mine && t.transaction_id !== ignoreId && t.category_id === input.category_id
    && Number(t.amount) === Number(input.amount) && t.transaction_date === input.transaction_date)
}

/** Much bigger than usual (an extra zero is the classic typo). Needs some history to compare with. */
export function isUnusuallyLarge(amount: number, existing: Transaction[], factor = 5): boolean {
  const amounts = existing.filter((t) => t.is_mine).map((t) => Number(t.amount)).sort((a, b) => a - b)
  if (amounts.length < 3) return false
  const median = amounts[Math.floor(amounts.length / 2)]
  return amount > median * factor
}

/** How the category limit will look after this expense, if the report is for the same month. */
export function limitAfter(input: TransactionInput, report?: MonthlyReport | null): Warning | undefined {
  if (!report || !input.transaction_date.startsWith(report.month_start.slice(0, 7))) return undefined
  const c = report.categories.find((x) => x.category_id === input.category_id)
  if (!c?.monthly_limit) return undefined
  const after = Number(c.spent) + Number(input.amount)
  const limit = Number(c.monthly_limit)
  if (after > limit) return { kind: 'info', text: `После этого расхода лимит «${c.category_name}» будет превышен на ${kzt(after - limit)}` }
  if (after > limit * 0.8) return { kind: 'info', text: `После этого расхода останется ${kzt(limit - after)} из лимита «${c.category_name}»` }
}

export function isFutureDate(date: string, todayIso: string): boolean {
  return date > todayIso
}

/** Everything to show before saving. "confirm" warnings require a second click. */
export function checkBeforeSave(input: TransactionInput, ctx: {
  existing?: Transaction[]; report?: MonthlyReport | null; ignoreId?: number
}): Warning[] {
  const out: Warning[] = []
  const existing = ctx.existing ?? []
  const dup = findDuplicate(input, existing, ctx.ignoreId)
  if (dup) out.push({ kind: 'confirm', text: `Такой расход уже есть: ${dup.category_name}, ${kzt(dup.amount)} в тот же день. Это не повтор?` })
  if (isUnusuallyLarge(Number(input.amount), existing)) {
    out.push({ kind: 'confirm', text: `Сумма ${kzt(input.amount)} намного больше ваших обычных расходов. Проверьте, нет ли лишнего нуля.` })
  }
  const lim = limitAfter(input, ctx.report)
  if (lim) out.push(lim)
  return out
}
