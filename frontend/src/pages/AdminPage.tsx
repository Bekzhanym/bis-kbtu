import { useState, type FormEvent } from 'react'
import { api } from '../api/client'
import type { Budget, Category } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { Alert, Field, MoneyInput } from '../components/Field'
import { MonthPicker } from '../components/MonthPicker'
import { kzt, monthStart } from '../lib/format'
import { useLoad } from '../lib/useLoad'
import { useMonth } from '../lib/useMonth'
import { hasErrors, normalizeAmount, validateAmount, validateBudget, validateCategory, type Errors } from '../lib/validation'

type Tab = 'categories' | 'budgets' | 'users'
type Msg = { kind: 'success' | 'error'; text: string } | null

export function AdminPage() {
  const [tab, setTab] = useState<Tab>('budgets')
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Управление</h1>
          <p className="muted">Доступно только администраторам семьи</p>
        </div>
      </div>
      <div className="tabs">
        <button className={tab === 'budgets' ? 'active' : ''} onClick={() => setTab('budgets')}>Лимиты</button>
        <button className={tab === 'categories' ? 'active' : ''} onClick={() => setTab('categories')}>Категории</button>
        <button className={tab === 'users' ? 'active' : ''} onClick={() => setTab('users')}>Пользователи</button>
      </div>
      {tab === 'budgets' && <BudgetsTab />}
      {tab === 'categories' && <CategoriesTab />}
      {tab === 'users' && <UsersTab />}
    </>
  )
}

