import { describe, expect, it } from 'vitest'
import type { Transaction } from '../api/types'
import { dailyTotals, matchesSearch, sortTransactions, validateRange } from './filters'

const tx = (id: number, amount: string, date: string, extra: Partial<Transaction> = {}): Transaction => ({
  transaction_id: id, user_id: 1, user_full_name: 'Dana M', category_id: 1, category_name: 'Food',
  amount, transaction_date: date, note: null, is_mine: true, ...extra,
})

describe('transaction filters (24B031677)', () => {
  const rows = [tx(1, '500', '2026-10-03'), tx(2, '12000', '2026-10-10'), tx(3, '900', '2026-10-10')]

  it('sorts by amount and date', () => {
    expect(sortTransactions(rows, 'amount_desc').map((t) => t.transaction_id)).toEqual([2, 3, 1])
    expect(sortTransactions(rows, 'date_asc').map((t) => t.transaction_id)).toEqual([1, 2, 3])
    expect(sortTransactions(rows, 'date_desc').map((t) => t.transaction_id)).toEqual([3, 2, 1])
  })
  it('does not mutate the original list', () => {
    sortTransactions(rows, 'amount_asc')
    expect(rows.map((t) => t.transaction_id)).toEqual([1, 2, 3])
  })
  it('searches category, name and own notes, case-insensitive', () => {
    expect(matchesSearch(tx(1, '1', '2026-10-01', { note: 'Magnum супермаркет' }), 'СУПЕР')).toBe(true)
    expect(matchesSearch(tx(1, '1', '2026-10-01'), 'food')).toBe(true)
    expect(matchesSearch(tx(1, '1', '2026-10-01'), '  ')).toBe(true)
  })
  it('never matches inside someone else\'s hidden note', () => {
    expect(matchesSearch(tx(1, '1', '2026-10-01', { note: 'secret', is_mine: false }), 'secret')).toBe(false)
  })
  it('checks that "from" is not greater than "to"', () => {
    expect(validateRange('5000', '100')).toBeDefined()
    expect(validateRange('100', '5000')).toBeUndefined()
    expect(validateRange('', '5000')).toBeUndefined()
  })
  it('builds daily totals for the dashboard chart', () => {
    const days = dailyTotals([...rows, tx(4, '1', '2026-09-30')], '2026-10')
    expect(days).toHaveLength(31)
    expect(days[2]).toBe(500)
    expect(days[9]).toBe(12900)
    expect(days.reduce((a, b) => a + b)).toBe(13400)
  })
})
