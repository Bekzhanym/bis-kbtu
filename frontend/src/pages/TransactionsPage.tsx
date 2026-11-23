import { useMemo, useState } from 'react'
import { useI18n } from '../lib/i18n'
import { api } from '../api/client'
import type { Transaction } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { Alert, Field, MoneyInput } from '../components/Field'
import { EmptyState, Skeleton, useToast } from '../components/Feedback'
import { categoryIcon } from '../lib/categories'
import { MonthPicker } from '../components/MonthPicker'
import { KaspiImport } from '../components/KaspiImport'
import { RecurringSection } from '../components/RecurringSection'
import { SplitForm } from '../components/SplitForm'
import { TransactionForm } from '../components/TransactionForm'
import { SORT_LABELS, matchesSearch, sortTransactions, validateRange, type Sort } from '../lib/filters'
import { dateLabel, kzt, monthStart } from '../lib/format'
import { useLoad } from '../lib/useLoad'
import { useMonth } from '../lib/useMonth'
import { normalizeAmount, validateAmount } from '../lib/validation'

type Mode = 'none' | 'add' | 'split' | 'import'

export function TransactionsPage() {
  const { t } = useI18n()
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const [month, setMonth] = useMonth()
  const [scope, setScope] = useState<'mine' | 'all'>('mine')
  const [categoryId, setCategoryId] = useState('')
  const [minAmount, setMinAmount] = useState('')
  const [maxAmount, setMaxAmount] = useState('')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<Sort>('date_desc')
  const [mode, setMode] = useState<Mode>('none')
  const [editing, setEditing] = useState<number | null>(null)
  const toast = useToast()

  const minError = minAmount && validateAmount(minAmount) ? 'Введите положительное число' : undefined
  const maxError = (maxAmount && validateAmount(maxAmount) ? 'Введите положительное число' : undefined)
    ?? (!minError ? validateRange(normalizeAmount(minAmount), normalizeAmount(maxAmount)) : undefined)
  const min = minAmount && !minError ? normalizeAmount(minAmount) : undefined
  const max = maxAmount && !maxError ? normalizeAmount(maxAmount) : undefined
  const categories = useLoad(() => api.categories(), [])
  const list = useLoad(
    () => api.transactions({
      scope, month: monthStart(month),
      category_id: categoryId ? Number(categoryId) : undefined,
      min_amount: min, max_amount: max,
    }),
    [scope, month, categoryId, min, max],
  )

  // search and sort run in the browser on the loaded month
  const rows = useMemo(
    () => sortTransactions((list.data ?? []).filter((t) => matchesSearch(t, search)), sort),
    [list.data, search, sort],
  )
  const filtered = Boolean(categoryId || minAmount || maxAmount || search || sort !== 'date_desc')
  function resetFilters() {
    setCategoryId(''); setMinAmount(''); setMaxAmount(''); setSearch(''); setSort('date_desc')
  }
  const total = rows.reduce((s, t) => s + Number(t.amount), 0)

  // No "are you sure?" dialog: delete at once and offer "Undo" for 8 seconds instead
  async function remove(t: Transaction) {
    try {
      await api.deleteTransaction(t.transaction_id)
      toast(`Расход ${kzt(t.amount)} (${t.category_name}) удалён`, {
        ms: 8000,
        action: { label: 'Отменить', onClick: () => void restore(t) },
      })
      await list.reload()
    } catch (e) {
      toast((e as Error).message, { kind: 'error' })
    }
  }

  async function restore(t: Transaction) {
    try {
      await api.createTransaction({
        category_id: t.category_id, amount: t.amount, transaction_date: t.transaction_date, note: t.note,
      })
      toast('Расход восстановлен', { kind: 'info' })
      await list.reload()
    } catch (e) {
      toast((e as Error).message, { kind: 'error' })
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>{t('transactions.title')}</h1>
          <p className="muted">{scope === 'mine' ? t('transactions.mine') : t('transactions.all')}</p>
        </div>
        <div className="row-gap">
          <button className={`btn ${mode === 'add' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setMode(mode === 'add' ? 'none' : 'add')}>+ Расход</button>
          <button className={`btn ${mode === 'split' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setMode(mode === 'split' ? 'none' : 'split')}>Разделить чек</button>
          <button className={`btn ${mode === 'import' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setMode(mode === 'import' ? 'none' : 'import')}>Импорт из Kaspi</button>
        </div>
      </div>

      {mode === 'add' && categories.data && (
        <section className="section">
          <h2>Новый расход</h2>
          <TransactionForm categories={categories.data} existing={list.data ?? []} onCancel={() => setMode('none')} onSubmit={async (d) => {
            await api.createTransaction(d)
            toast('Расход сохранён')
            await list.reload()
          }} />
        </section>
      )}
      {mode === 'import' && categories.data && (
        <section className="section">
          <h2>Импорт выписки Kaspi Gold</h2>
          <KaspiImport categories={categories.data} onDone={() => { setMode('none'); void list.reload() }} />
        </section>
      )}
      {mode === 'split' && categories.data && (
        <section className="section">
          <h2>Разделить чек на категории</h2>
          <p className="muted small">Все части сохраняются одной транзакцией: если одна не пройдёт проверку, не сохранится ни одна.</p>
          <SplitForm categories={categories.data} onSubmit={async (items) => {
            await api.createSplit(items)
            toast(`Чек сохранён: ${items.length} записи`)
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
          <Field label="Сумма от" error={minError}>
            <MoneyInput placeholder="10000" value={minAmount} onChange={(e) => setMinAmount(e.target.value)} />
          </Field>
          <Field label="Сумма до" error={maxError}>
            <MoneyInput placeholder="50000" value={maxAmount} onChange={(e) => setMaxAmount(e.target.value)} />
          </Field>
          <Field label="Поиск">
            <input type="search" placeholder="Категория, заметка…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </Field>
          <Field label="Сортировка">
            <select value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
              {Object.entries(SORT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>
          {isAdmin && (
            <Field label="Показать">
              <select value={scope} onChange={(e) => setScope(e.target.value as 'mine' | 'all')}>
                <option value="mine">Мои</option>
                <option value="all">Вся семья</option>
              </select>
            </Field>
          )}
          {filtered && <button className="btn btn-ghost" onClick={resetFilters}>Сбросить</button>}
        </div>

        {list.error && <Alert>{list.error}</Alert>}
        <div className="table-wrap">
          <table className="stack-mobile">
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
                    <TransactionForm categories={categories.data} existing={list.data ?? []} initial={t} submitLabel="Сохранить"
                      onCancel={() => setEditing(null)}
                      onSubmit={async (d) => {
                        await api.updateTransaction(t.transaction_id, d)
                        setEditing(null)
                        toast('Изменения сохранены')
                        await list.reload()
                      }} />
                  </td>
                </tr>
              ) : (
                <tr key={t.transaction_id}>
                  <td data-label="Дата">{dateLabel(t.transaction_date)}</td>
                  {scope === 'all' && <td data-label="Кто">{t.user_full_name}</td>}
                  <td data-label="Категория" className="cell-title"><span className="cat-icon" aria-hidden>{categoryIcon(t.category_name)}</span>{t.category_name}</td>
                  <td data-label="Заметка" className={`muted ${t.is_mine && !t.note ? 'cell-empty' : ''}`}>{t.is_mine ? t.note ?? '' : '🔒'}</td>
                  <td data-label="Сумма" className="num cell-amount">{kzt(t.amount)}</td>
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
              {list.loading && !list.data && (
                <tr><td colSpan={6}><Skeleton rows={4} /></td></tr>
              )}
              {!list.loading && rows.length === 0 && (
                <tr><td colSpan={6}>
                  {filtered ? (
                    <EmptyState icon="🔍" title="Ничего не найдено" text="Попробуйте изменить или сбросить фильтры."
                      action={<button className="btn btn-ghost btn-sm" onClick={resetFilters}>Сбросить фильтры</button>} />
                  ) : (
                    <EmptyState icon="🧾" title="В этом месяце расходов нет" text="Добавьте первый расход, и он появится здесь."
                      action={<button className="btn btn-primary btn-sm" onClick={() => setMode('add')}>+ Добавить расход</button>} />
                  )}
                </td></tr>
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
      {categories.data && <RecurringSection categories={categories.data} onChanged={() => void list.reload()} />}
    </>
  )
}
