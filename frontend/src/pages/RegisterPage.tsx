import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { Alert, Field } from '../components/Field'
import { Header } from '../components/Layout'
import { useI18n } from '../lib/i18n'
import { hasErrors, validateRegister, type Errors } from '../lib/validation'

export function RegisterPage() {
  const { t } = useI18n()
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ full_name: '', email: '', password: '', confirm: '' })
  const [errors, setErrors] = useState<Errors>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value })

  async function submit(e: FormEvent) {
    e.preventDefault()
    setServerError(null)
    const errs = validateRegister(form)
    setErrors(errs)
    if (hasErrors(errs)) return
    setBusy(true)
    try {
      await register(form.full_name, form.email, form.password)
      navigate('/', { replace: true })
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
        <h1>{t('register.title')}</h1>
        <p className="muted">{t('register.subtitle')}</p>
        {serverError && <Alert>{serverError}</Alert>}
        <Field label={t('register.name')} error={errors.full_name}>
          <input autoComplete="name" value={form.full_name} onChange={set('full_name')} />
        </Field>
        <Field label="Email" error={errors.email}>
          <input type="email" autoComplete="email" value={form.email} onChange={set('email')} />
        </Field>
        <Field label={t('register.password')} error={errors.password} hint={t('register.passwordHint')}>
          <input type="password" autoComplete="new-password" value={form.password} onChange={set('password')} />
        </Field>
        <Field label={t('register.confirm')} error={errors.confirm}>
          <input type="password" autoComplete="new-password" value={form.confirm} onChange={set('confirm')} />
        </Field>
        <button className="btn btn-primary btn-block" disabled={busy}>{busy ? t('register.busy') : t('register.submit')}</button>
        <p className="muted center">{t('register.haveAccount')} <Link to="/login">{t('register.login')}</Link></p>
      </form>
    </div>
    </>
  )
}
