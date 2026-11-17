import type { MonthCompare, MonthlyReport, Transaction } from '../api/types'
import { computeBadges, healthScore, levelFor } from '../lib/achievements'

/** Score ring + level + badge grid. Locked badges show how close the user is. */
export function Achievements({ report, compare, mine }: {
  report: MonthlyReport
  compare: MonthCompare | null
  mine: Transaction[]
}) {
  const badges = computeBadges(report, compare, mine)
  const score = healthScore(report, badges)
  const { level, next } = levelFor(score)
  const earned = badges.filter((b) => b.earned).length

  return (
    <section className="section">
      <div className="card-head">
        <h2>Достижения месяца</h2>
        <span className="muted small">{earned} из {badges.length}</span>
      </div>
      <div className="score-row">
        <div className="score-ring" style={{ ['--p' as string]: `${score}%` }} role="img" aria-label={`Здоровье бюджета: ${score} из 100`}>
          <span><b>{score}</b><small>из 100</small></span>
        </div>
        <div>
          <p className="level"><span aria-hidden>{level.icon}</span> {level.name}</p>
          <p className="muted small">
            {next ? `До уровня «${next.name}» осталось ${next.min - score} очк.` : 'Максимальный уровень, так держать!'}
          </p>
          <p className="muted small">Очки: 70 за соблюдение лимитов и 30 за полученные бейджи.</p>
        </div>
      </div>
      <ul className="badges">
        {badges.map((b) => (
          <li key={b.id} className={b.earned ? 'badge-card earned' : 'badge-card'} title={b.description}>
            <span className="badge-icon" aria-hidden>{b.icon}</span>
            <b>{b.title}</b>
            <span className="muted small">{b.description}</span>
            {b.earned ? <span className="badge badge-ok">получено{b.hint ? ` · ${b.hint}` : ''}</span> : (
              <>
                <div className="bar"><div className="bar-fill" style={{ width: `${Math.round(b.progress * 100)}%` }} /></div>
                {b.hint && <span className="muted small">{b.hint}</span>}
              </>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
