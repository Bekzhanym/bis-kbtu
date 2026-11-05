import { api } from '../api/client'
import { Alert, ProgressPanel } from '../components/Field'
import { MonthPicker } from '../components/MonthPicker'
import { kzt, monthStart } from '../lib/format'
import { useLoad } from '../lib/useLoad'
import { useMonth } from '../lib/useMonth'

export function ReportPage() {
  const [month, setMonth] = useMonth()
  const report = useLoad(() => api.monthlyReport(monthStart(month)), [month])
  const r = report.data

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Месячный отчёт</h1>
          <p className="muted">Общие итоги семьи. Email и заметки в отчёт не попадают.</p>
        </div>
        <MonthPicker value={month} onChange={setMonth} />
      </div>
      {report.error && <Alert>{report.error}</Alert>}

      {r && (
        <div className="with-aside">
        <div className="content">
          <section className="section">
            <h2>По категориям</h2>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Категория</th><th className="num">Потрачено</th><th className="num">Лимит</th><th className="num">Остаток</th><th>Использовано</th></tr>
                </thead>
                <tbody>
                  {r.categories.map((c) => {
                    const pct = c.monthly_limit ? (Number(c.spent) / Number(c.monthly_limit)) * 100 : null
                    return (
                      <tr key={c.category_id} className={c.over_limit ? 'row-bad' : ''}>
                        <td>{c.category_name}</td>
                        <td className="num">{kzt(c.spent)}</td>
                        <td className="num">{kzt(c.monthly_limit)}</td>
                        <td className="num">{kzt(c.remaining)}</td>
                        <td>
                          {pct === null ? <span className="badge">без лимита</span> : (
                            <div className="usage">
                              <div className="bar small-bar"><div className={`bar-fill ${c.over_limit ? 'bad' : pct > 80 ? 'warn' : ''}`} style={{ width: `${Math.min(100, pct)}%` }} /></div>
                              <span className={c.over_limit ? 'badge badge-bad' : 'badge badge-ok'}>{Math.round(pct)}%</span>
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section className="section">
            <h2>По членам семьи</h2>
            {r.members.length === 0 ? <p className="muted">В этом месяце расходов нет.</p> : (
              <ul className="list">
                {r.members.map((m) => (
                  <li key={m.user_id}>
                    <b>{m.full_name}</b>
                    <span className="amount">{kzt(m.spent)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
        <ProgressPanel title="Итоги" sub="(за месяц)" rows={[
          { label: 'Потрачено', value: kzt(r.total_spent) },
          { label: 'Сумма лимитов', value: kzt(r.total_limit) },
          { label: 'Превышений', value: String(r.categories.filter((c) => c.over_limit).length), bad: r.categories.some((c) => c.over_limit) },
          { label: 'Остаток', value: kzt(Number(r.total_limit) - Number(r.total_spent)), strong: true, bad: Number(r.total_spent) > Number(r.total_limit) },
        ]} />
        </div>
      )}
    </>
  )
}
