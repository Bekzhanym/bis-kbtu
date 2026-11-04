import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { Alert, ProgressPanel } from '../components/Field'
import { MonthPicker } from '../components/MonthPicker'
import { TransactionForm } from '../components/TransactionForm'
import { dateLabel, kzt, monthStart } from '../lib/format'
import { useLoad } from '../lib/useLoad'
import { useMonth } from '../lib/useMonth'

export function DashboardPage() {
  const { user } = useAuth()
  const [month, setMonth] = useMonth()
  const report = useLoad(() => api.monthlyReport(monthStart(month)), [month])
  const recent = useLoad(() => api.transactions({ month: monthStart(month) }), [month])
  const categories = useLoad(() => api.categories(), [])

  const r = report.data
  const over = r?.categories.filter((c) => c.over_limit) ?? []
  const remaining = r ? Number(r.total_limit) - Number(r.total_spent) : 0

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Привет, {user?.full_name.split(' ')[0]}</h1>
          <p className="muted">Сводка семейного бюджета за месяц</p>
        </div>
        <MonthPicker value={month} onChange={setMonth} />
      </div>

      <div className="with-aside">
        <div className="content">
          {report.error && <Alert>{report.error}</Alert>}
          {over.map((c) => (
            <Alert kind="warning" key={c.category_id}>
              Лимит по категории <b>{c.category_name}</b> превышен на {kzt(-Number(c.remaining))}
            </Alert>
          ))}

          <section className="section">
            <h2>Добавить расход</h2>
            {categories.data && (
              <TransactionForm categories={categories.data} onSubmit={async (data) => {
                await api.createTransaction(data)
                await Promise.all([report.reload(), recent.reload()])
              }} />
            )}
          </section>

          {r && (
            <section className="section">
              <div className="card-head">
                <h2>Лимиты по категориям</h2>
                <Link to={`/report?month=${month}`}>Полный отчёт</Link>
              </div>
              <div className="bars">
                {r.categories.map((c) => {
                  const pct = c.monthly_limit ? Math.min(100, (Number(c.spent) / Number(c.monthly_limit)) * 100) : 0
                  return (
                    <div key={c.category_id}>
                      <div className="bar-label"><b>{c.category_name}</b>
                        <span className="muted">{kzt(c.spent)} из {c.monthly_limit ? kzt(c.monthly_limit) : 'без лимита'}</span>
                      </div>
                      <div className="bar"><div className={`bar-fill ${c.over_limit ? 'bad' : pct > 80 ? 'warn' : ''}`} style={{ width: `${pct}%` }} /></div>
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          <section className="section">
            <div className="card-head">
              <h2>Мои расходы за месяц</h2>
              <Link to={`/transactions?month=${month}`}>Все расходы</Link>
            </div>
            {recent.data?.length === 0 && <p className="muted">В этом месяце расходов нет.</p>}
            <ul className="list">
              {recent.data?.slice(0, 6).map((t) => (
                <li key={t.transaction_id}>
                  <div>
                    <b>{t.category_name}</b>
                    <span className="muted small">{dateLabel(t.transaction_date)}{t.note ? ` · ${t.note}` : ''}</span>
                  </div>
                  <span className="amount">{kzt(t.amount)}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <ProgressPanel title="Ваш бюджет" sub="(за месяц)" rows={[
          { label: 'Потрачено семьёй', value: kzt(r?.total_spent) },
          { label: 'Мои расходы', value: kzt(r?.my_spent) },
          { label: 'Сумма лимитов', value: kzt(r?.total_limit) },
          { label: 'Остаток', value: r ? kzt(remaining) : '—', strong: true, bad: remaining < 0 },
        ]} />
      </div>
    </>
  )
}
