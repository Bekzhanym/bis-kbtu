import { describe, expect, it } from 'vitest'
import type { MonthCompare, MonthlyReport, Transaction } from '../api/types'
import { computeBadges, healthScore, levelFor, longestStreak } from './achievements'

const tx = (date: string): Transaction => ({
  transaction_id: Math.random(), user_id: 1, user_full_name: 'D', category_id: 1, category_name: 'Food',
  amount: '100', transaction_date: date, note: null, is_mine: true,
})
const report = (spent: string[], limits: (string | null)[]): MonthlyReport => ({
  month_start: '2026-10-01', total_spent: '0', total_limit: '0', my_spent: '0', members: [],
  categories: spent.map((s, i) => ({
    category_id: i + 1, category_name: `C${i}`, spent: s, monthly_limit: limits[i], remaining: null,
    over_limit: limits[i] !== null && Number(s) > Number(limits[i]),
  })),
})
const cmp = (pct: number | null): MonthCompare => ({
  month_start: '2026-10-01', prev_month_start: '2026-09-01', total_spent: '0', prev_total_spent: '0',
  diff: '0', diff_pct: pct, categories: [],
})
const byId = (badges: ReturnType<typeof computeBadges>) => Object.fromEntries(badges.map((b) => [b.id, b]))

describe('gamification (24B032010)', () => {
  it('counts the longest streak of consecutive days', () => {
    expect(longestStreak(['2026-10-01', '2026-10-02', '2026-10-02', '2026-10-03', '2026-10-07'])).toBe(3)
    expect(longestStreak(['2026-10-31', '2026-11-01'])).toBe(2) // across months
    expect(longestStreak([])).toBe(0)
  })
  it('awards badges from real data', () => {
    const mine = ['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-10', '2026-10-20'].map(tx)
    const b = byId(computeBadges(report(['50', '70'], ['100', '100']), cmp(-15), mine))
    expect(b.first.earned && b.diary.earned && b.streak.earned && b['in-budget'].earned).toBe(true)
    expect(b.discipline.earned).toBe(true)
    expect(b.saver.earned).toBe(true)
  })
  it('keeps badges locked and shows progress', () => {
    const b = byId(computeBadges(report(['150', '90'], ['100', '100']), cmp(5), [tx('2026-10-01')]))
    expect(b['in-budget'].earned).toBe(false)
    expect(b['in-budget'].progress).toBe(0.5)
    expect(b.diary.hint).toBe('ещё 4 дн.')
    expect(b.saver.earned).toBe(false)
  })
  it('scores the month and picks a level', () => {
    const good = report(['50'], ['100'])
    const bad = report(['250'], ['100'])
    expect(healthScore(good, computeBadges(good, cmp(-20), [tx('2026-10-01')]))).toBeGreaterThan(70)
    expect(healthScore(bad, computeBadges(bad, cmp(50), []))).toBeLessThan(20)
    expect(levelFor(95).level.name).toBe('Мастер финансов')
    expect(levelFor(10).next?.name).toBe('Планировщик')
  })
})
