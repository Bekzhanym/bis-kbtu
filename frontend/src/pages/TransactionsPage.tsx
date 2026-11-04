import { useState } from 'react'
import { api } from '../api/client'
import type { Transaction } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { Alert, Field, MoneyInput } from '../components/Field'
import { MonthPicker } from '../components/MonthPicker'
import { SplitForm } from '../components/SplitForm'
import { TransactionForm } from '../components/TransactionForm'
import { dateLabel, kzt, monthStart } from '../lib/format'
import { useLoad } from '../lib/useLoad'
import { useMonth } from '../lib/useMonth'
import { normalizeAmount, validateAmount } from '../lib/validation'

type Mode = 'none' | 'add' | 'split'

export function TransactionsPage() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const [month, setMonth] = useMonth()
  const [scope, setScope] = useState<'mine' | 'all'>('mine')
  const [categoryId, setCategoryId] = useState('')
  const [minAmount, setMinAmount] = useState('')
  const [mode, setMode] = useState<Mode>('none')
  const [editing, setEditing] = useState<number | null>(null)
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)

  const minError = minAmount && validateAmount(minAmount) ? 'Введите положительное число' : undefined
  const categories = useLoad(() => api.categories(), [])
  const list = useLoad(
    () => api.transactions({
      scope, month: monthStart(month),
      category_id: categoryId ? Number(categoryId) : undefined,
      min_amount: minAmount && !minError ? normalizeAmount(minAmount) : undefined,
    }),
    [scope, month, categoryId, minAmount],
  )

  const rows = list.data ?? []
  const total = rows.reduce((s, t) => s + Number(t.amount), 0)

  async function remove(t: Transaction) {
    if (!confirm(`Удалить расход ${kzt(t.amount)} (${t.category_name})?`)) return
    try {
      await api.deleteTransaction(t.transaction_id)
      setMessage({ kind: 'success', text: 'Расход удалён' })
      await list.reload()
    } catch (e) {
      setMessage({ kind: 'error', text: (e as Error).message })
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Расходы</h1>
          <p className="muted">{scope === 'mine' ? 'Ваши расходы. Заметки видны только вам.' : 'Все расходы семьи. Чужие заметки скрыты.'}</p>
        </div>
        <div className="row-gap">
          <button className={`btn ${mode === 'add' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setMode(mode === 'add' ? 'none' : 'add')}>+ Расход</button>
          <button className={`btn ${mode === 'split' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setMode(mode === 'split' ? 'none' : 'split')}>Разделить чек</button>
        </div>
      </div>

      {message && <Alert kind={message.kind}>{message.text}</Alert>}

      {mode === 'add' && categories.data && (
        <section className="section">
          <h2>Новый расход</h2>
          <TransactionForm categories={categories.data} onCancel={() => setMode('none')} onSubmit={async (d) => {
            await api.createTransaction(d)
            setMessage({ kind: 'success', text: 'Расход сохранён' })
            await list.reload()
          }} />
        </section>
      )}
      {mode === 'split' && categories.data && (
        <section className="section">
          <h2>Разделить чек на категории</h2>
          <p className="muted small">Все части сохраняются одной транзакцией: если одна не пройдёт проверку, не сохранится ни одна.</p>
          <SplitForm categories={categories.data} onSubmit={async (items) => {
            await api.createSplit(items)
            setMessage({ kind: 'success', text: `Чек сохранён: ${items.length} записи` })
            setMode('none')
            await list.reload()
          }} />
        </section>
      )}

      <section className="section">
        <div className="filters">
          <MonthPicker value={month} onChange={setMonth} />
          <Field label="Категория">
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">Все</option>
              {categories.data?.map((c) => <option key={c.category_id} value={c.category_id}>{c.category_name}</option>)}
            </select>
          </Field>
          <Field label="Сумма больше" error={minError}>
            <MoneyInput placeholder="10000" value={minAmount} onChange={(e) => setMinAmount(e.target.value)} />
          </Field>
          {isAdmin && (
            <Field label="Показать">
              <select value={scope} onChange={(e) => setScope(e.target.value as 'mine' | 'all')}>
                <option value="mine">Мои</option>
                <option value="all">Вся семья</option>
              </select>
            </Field>
          )}
        </div>

        {list.error && <Alert>{list.error}</Alert>}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Дата</th>
                {scope === 'all' && <th>Кто</th>}
                <th>Категория</th>
                <th>Заметка</th>
                <th className="num">Сумма</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => editing === t.transaction_id && categories.data ? (
                <tr key={t.transaction_id}>
                  <td colSpan={scope === 'all' ? 6 : 5}>
                    <TransactionForm categories={categories.data} initial={t} submitLabel="Сохранить"
                      onCancel={() => setEditing(null)}
                      onSubmit={async (d) => {
                        await api.updateTransaction(t.transaction_id, d)
                        setEditing(null)
                        setMessage({ kind: 'success', text: 'Изменения сохранены' })
                        await list.reload()
                      }} />
                  </td>
                </tr>
              ) : (
                <tr key={t.transaction_id}>
                  <td>{dateLabel(t.transaction_date)}</td>
                  {scope === 'all' && <td>{t.user_full_name}</td>}
                  <td>{t.category_name}</td>
                  <td className="muted">{t.is_mine ? t.note ?? '' : '🔒'}</td>
                  <td className="num">{kzt(t.amount)}</td>
                  <td className="actions">
                    {t.is_mine && (
                      <>
                        <button className="btn btn-ghost btn-sm" onClick={() => setEditing(t.transaction_id)}>Изменить</button>
                        <button className="btn btn-danger btn-sm" onClick={() => remove(t)}>Удалить</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
              {!list.loading && rows.length === 0 && (
                <tr><td colSpan={6} className="muted center">Ничего не найдено</td></tr>
              )}
            </tbody>
            {rows.length > 0 && (
              <tfoot>
                <tr><td colSpan={scope === 'all' ? 4 : 3}>Итого: {rows.length} записей</td><td className="num">{kzt(total)}</td><td /></tr>
              </tfoot>
            )}
          </table>
        </div>
      </section>
    </>
  )
}
