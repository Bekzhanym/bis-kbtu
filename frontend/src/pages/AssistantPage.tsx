import { useEffect, useRef, useState, type FormEvent } from 'react'
import { api } from '../api/client'
import { Alert } from '../components/Field'
import { useLoad } from '../lib/useLoad'

type Msg = { role: 'user' | 'assistant' | 'error'; text: string }

const SUGGESTIONS = [
  'Где я перерасходую в этом месяце?',
  'Сколько можно ещё потратить до конца месяца?',
  'Сравни этот месяц с прошлым',
  'Как сэкономить на еде?',
]

/** Chat with the AI assistant. It sees only what you see in the app: family totals, limits and your own expenses. */
export function AssistantPage() {
  const status = useLoad(() => api.assistantStatus(), [])
  const [messages, setMessages] = useState<Msg[]>([])
  const [question, setQuestion] = useState('')
  const [busy, setBusy] = useState(false)
  const end = useRef<HTMLDivElement>(null)

  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }) }, [messages, busy])

  async function send(text: string) {
    const q = text.trim()
    if (q.length < 2 || busy) return
    setMessages((m) => [...m, { role: 'user', text: q }])
    setQuestion('')
    setBusy(true)
    try {
      const res = await api.ask(q)
      setMessages((m) => [...m, { role: 'assistant', text: res.answer }])
    } catch (e) {
      setMessages((m) => [...m, { role: 'error', text: (e as Error).message }])
    } finally {
      setBusy(false)
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    void send(question)
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Помощник</h1>
          <p className="muted">ИИ отвечает по данным вашей семьи: итоги, лимиты и ваши расходы. Email и заметки ему не передаются.</p>
        </div>
      </div>
      {status.data && !status.data.enabled && (
        <Alert kind="warning">ИИ-помощник ещё не настроен на сервере: нужен GEMINI_API_KEY.</Alert>
      )}

      <section className="section chat">
        {messages.length === 0 && (
          <div className="chat-empty">
            <p className="muted">Спросите что-нибудь о бюджете или выберите вопрос:</p>
            <div className="chips">
              {SUGGESTIONS.map((s) => (
                <button key={s} className="chip" onClick={() => void send(s)} disabled={busy}>{s}</button>
              ))}
            </div>
          </div>
        )}
        <div className="chat-log" aria-live="polite">
          {messages.map((m, i) => (
            <div key={i} className={`bubble bubble-${m.role}`}>{m.text}</div>
          ))}
          {busy && <div className="bubble bubble-assistant typing" aria-label="Помощник думает"><span /><span /><span /></div>}
          <div ref={end} />
        </div>
        <form className="chat-form" onSubmit={submit}>
          <input value={question} maxLength={500} placeholder="Например: на что уходит больше всего?"
            onChange={(e) => setQuestion(e.target.value)} aria-label="Вопрос помощнику" />
          <button className="btn btn-primary" disabled={busy || question.trim().length < 2}>Спросить</button>
        </form>
        <p className="muted small">Ответы ИИ могут быть неточными: проверяйте цифры в отчёте.</p>
      </section>
    </>
  )
}