function BudgetsTab() {
  const [month, setMonth] = useMonth()
  const budgets = useLoad(() => api.budgets(monthStart(month)), [month])
  const categories = useLoad(() => api.categories(), [])
  const [form, setForm] = useState({ category_id: '', monthly_limit: '' })
  const [errors, setErrors] = useState<Errors>({})
  const [msg, setMsg] = useState<Msg>(null)
  const [editing, setEditing] = useState<{ id: number; value: string } | null>(null)

  const used = new Set(budgets.data?.map((b) => b.category_id))
  const free = categories.data?.filter((c) => c.is_active && !used.has(c.category_id)) ?? []

  async function add(e: FormEvent) {
    e.preventDefault()
    setMsg(null)
    const errs = validateBudget({ ...form, month })
    setErrors(errs)
    if (hasErrors(errs)) return
    try {
      await api.createBudget({ category_id: Number(form.category_id), month_start: monthStart(month), monthly_limit: normalizeAmount(form.monthly_limit) })
      setForm({ category_id: '', monthly_limit: '' })
      setMsg({ kind: 'success', text: 'Лимит добавлен' })
      await budgets.reload()
    } catch (err) {
      setMsg({ kind: 'error', text: (err as Error).message })
    }
  }

  async function saveEdit(b: Budget) {
    if (!editing) return
    const err = validateAmount(editing.value)
    if (err) return setMsg({ kind: 'error', text: err })
    try {
      await api.updateBudget(b.budget_id, normalizeAmount(editing.value))
      setEditing(null)
      setMsg({ kind: 'success', text: 'Лимит обновлён' })
      await budgets.reload()
    } catch (e) {
      setMsg({ kind: 'error', text: (e as Error).message })
    }
  }

  async function remove(b: Budget) {
    if (!confirm(`Удалить лимит для «${b.category_name}»?`)) return
    try {
      await api.deleteBudget(b.budget_id)
      await budgets.reload()
    } catch (e) {
      setMsg({ kind: 'error', text: (e as Error).message })
    }
  }

  return (
    <section className="section">
      <div className="card-head">
        <h2>Месячные лимиты</h2>
        <MonthPicker value={month} onChange={setMonth} />
      </div>
      {msg && <Alert kind={msg.kind}>{msg.text}</Alert>}
      <div className="table-wrap">
        <table>
          <thead><tr><th>Категория</th><th className="num">Лимит</th><th /></tr></thead>
          <tbody>
            {budgets.data?.map((b) => (
              <tr key={b.budget_id}>
                <td>{b.category_name}</td>
                <td className="num">
                  {editing?.id === b.budget_id ? (
                    <input className="inline-input" inputMode="decimal" value={editing.value} autoFocus
                      onChange={(e) => setEditing({ id: b.budget_id, value: e.target.value })}
                      onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(b); if (e.key === 'Escape') setEditing(null) }} />
                  ) : kzt(b.monthly_limit)}
                </td>
                <td className="actions">
                  {editing?.id === b.budget_id ? (
                    <>
                      <button className="btn btn-primary btn-sm" onClick={() => saveEdit(b)}>OK</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => setEditing(null)}>Отмена</button>
                    </>
                  ) : (
                    <>
                      <button className="btn btn-ghost btn-sm" onClick={() => setEditing({ id: b.budget_id, value: b.monthly_limit })}>Изменить</button>
                      <button className="btn btn-danger btn-sm" onClick={() => remove(b)}>Удалить</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {budgets.data?.length === 0 && <tr><td colSpan={3} className="muted center">На этот месяц лимитов нет</td></tr>}
          </tbody>
        </table>
      </div>

      {free.length > 0 && (
        <form className="form-grid top-gap" onSubmit={add} noValidate>
          <Field label="Категория" error={errors.category_id}>
            <select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
              <option value="">— выберите —</option>
              {free.map((c) => <option key={c.category_id} value={c.category_id}>{c.category_name}</option>)}
            </select>
          </Field>
          <Field label="Лимит в месяц" error={errors.monthly_limit}>
            <MoneyInput value={form.monthly_limit} onChange={(e) => setForm({ ...form, monthly_limit: e.target.value })} />
          </Field>
          <div className="form-actions"><button className="btn btn-primary">Добавить лимит</button></div>
        </form>
      )}
    </section>
  )
}

function CategoriesTab() {
  const categories = useLoad(() => api.categories(), [])
  const [form, setForm] = useState({ category_name: '', description: '' })
  const [errors, setErrors] = useState<Errors>({})
  const [msg, setMsg] = useState<Msg>(null)

  async function add(e: FormEvent) {
    e.preventDefault()
    setMsg(null)
    const errs = validateCategory(form)
    setErrors(errs)
    if (hasErrors(errs)) return
    try {
      await api.createCategory({ category_name: form.category_name.trim(), description: form.description.trim() || null })
      setForm({ category_name: '', description: '' })
      setMsg({ kind: 'success', text: 'Категория добавлена' })
      await categories.reload()
    } catch (err) {
      setMsg({ kind: 'error', text: (err as Error).message })
    }
  }

  async function toggle(c: Category) {
    try {
      await api.updateCategory(c.category_id, { is_active: !c.is_active })
      await categories.reload()
    } catch (e) {
      setMsg({ kind: 'error', text: (e as Error).message })
    }
  }

  return (
    <section className="section">
      <h2>Категории расходов</h2>
      <p className="muted small">Категории не удаляются, чтобы не терять историю: их можно отключить. В отключённую категорию нельзя добавить новый расход.</p>
      {msg && <Alert kind={msg.kind}>{msg.text}</Alert>}
      <div className="table-wrap">
        <table>
          <thead><tr><th>Название</th><th>Описание</th><th>Статус</th><th /></tr></thead>
          <tbody>
            {categories.data?.map((c) => (
              <tr key={c.category_id} className={c.is_active ? '' : 'row-muted'}>
                <td>{c.category_name}</td>
                <td className="muted">{c.description}</td>
                <td>{c.is_active ? <span className="badge badge-ok">активна</span> : <span className="badge">отключена</span>}</td>
                <td className="actions">
                  <button className="btn btn-ghost btn-sm" onClick={() => toggle(c)}>{c.is_active ? 'Отключить' : 'Включить'}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <form className="form-grid top-gap" onSubmit={add} noValidate>
        <Field label="Название" error={errors.category_name}>
          <input value={form.category_name} onChange={(e) => setForm({ ...form, category_name: e.target.value })} />
        </Field>
        <Field label="Описание" error={errors.description} className="span-2">
          <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </Field>
        <div className="form-actions"><button className="btn btn-primary">Добавить категорию</button></div>
      </form>
    </section>
  )
}

function UsersTab() {
  const { user: me } = useAuth()
  const users = useLoad(() => api.users(), [])
  const [msg, setMsg] = useState<Msg>(null)

  async function toggleRole(id: number, role: 'admin' | 'member') {
    setMsg(null)
    try {
      await api.setRole(id, role === 'admin' ? 'member' : 'admin')
      await users.reload()
    } catch (e) {
      setMsg({ kind: 'error', text: (e as Error).message })
    }
  }

  return (
    <section className="section">
      <h2>Члены семьи</h2>
      <p className="muted small">Email виден только администратору, для управления аккаунтами.</p>
      {msg && <Alert kind={msg.kind}>{msg.text}</Alert>}
      <div className="table-wrap">
        <table>
          <thead><tr><th>Имя</th><th>Email</th><th>Роль</th><th /></tr></thead>
          <tbody>
            {users.data?.map((u) => (
              <tr key={u.user_id}>
                <td>{u.full_name}{u.user_id === me?.user_id && <span className="muted"> (вы)</span>}</td>
                <td className="muted">{u.email}</td>
                <td><span className={`badge badge-${u.role}`}>{u.role === 'admin' ? 'админ' : 'участник'}</span></td>
                <td className="actions">
                  <button className="btn btn-ghost btn-sm" onClick={() => toggleRole(u.user_id, u.role)}>
                    {u.role === 'admin' ? 'Сделать участником' : 'Сделать админом'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
