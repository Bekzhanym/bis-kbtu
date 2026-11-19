import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { LanguageSwitcher, useI18n } from '../lib/i18n'

export function Header() {
  const { user, logout } = useAuth()
  const { t } = useI18n()
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <NavLink to="/" className="brand">
          Family Budget
        </NavLink>
        <div className="user-box">
          <LanguageSwitcher />
          {user && (
            <>
              <NavLink to="/profile" className="user-name">{user.full_name}</NavLink>
              <button className="topbar-btn" onClick={logout}>{t('header.logout')}</button>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

export function Layout() {
  const { user } = useAuth()
  const { t } = useI18n()
  const links = [
    { to: '/', icon: '🏠', label: t('nav.home'), end: true },
    { to: '/transactions', icon: '🧾', label: t('nav.transactions') },
    { to: '/report', icon: '📊', label: t('nav.report') },
    ...(user?.role === 'admin' ? [{ to: '/admin', icon: '⚙️', label: t('nav.admin') }] : []),
    { to: '/profile', icon: '👤', label: t('nav.profile') },
  ]
  return (
    <div className="app">
      <Header />
      <div className="container">
        <p className="app-title">{t('app.title')}</p>
        {/* desktop: tabs under the title; mobile: the same links as a bottom bar */}
        <nav className="tabs-nav">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end}>
              <span className="nav-icon" aria-hidden>{l.icon}</span>
              <span className="nav-label">{l.label}</span>
            </NavLink>
          ))}
        </nav>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
