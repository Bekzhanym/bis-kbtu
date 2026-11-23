import { useState } from 'react'
import { api } from '../api/client'
import type { Category, ImportRow } from '../api/types'
import { dateLabel, kzt } from '../lib/format'
import { Alert } from './Field'
import { useToast } from './Feedback'

type Row = ImportRow & { key: number }

/** Upload a Kaspi Gold PDF statement, check the rows, import the ticked ones in one go. */
export function KaspiImport({ categories, onDone }: { categories: Category[]; onDone: () => void }) {
  const toast = useToast()
  const [rows, setRows] = useState<Row[] | null>(null)
  const [income, setIncome] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const active = categories.filter((c) => c.is_active)

  async function upload(file: File | undefined) {
    if (!file) return
    setError(null)
    if (file.size > 5 * 1024 * 1024) return setError('Файл больше 5 МБ')
    setBusy(true)
    try {
      const res = await api.importKaspi(file)
      setRows(res.rows.map((r, key) => ({ ...r, key })))
      setIncome(res.skipped_income)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const update = (key: number, patch: Partial<Row>) =>
    setRows((all) => all?.map((r) => (r.key === key ? { ...r, ...patch } : r)) ?? null)

  const chosen = rows?.filter((r) => r.selected) ?? []
  const missingCategory = chosen.filter((r) => !r.category_id).length

  async function save() {
    if (missingCategory) return setError(`Выберите категорию для ${missingCategory} отмеченных строк`)
    setBusy(true)
    try {
      const saved = await api.confirmImport(chosen.map((r) => ({
        category_id: r.category_id!, amount: r.amount, transaction_date: r.transaction_date,
        note: r.details || null,
      })))
      toast(`Импортировано расходов: ${saved.length}`)
      setRows(null)
      onDone()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="form-stack import-box">
      <p className="muted small">
        В приложении Kaspi: Kaspi Gold → Выписка → выберите период → Отправить PDF. Загрузите файл сюда.
        Сначала вы увидите список и сами решите, что импортировать: ничего не сохраняется без подтверждения.
      </p>
      {error && <Alert>{error}</Alert>}
      <label className="btn btn-ghost file-btn">
        {busy && !rows ? 'Читаем выписку…' : 'Выбрать PDF-выписку'}
        <input type="file" accept="application/pdf,.pdf" hidden disabled={busy}
          onChange={(e) => { void upload(e.target.files?.[0]); e.target.value = '' }} />
      </label>

      {rows && (
        <>
          <p className="small">
            Найдено расходов: <b>{rows.length}</b>{income > 0 && `, пополнения пропущены: ${income}`}.
            Отмечено: <b>{chosen.length}</b> на {kzt(chosen.reduce((s, r) => s + Number(r.amount), 0))}.
          </p>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th /><th>Дата</th><th>Описание</th><th>Категория</th><th className="num">Сумма</th></tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.key} className={r.selected ? '' : 'row-muted'}>
                    <td><input type="checkbox" className="check" checked={r.selected}
                      aria-label={`Импортировать ${r.details}`} onChange={(e) => update(r.key, { selected: e.target.checked })} /></td>
                    <td>{dateLabel(r.transaction_date)}</td>
                    <td>
                      {r.details || r.operation}
                      <span className="muted small"> · {r.operation}</span>
                      {r.duplicate && <span className="badge badge-bad"> уже есть</span>}
                    </td>
                    <td>
                      <select value={r.category_id ?? ''} onChange={(e) => update(r.key, { category_id: e.target.value ? Number(e.target.value) : null })}>
                        <option value="">— выберите —</option>
                        {active.map((c) => <option key={c.category_id} value={c.category_id}>{c.category_name}</option>)}
                      </select>
                    </td>
                    <td className="num">{kzt(r.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="form-actions">
            <button className="btn btn-primary" disabled={busy || chosen.length === 0} onClick={save}>
              {busy ? 'Импорт…' : `Импортировать ${chosen.length}`}
            </button>
            <button className="btn btn-ghost" onClick={() => setRows(null)}>Отмена</button>
          </div>
        </>
      )}
    </div>
  )
}
