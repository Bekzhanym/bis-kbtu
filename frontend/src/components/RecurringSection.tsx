import { useState, type FormEvent } from 'react'
import { api } from '../api/client'
import type { Category } from '../api/types'
import { categoryIcon } from '../lib/categories'
import { kzt } from '../lib/format'
import { useLoad } from '../lib/useLoad'
import { hasErrors, normalizeAmount, validateRecurring, type Errors } from '../lib/validation'
import { Field, MoneyInput } from './Field'
import { EmptyState, useToast } from './Feedback'

const EMPTY = { category_id: '', amount: '', day_of_month: '1', note: '' }

/** Monthly payments (subscriptions, rent, internet). The server turns them into expenses on their day. */
export function RecurringSection({ categories, onChanged }: { categories: Category[]; onChanged: () => void }) {
  const list = useLoad(() => api.recurring(), [])
  const toast = useToast()
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState<Errors>({})
  const [open, setOpen] = useState(false)
  const rows = list.data ?? []
  const monthly = rows.filter((r) => r.is_active).reduce((s, r) => s + Number(r.amount), 0)

  const set = (k: keyof typeof EMPTY) => (e: { target: { value: string } }) => {
    setForm({ ...form, [k]: e.target.value })
    if (errors[k]) setErrors({ ...errors, [k]: '' })
  }

  async function run(action: () => Promise<unknown>, done: string) {
    try {
      await action()
      toast(done)
      await list.reload()
      onChanged() // today's payment may already have been created
    } catch (e) {
      toast((e as Error).message, { kind: 'error' })
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    const errs = validateRecurring(form)
    setErrors(errs)
    if (hasErrors(errs)) return
    await run(() => api.createRecurring({
      category_id: Number(form.category_id), amount: normalizeAmount(form.amount),
      day_of_month: Number(form.day_of_month), note: form.note.trim() || null,
    }), 'Регулярный платёж добавлен')
    setForm(EMPTY)
    setOpen(false)
  }

  return (
    <section className="section">
      <div className="card-head">
        <h2>Регулярные платежи</h2>
        <button className={`btn btn-sm ${open ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setOpen(!open)}>+ Платёж</button>
      </div>
      <p className="muted small">
        Подписки, аренда, интернет: расход добавится сам в указанный день каждого месяца.
        {monthly > 0 && <> Всего в месяц: <b>{kzt(monthly)}</b>.</>}
      </p>

      {open && (
        <form className="form-grid" onSubmit={submit} noValidate>
          <Field label="Категория" error={errors.category_id}>
            <select value={form.category_id} onChange={set('category_id')}>
              <option value="">— выберите —</option>
              {categories.filter((c) => c.is_active).map((c) => <option key={c.category_id} value={c.category_id}>{c.category_name}</option>)}
            </select>
          </Field>
          <Field label="Сумма" error={errors.amount}>
            <MoneyInput placeholder="2990" value={form.amount} onChange={set('amount')} />
          </Field>
          <Field label="День месяца" error={errors.day_of_month} hint="1–28, чтобы день был в каждом месяце">
            <input type="number" min={1} max={28} value={form.day_of_month} onChange={set('day_of_month')} />
          </Field>
          <Field label="Название" error={errors.note}>
            <input maxLength={220} placeholder="Например, Netflix" value={form.note} onChange={set('note')} />
          </Field>
          <div className="form-actions">
            <button className="btn btn-primary">Сохранить</button>
            <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>Отмена</button>
          </div>
        </form>
      )}

      {!list.loading && rows.length === 0 && !open && (
        <EmptyState icon="🔁" title="Регулярных платежей пока нет" text="Добавьте подписку или аренду, чтобы не вносить их вручную." />
      )}
      <ul className="list">
        {rows.map((r) => (
          <li key={r.recurring_id} className={r.is_active ? '' : 'row-muted'}>
            <span className="cat-badge" aria-hidden>{categoryIcon(r.category_name)}</span>
            <div className="grow">
              <b>{r.note ?? r.category_name}</b>
              <span className="muted small">{r.category_name} · каждое {r.day_of_month} число{r.is_active ? '' : ' · на паузе'}</span>
            </div>
            <span className="amount">{kzt(r.amount)}</span>
            <button className="btn btn-ghost btn-sm" onClick={() => run(
              () => api.updateRecurring(r.recurring_id, { is_active: !r.is_active }),
              r.is_active ? 'Платёж на паузе' : 'Платёж снова активен')}>
              {r.is_active ? 'Пауза' : 'Включить'}
            </button>
            <button className="btn btn-danger btn-sm" onClick={() => run(
              () => api.deleteRecurring(r.recurring_id), 'Регулярный платёж удалён')}>Удалить</button>
          </li>
        ))}
      </ul>
    </section>
  )
}
