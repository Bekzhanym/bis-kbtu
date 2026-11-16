import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'

// ---------- toasts: short messages in the corner instead of alerts above the page ----------
type ToastKind = 'success' | 'error' | 'info'
type ToastAction = { label: string; onClick: () => void }
type Toast = { id: number; kind: ToastKind; text: string; action?: ToastAction }
type ShowToast = (text: string, opts?: { kind?: ToastKind; action?: ToastAction; ms?: number }) => void

const ToastContext = createContext<ShowToast>(() => {})

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(1)

  const close = useCallback((id: number) => setToasts((all) => all.filter((t) => t.id !== id)), [])

  const show = useCallback<ShowToast>((text, { kind = 'success', action, ms = 4000 } = {}) => {
    const id = nextId.current++
    setToasts((all) => [...all.slice(-2), { id, kind, text, action }]) // keep at most 3 on screen
    window.setTimeout(() => close(id), ms)
  }, [close])

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="toasts" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.kind}`} role={t.kind === 'error' ? 'alert' : 'status'}>
            <span>{t.text}</span>
            {t.action && (
              <button className="toast-action" onClick={() => { t.action!.onClick(); close(t.id) }}>{t.action.label}</button>
            )}
            <button className="toast-close" aria-label="Закрыть" onClick={() => close(t.id)}>×</button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useToast = () => useContext(ToastContext)

// ---------- loading placeholders ----------
export function Skeleton({ rows = 3, height = 18 }: { rows?: number; height?: number }) {
  return (
    <div className="skeleton-group" aria-busy="true" aria-label="Загрузка">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="skeleton" style={{ height, width: `${92 - i * 14}%` }} />
      ))}
    </div>
  )
}

// ---------- empty state with a next step ----------
export function EmptyState({ icon, title, text, action }: {
  icon: string
  title: string
  text?: string
  action?: ReactNode
}) {
  return (
    <div className="empty">
      <div className="empty-icon" aria-hidden>{icon}</div>
      <b>{title}</b>
      {text && <p className="muted small">{text}</p>}
      {action}
    </div>
  )
}
