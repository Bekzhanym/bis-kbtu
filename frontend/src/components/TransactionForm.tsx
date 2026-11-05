import { useState, type FormEvent } from 'react'
import type { Category, Transaction, TransactionInput } from '../api/types'
import { today } from '../lib/format'
import { hasErrors, normalizeAmount, validateTransaction, type Errors } from '../lib/validation'
import { Alert, Field, MoneyInput } from './Field'

type Props = {
  categories: Category[]
  initial?: Transaction
  submitLabel?: string
  onSubmit: (data: TransactionInput) => Promise<void>
  onCancel?: () => void
}

export function TransactionForm({ categories, initial, submitLabel = 'Добавить расход', onSubmit, onCancel }: Props) {
  const active = categories.filter((c) => c.is_active || c.category_id === initial?.category_id)
  const [form, setForm] = useState({
    category_id: String(initial?.category_id ?? ''),
    amount: initial?.amount ?? '',
    transaction_date: initial?.transaction_date ?? today(),
    note: initial?.note ?? '',
  })
  const [errors, setErrors] = useState<Errors>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => {
    setForm({ ...form, [k]: e.target.value })
    if (errors[k]) setErrors({ ...errors, [k]: '' })
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    setServerError(null)
    const errs = validateTransaction(form)
    setErrors(errs)
    if (hasErrors(errs)) return
    setSaving(true)
    try {
      await onSubmit({
        category_id: Number(form.category_id),
        amount: normalizeAmount(form.amount),
        transaction_date: form.transaction_date,
        note: form.note.trim() || null,
      })
      if (!initial) setForm({ ...form, amount: '', note: '' })
    } catch (err) {
      setServerError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="form-grid" onSubmit={submit} noValidate>
      {serverError && <Alert>{serverError}</Alert>}
      <Field label="Категория" error={errors.category_id}>
        <select value={form.category_id} onChange={set('category_id')}>
          <option value="">— выберите —</option>
          {active.map((c) => <option key={c.category_id} value={c.category_id}>{c.category_name}</option>)}
        </select>
      </Field>
      <Field label="Сумма" error={errors.amount}>
        <MoneyInput placeholder="6000" value={form.amount} onChange={set('amount')} />
      </Field>
      <Field label="Дата" error={errors.transaction_date}>
        <input type="date" value={form.transaction_date} onChange={set('transaction_date')} />
      </Field>
      <Field label="Заметка" error={errors.note} hint="Необязательно, видна только вам" className="span-2">
        <input maxLength={220} placeholder="Например, продукты в Magnum" value={form.note} onChange={set('note')} />
      </Field>
      <div className="form-actions">
        <button className="btn btn-primary" disabled={saving}>{saving ? 'Сохранение…' : submitLabel}</button>
        {onCancel && <button type="button" className="btn btn-ghost" onClick={onCancel}>Отмена</button>}
      </div>
    </form>
  )
}
