import { useSearchParams } from 'react-router-dom'
import { currentMonth } from './format'

/** Selected month lives in the URL (?month=2026-10) so it survives reloads and links. */
export function useMonth(): [string, (m: string) => void] {
  const [params, setParams] = useSearchParams()
  const raw = params.get('month')
  const month = raw && /^\d{4}-\d{2}$/.test(raw) ? raw : currentMonth()
  const setMonth = (m: string) => {
    const next = new URLSearchParams(params)
    next.set('month', m)
    setParams(next, { replace: true })
  }
  return [month, setMonth]
}
