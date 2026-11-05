import { useState, type FormEvent } from 'react'
import { api } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { Alert, Field } from '../components/Field'
import { hasErrors, validatePasswordChange, validateProfile, type Errors } from '../lib/validation'

type Msg = { kind: 'success' | 'error'; text: string } | null

export function ProfilePage() {
  const { user, setUser } = useAuth()
  const [profile, setProfile] = useState({ full_name: user?.full_name ?? '', email: user?.email ?? '' })
  const [pErrors, setPErrors] = useState<Errors>({})
  const [pMsg, setPMsg] = useState<Msg>(null)

  const [pwd, setPwd] = useState({ current: '', next: '', confirm: '' })
  const [wErrors, setWErrors] = useState<Errors>({})
  const [wMsg, setWMsg] = useState<Msg>(null)

  async function saveProfile(e: FormEvent) {
    e.preventDefault()
    setPMsg(null)
    const errs = validateProfile(profile)
    setPErrors(errs)
    if (hasErrors(errs)) return
    try {
      const u = await api.updateMe({ full_name: profile.full_name.trim(), email: profile.email.trim().toLowerCase() })
      setUser(u)
      setProfile({ full_name: u.full_name, email: u.email })
      setPMsg({ kind: 'success', text: 'Профиль обновлён' })
    } catch (err) {
      setPMsg({ kind: 'error', text: (err as Error).message })
    }
  }

  async function changePassword(e: FormEvent) {
    e.preventDefault()
    setWMsg(null)
    const errs = validatePasswordChange(pwd)
    setWErrors(errs)
    if (hasErrors(errs)) return
    try {
      await api.changePassword(pwd.current, pwd.next)
      setPwd({ current: '', next: '', confirm: '' })
      setWMsg({ kind: 'success', text: 'Пароль изменён' })
    } catch (err) {
      setWMsg({ kind: 'error', text: (err as Error).message })
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Профиль</h1>
          <p className="muted">Роль: <span className={`badge badge-${user?.role}`}>{user?.role === 'admin' ? 'администратор' : 'участник'}</span></p>
        </div>
      </div>
      <div className="grid-2">
        <form className="section form-stack" onSubmit={saveProfile} noValidate>
          <h2>Личные данные</h2>
          {pMsg && <Alert kind={pMsg.kind}>{pMsg.text}</Alert>}
          <Field label="Имя и фамилия" error={pErrors.full_name}>
            <input value={profile.full_name} onChange={(e) => setProfile({ ...profile, full_name: e.target.value })} />
          </Field>
          <Field label="Email" error={pErrors.email} hint="Ваш email видят только вы и администратор">
            <input type="email" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} />
          </Field>
          <button className="btn btn-primary">Сохранить</button>
        </form>

        <form className="section form-stack" onSubmit={changePassword} noValidate>
          <h2>Смена пароля</h2>
          {wMsg && <Alert kind={wMsg.kind}>{wMsg.text}</Alert>}
          <Field label="Текущий пароль" error={wErrors.current}>
            <input type="password" autoComplete="current-password" value={pwd.current} onChange={(e) => setPwd({ ...pwd, current: e.target.value })} />
          </Field>
          <Field label="Новый пароль" error={wErrors.next} hint="Минимум 8 символов, буквы и цифры">
            <input type="password" autoComplete="new-password" value={pwd.next} onChange={(e) => setPwd({ ...pwd, next: e.target.value })} />
          </Field>
          <Field label="Повторите новый пароль" error={wErrors.confirm}>
            <input type="password" autoComplete="new-password" value={pwd.confirm} onChange={(e) => setPwd({ ...pwd, confirm: e.target.value })} />
          </Field>
          <button className="btn btn-primary">Изменить пароль</button>
        </form>
      </div>
    </>
  )
}
