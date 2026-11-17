import { describe, expect, it } from 'vitest'
import type { MonthlyReport, Transaction } from '../api/types'
import { checkBeforeSave, findDuplicate, isFutureDate, isUnusuallyLarge, limitAfter } from './guards'

const tx = (id: number, amount: string, date = '2026-10-10', extra: Partial<Transaction> = {}): Transaction => ({
  transaction_id: id, user_id: 1, user_full_name: 'Dana', category_id: 1, category_name: 'Food',
  amount, transaction_date: date, note: null, is_mine: true, ...extra,
})
const input = (amount: string, date = '2026-10-10') => ({ category_id: 1, amount, transaction_date: date, note: null })
const report: MonthlyReport = {
  month_start: '2026-10-01', total_spent: '90000', total_limit: '100000', my_spent: '0', members: [],
  categories: [{ category_id: 1, category_name: 'Food', monthly_limit: '100000.00', spent: '90000.00', remaining: '10000', over_limit: false }],
}

describe('error prevention (24B031677)', () => {
  it('finds a duplicate: same category, amount and day', () => {
    expect(findDuplicate(input('1500.00'), [tx(7, '1500')])?.transaction_id).toBe(7)
    expect(findDuplicate(input('1500'), [tx(7, '1500', '2026-10-11')])).toBeUndefined()
  })
  it('ignores the expense being edited and other people\'s expenses', () => {
    expect(findDuplicate(input('1500'), [tx(7, '1500')], 7)).toBeUndefined()
    expect(findDuplicate(input('1500'), [tx(8, '1500', '2026-10-10', { is_mine: false })])).toBeUndefined()
  })
  it('flags an extra zero only when there is enough history', () => {
    const history = [tx(1, '2000'), tx(2, '3000'), tx(3, '2500')]
    expect(isUnusuallyLarge(25000, history)).toBe(true)
    expect(isUnusuallyLarge(9000, history)).toBe(false)
    expect(isUnusuallyLarge(25000, history.slice(0, 2))).toBe(false)
  })
  it('warns before the limit is exceeded, only for the same month', () => {
    expect(limitAfter(input('15000'), report)?.text).toMatch(/превышен на 5/)
    expect(limitAfter(input('2000'), report)?.text).toMatch(/останется/)
    expect(limitAfter(input('15000', '2026-11-01'), report)).toBeUndefined()
  })
  it('detects dates in the future', () => {
    expect(isFutureDate('2026-11-20', '2026-11-19')).toBe(true)
    expect(isFutureDate('2026-11-19', '2026-11-19')).toBe(false)
  })
  it('combines checks; duplicates need confirmation', () => {
    const w = checkBeforeSave(input('1500'), { existing: [tx(7, '1500')] })
    expect(w.map((x) => x.kind)).toEqual(['confirm'])
  })
})
