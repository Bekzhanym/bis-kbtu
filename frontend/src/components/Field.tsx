import type { InputHTMLAttributes, ReactNode } from 'react'

type Props = { label: string; error?: string; hint?: string; children: ReactNode; className?: string }

export function Field({ label, error, hint, children, className }: Props) {
  return (
    <label className={`field ${error ? 'has-error' : ''} ${className ?? ''}`}>
      <span className="field-label">{label}</span>
      {hint && <span className="field-hint">{hint}</span>}
      {error && <span className="field-error">{error}</span>}
      {children}
    </label>
  )
}

/** Amount input with a currency box on the left. */
export function MoneyInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <span className="money-input">
      <span className="money-prefix" aria-hidden>₸</span>
      <input inputMode="decimal" {...props} />
    </span>
  )
}

export function Alert({ kind = 'error', children }: { kind?: 'error' | 'success' | 'warning'; children: ReactNode }) {
  return <div className={`alert alert-${kind}`} role={kind === 'error' ? 'alert' : 'status'}>{children}</div>
}

/** Side panel with grey rows and a dark total row. */
export function ProgressPanel({ title, sub, rows }: {
  title: string
  sub?: string
  rows: { label: string; value: string; strong?: boolean; bad?: boolean }[]
}) {
  return (
    <aside className="progress-panel">
      <h2>{title} {sub && <span>{sub}</span>}</h2>
      {rows.map((r) => (
        <div key={r.label} className={`progress-row ${r.strong ? 'strong' : ''} ${r.bad ? 'bad' : ''}`}>
          <span>{r.label}</span><b>{r.value}</b>
        </div>
      ))}
    </aside>
  )
}
