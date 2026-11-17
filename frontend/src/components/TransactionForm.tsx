import { useState, type FormEvent } from 'react'
import type { Category, MonthlyReport, Transaction, TransactionInput } from '../api/types'
import { today } from '../lib/format'
import { checkBeforeSave, isFutureDate, type Warning } from '../lib/guards'
import { hasErrors, normalizeAmount, validateTransaction, type Errors } from '../lib/validation'
import { Alert, Field, MoneyInput } from './Field'

type Props = {
  categories: Category[]
  initial?: Transaction
  submitLabel?: string
  onSubmit: (data: TransactionInput) => Promise<void>
  onCancel?: () => void
  /** expenses already loaded on the page: used to catch duplicates and typos */
  existing?: Transaction[]
  /** report for the month: used to warn before a limit is exceeded */
  report?: MonthlyReport | null
}

export function TransactionForm({ categories, initial, submitLabel = 'Добавить расход', onSubmit, onCancel, existing, report }: Props) {
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
  // warnings the user has already seen; a second click on "save" means "yes, I'm sure"
  const [pending, setPending] = useState<Warning[]>([])

  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => {
    setForm({ ...form, [k]: e.target.value })
    if (errors[k]) setErrors({ ...errors, [k]: '' })
    setPending([])
  }

  const toInput = (): TransactionInput => ({
    category_id: Number(form.category_id),
    amount: normalizeAmount(form.amount),
    transaction_date: form.transaction_date,
    note: form.note.trim() || null,
  })

  async function submit(e: FormEvent) {
    e.preventDefault()
    setServerError(null)
    const errs = validateTransaction(form)
    if (!errs.transaction_date && isFutureDate(form.transaction_date, today())) {
      errs.transaction_date = 'Дата в будущем: расход ещё не случился'
    }
    setErrors(errs)
    if (hasErrors(errs)) return
    const input = toInput()
    const confirmNeeded = checkBeforeSave(input, { existing, report, ignoreId: initial?.transaction_id })
      .filter((w) => w.kind === 'confirm')
    if (confirmNeeded.length && !pending.length) {
      setPending(confirmNeeded) // show the question, do not save yet
      return
    }
    setSaving(true)
    try {
      await onSubmit(input)
      setPending([])
      if (!initial) setForm({ ...form, amount: '', note: '' })
    } catch (err) {
      setServerError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  // limit preview updates while typing (only once the amount and category are valid)
  const ready = form.category_id && !validateTransaction(form).amount
  const liveInfo = ready ? checkBeforeSave(toInput(), { report }).filter((w) => w.kind === 'info') : []

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
        <input type="date" max={today()} value={form.transaction_date} onChange={set('transaction_date')} />
      </Field>
      <Field label="Заметка" error={errors.note} hint="Необязательно, видна только вам" className="span-2">
        <input maxLength={220} placeholder="Например, продукты в Magnum" value={form.note} onChange={set('note')} />
      </Field>
      {liveInfo.map((w) => <Alert kind="warning" key={w.text}>{w.text}</Alert>)}
      {pending.map((w) => <Alert kind="warning" key={w.text}><b>Проверьте:</b> {w.text}</Alert>)}
      <div className="form-actions">
        <button className="btn btn-primary" disabled={saving}>
          {saving ? 'Сохранение…' : pending.length ? 'Да, всё верно, сохранить' : submitLabel}
        </button>
        {pending.length > 0 && <button type="button" className="btn btn-ghost" onClick={() => setPending([])}>Исправить</button>}
        {onCancel && <button type="button" className="btn btn-ghost" onClick={onCancel}>Отмена</button>}
      </div>
    </form>
  )
}
