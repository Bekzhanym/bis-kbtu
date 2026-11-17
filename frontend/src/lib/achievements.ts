// Gamification: badges and a "budget health" score computed from the month's data.
// Nothing is stored: every badge is recalculated from the report, so it is always honest.
import type { MonthCompare, MonthlyReport, Transaction } from '../api/types'

export type Badge = {
  id: string
  icon: string
  title: string
  description: string
  earned: boolean
  /** 0..1, how close the user is (shown for locked badges) */
  progress: number
  hint?: string
}

export type Level = { name: string; icon: string; min: number }

export const LEVELS: Level[] = [
  { name: 'Новичок', icon: '🌱', min: 0 },
  { name: 'Планировщик', icon: '📋', min: 40 },
  { name: 'Хранитель бюджета', icon: '🛡️', min: 70 },
  { name: 'Мастер финансов', icon: '🏆', min: 90 },
]

const clamp01 = (n: number) => Math.max(0, Math.min(1, n))

/** Longest run of consecutive calendar days that have at least one expense. */
export function longestStreak(dates: string[]): number {
  const days = [...new Set(dates)].sort()
  let best = 0
  let run = 0
  let prev: number | null = null
  for (const d of days) {
    const t = Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10)) / 86_400_000
    run = prev !== null && t - prev === 1 ? run + 1 : 1
    best = Math.max(best, run)
    prev = t
  }
  return best
}

export function computeBadges(report: MonthlyReport, compare: MonthCompare | null, mine: Transaction[]): Badge[] {
  const limited = report.categories.filter((c) => c.monthly_limit)
  const over = limited.filter((c) => c.over_limit).length
  const usage = limited.map((c) => Number(c.spent) / Number(c.monthly_limit))
  const loggedDays = new Set(mine.map((t) => t.transaction_date)).size
  const streak = longestStreak(mine.map((t) => t.transaction_date))
  const drop = compare?.diff_pct != null ? -compare.diff_pct : null // positive = spent less

  return [
    {
      id: 'first', icon: '✍️', title: 'Первый шаг', description: 'Внесите первый расход за месяц',
      earned: mine.length > 0, progress: mine.length > 0 ? 1 : 0,
    },
    {
      id: 'diary', icon: '📅', title: 'Аккуратный учёт', description: 'Вносите расходы в 5 разных дней месяца',
      earned: loggedDays >= 5, progress: clamp01(loggedDays / 5),
      hint: loggedDays < 5 ? `ещё ${5 - loggedDays} дн.` : undefined,
    },
    {
      id: 'streak', icon: '🔥', title: 'Серия', description: '3 дня подряд с записями о расходах',
      earned: streak >= 3, progress: clamp01(streak / 3),
      hint: streak < 3 ? `сейчас ${streak} из 3` : `${streak} дн. подряд`,
    },
    {
      id: 'in-budget', icon: '🎯', title: 'В рамках бюджета', description: 'Ни одна категория не превысила лимит',
      earned: limited.length > 0 && over === 0, progress: limited.length ? 1 - over / limited.length : 0,
      hint: over ? `превышено: ${over}` : limited.length ? undefined : 'нет лимитов на месяц',
    },
    {
      id: 'discipline', icon: '🧘', title: 'Железная дисциплина', description: 'Все категории потрачены не больше чем на 80%',
      earned: usage.length > 0 && usage.every((u) => u <= 0.8),
      progress: usage.length ? usage.filter((u) => u <= 0.8).length / usage.length : 0,
    },
    {
      id: 'saver', icon: '💰', title: 'Экономист', description: 'Семья потратила на 10% меньше, чем в прошлом месяце',
      earned: drop !== null && drop >= 10, progress: drop === null ? 0 : clamp01(drop / 10),
      hint: drop === null ? 'нет данных за прошлый месяц' : drop < 10 ? `сейчас ${drop > 0 ? '−' : '+'}${Math.abs(drop)}%` : undefined,
    },
  ]
}

/** 0..100: 70% for how well limits are kept, 30% for earned badges. */
export function healthScore(report: MonthlyReport, badges: Badge[]): number {
  const limited = report.categories.filter((c) => c.monthly_limit)
  const keep = limited.length
    ? limited.reduce((s, c) => s + clamp01(2 - Number(c.spent) / Number(c.monthly_limit)), 0) / limited.length
    : 0.5
  const earned = badges.filter((b) => b.earned).length / (badges.length || 1)
  return Math.round(keep * 70 + earned * 30)
}

export function levelFor(score: number): { level: Level; next?: Level } {
  const i = LEVELS.findLastIndex((l) => score >= l.min)
  return { level: LEVELS[i], next: LEVELS[i + 1] }
}
