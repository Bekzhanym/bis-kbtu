import { useState, type FormEvent } from 'react'
import type { Category, TransactionInput } from '../api/types'
import { kzt, today } from '../lib/format'
import { normalizeAmount, validateAmount, validateCategoryId, validateDate, validateNote } from '../lib/validation'
import { Alert, Field, MoneyInput } from './Field'

type Row = { category_id: string; amount: string }
type Props = { categories: Category[]; onSubmit: (items: TransactionInput[]) => Promise<void> }

/** One receipt split into several categories. Saved atomically: all rows or none. */
export function SplitForm({ categories, onSubmit }: Props) {
  const active = categories.filter((c) => c.is_active)
  const [rows, setRows] = useState<Row[]>([{ category_id: '', amount: '' }, { category_id: '', amount: '' }])
  const [date, setDate] = useState(today())
  const [note, setNote] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const total = rows.reduce((s, r) => s + (validateAmount(r.amount) ? 0 : Number(normalizeAmount(r.amount))), 0)
  const update = (i: number, k: keyof Row, v: string) => setRows(rows.map((r, j) => (j === i ? { ...r, [k]: v } : r)))

  async function submit(e: FormEvent) {
    e.preventDefault()
    setServerError(null)
    const errs: Record<string, string> = {}
    rows.forEach((r, i) => {
      const c = validateCategoryId(r.category_id)
      const a = validateAmount(r.amount)
      if (c) errs[`c${i}`] = c
      if (a) errs[`a${i}`] = a
    })
    const d = validateDate(date)
    const n = validateNote(note)
    if (d) errs.date = d
    if (n) errs.note = n
    setErrors(errs)
    if (Object.keys(errs).length) return
    setSaving(true)
    try {
      await onSubmit(rows.map((r) => ({
        category_id: Number(r.category_id), amount: normalizeAmount(r.amount),
        transaction_date: date, note: note.trim() || null,
      })))
      setRows([{ category_id: '', amount: '' }, { category_id: '', amount: '' }])
      setNote('')
    } catch (err) {
      setServerError((err as Error).message + '. Ни одна строка не сохранена.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} noValidate className="split-form">
      {serverError && <Alert>{serverError}</Alert>}
      {rows.map((r, i) => (
        <div className="split-row" key={i}>
          <Field label={`Часть ${i + 1}: категория`} error={errors[`c${i}`]}>
            <select value={r.category_id} onChange={(e) => update(i, 'category_id', e.target.value)}>
              <option value="">— выберите —</option>
              {active.map((c) => <option key={c.category_id} value={c.category_id}>{c.category_name}</option>)}
            </select>
          </Field>
          <Field label="Сумма" error={errors[`a${i}`]}>
            <MoneyInput value={r.amount} onChange={(e) => update(i, 'amount', e.target.value)} />
          </Field>
          {rows.length > 2 && (
            <button type="button" className="btn btn-ghost btn-sm split-remove"
              onClick={() => setRows(rows.filter((_, j) => j !== i))} aria-label="Удалить часть">✕</button>
          )}
        </div>
      ))}
      <div className="form-grid">
        <Field label="Дата чека" error={errors.date}>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Заметка" error={errors.note} className="span-2">
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Например, чек из супермаркета" />
        </Field>
      </div>
      <div className="form-actions">
        {rows.length < 20 && (
          <button type="button" className="btn btn-ghost" onClick={() => setRows([...rows, { category_id: '', amount: '' }])}>
            + Ещё часть
          </button>
        )}
        <span className="muted">Итого по чеку: <b>{kzt(total)}</b></span>
        <button className="btn btn-primary" disabled={saving}>{saving ? 'Сохранение…' : 'Сохранить чек'}</button>
      </div>
    </form>
  )
}
