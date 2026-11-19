import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { Alert, Field } from '../components/Field'
import { Header } from '../components/Layout'
import { useI18n } from '../lib/i18n'
import { hasErrors, validateLogin, type Errors } from '../lib/validation'

export function LoginPage() {
  const { login } = useAuth()
  const { t } = useI18n()
  const navigate = useNavigate()
  const from = (useLocation().state as { from?: string } | null)?.from ?? '/'
  const [form, setForm] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState<Errors>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setServerError(null)
    const errs = validateLogin(form)
    setErrors(errs)
    if (hasErrors(errs)) return
    setBusy(true)
    try {
      await login(form.email, form.password)
      navigate(from, { replace: true })
    } catch (err) {
      setServerError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
    <Header />
    <div className="auth-page">
      <form className="form-stack" onSubmit={submit} noValidate>
        <h1>{t('login.title')}</h1>
        <p className="muted">{t('login.subtitle')}</p>
        {serverError && <Alert>{serverError}</Alert>}
        <Field label="Email" error={errors.email}>
          <input type="email" autoComplete="email" value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </Field>
        <Field label={t('login.password')} error={errors.password}>
          <input type="password" autoComplete="current-password" value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </Field>
        <button className="btn btn-primary btn-block" disabled={busy}>{busy ? t('login.busy') : t('login.submit')}</button>
        <p className="muted center">{t('login.noAccount')} <Link to="/register">{t('login.register')}</Link></p>
        <details className="demo-hint">
          <summary>{t('login.demo')}</summary>
          <p>{t('login.demoPassword')} <code>demo12345</code></p>
          <ul>
            <li><button type="button" className="link" onClick={() => setForm({ email: 'alex.sebelev@example.com', password: 'demo12345' })}>alex.sebelev@example.com</button> ({t('role.admin')})</li>
            <li><button type="button" className="link" onClick={() => setForm({ email: 'dana.m@example.com', password: 'demo12345' })}>dana.m@example.com</button> ({t('role.member')})</li>
          </ul>
        </details>
      </form>
    </div>
    </>
  )
}
