import { monthLabel } from '../lib/format'
import { useI18n } from '../lib/i18n'

function shift(month: string, delta: number) {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function MonthPicker({ value, onChange }: { value: string; onChange: (m: string) => void }) {
  const { t } = useI18n()
  return (
    <div className="month-picker">
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => onChange(shift(value, -1))} aria-label={t('month.prev')}>‹</button>
      <span className="month-label">{monthLabel(value)}</span>
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => onChange(shift(value, 1))} aria-label={t('month.next')}>›</button>
    </div>
  )
}
