import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

export function Header() {
  const { user, logout } = useAuth()
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <NavLink to="/" className="brand">
          Family Budget
        </NavLink>
        {user && (
          <div className="user-box">
            <NavLink to="/profile" className="user-name">{user.full_name}</NavLink>
            <button className="topbar-btn" onClick={logout}>Выйти</button>
          </div>
        )}
      </div>
    </header>
  )
}

export function Layout() {
  const { user } = useAuth()
  return (
    <div className="app">
      <Header />
      <div className="container">
        <p className="app-title">Семейный бюджет</p>
        <nav className="tabs-nav">
          <NavLink to="/" end>Главная</NavLink>
          <NavLink to="/transactions">Расходы</NavLink>
          <NavLink to="/report">Отчёт</NavLink>
          {user?.role === 'admin' && <NavLink to="/admin">Управление</NavLink>}
          <NavLink to="/profile">Профиль</NavLink>
        </nav>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
