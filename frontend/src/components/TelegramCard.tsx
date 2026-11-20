import { useState } from 'react'
import { api } from '../api/client'
import { useLoad } from '../lib/useLoad'
import { Alert } from './Field'
import { useToast } from './Feedback'

/** Profile card: connect a Telegram chat to get alerts when a category limit is close or exceeded. */
export function TelegramCard() {
  const status = useLoad(() => api.telegramStatus(), [])
  const toast = useToast()
  const [code, setCode] = useState<{ code: string; url: string | null } | null>(null)
  const s = status.data

  async function connect() {
    try {
      const res = await api.telegramLink()
      setCode(res)
      if (res.url) window.open(res.url, '_blank', 'noopener')
    } catch (e) {
      toast((e as Error).message, { kind: 'error' })
    }
  }

  async function sendExamples() {
    try {
      const res = await api.telegramTest()
      toast(`Отправлено примеров: ${res.sent}. Проверьте Telegram.`)
    } catch (e) {
      toast((e as Error).message, { kind: 'error' })
    }
  }

  async function disconnect() {
    await api.telegramUnlink()
    setCode(null)
    toast('Telegram отключён', { kind: 'info' })
    await status.reload()
  }

  return (
    <section className="section form-stack">
      <h2>Уведомления в Telegram</h2>
      <p className="muted small">
        Бот напишет, когда по категории потрачено 80% лимита и когда лимит превышен.
        Сообщения получают автор расхода и администраторы семьи. Бота можно добавить и в общий семейный чат:
        отправьте там <code>/start КОД</code>.
      </p>
      {status.error && <Alert>{status.error}</Alert>}
      {s && !s.enabled && <Alert kind="warning">Бот пока не настроен на сервере (нет TELEGRAM_BOT_TOKEN).</Alert>}
      {s?.enabled && (s.linked ? (
        <div className="row-gap">
          <span className="badge badge-ok">Подключено</span>
          <button className="btn btn-primary btn-sm" onClick={sendExamples}>Отправить примеры уведомлений</button>
          <button className="btn btn-ghost btn-sm" onClick={disconnect}>Отключить</button>
        </div>
      ) : (
        <>
          <button className="btn btn-primary" onClick={connect}>Подключить Telegram</button>
          {code && (
            <div className="tg-steps">
              <p>1. {code.url ? <a href={code.url} target="_blank" rel="noreferrer">Откройте бота</a> : 'Откройте бота'} и нажмите <b>Start</b>.</p>
              <p className="muted small">Или отправьте боту{s.bot_username ? ` @${s.bot_username}` : ''}: <code>/start {code.code}</code> (код действует 10 минут)</p>
              <p>2. <button className="link" onClick={() => void status.reload()}>Проверить подключение</button></p>
            </div>
          )}
        </>
      ))}
    </section>
  )
}
