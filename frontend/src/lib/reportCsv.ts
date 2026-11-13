import type { MonthlyReport } from '../api/types'

export function monthlyReportCsv(report: MonthlyReport): string {
  const header = 'Категория,Потрачено (₸),Лимит (₸),Остаток (₸)'
  const rows = report.categories.map(({ category_name, spent, monthly_limit, remaining }) => {
    // Keep user-entered names from being interpreted as spreadsheet formulas.
    const name = /^[\s\p{Cf}]*[=+\-@]|^[\t\r\n]/u.test(category_name) ? `'${category_name}` : category_name
    return [`"${name.replaceAll('"', '""')}"`, spent, monthly_limit ?? '', remaining ?? ''].join(',')
  })
  return '\uFEFF' + [header, ...rows].join('\r\n') + '\r\n'
}

export function downloadMonthlyReport(report: MonthlyReport) {
  const file = new Blob([monthlyReportCsv(report)], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(file)
  const link = document.createElement('a')
  link.href = url
  link.download = `family-budget-${report.month_start.slice(0, 7)}.csv`
  document.body.append(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
