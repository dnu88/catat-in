import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@store/auth.store'

type NavSectionItem = {
  section: string
}

type NavLinkItem = {
  to: string
  icon: string
  label: string
  badge?: string
}

const NAV_ITEMS: Array<NavSectionItem | NavLinkItem> = [
  { section: 'Menu utama' },
  { to: '/dashboard', icon: '🏠', label: 'Dashboard' },
  { to: '/transactions', icon: '📋', label: 'Transaksi' },
  { to: '/budgets', icon: '🎯', label: 'Anggaran' },
  { to: '/reports', icon: '📊', label: 'Laporan' },
  { to: '/bills', icon: '🔔', label: 'Tagihan' },
  { section: 'Lainnya' },
  { to: '/groups', icon: '👥', label: 'Grup' },
  { to: '/imports', icon: '📥', label: 'Import' },
  { to: '/wallets', icon: '💳', label: 'Dompet' },
  { to: '/settings', icon: '⚙️', label: 'Pengaturan' },
]

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 11) return 'Selamat pagi'
  if (hour < 15) return 'Selamat siang'
  if (hour < 18) return 'Selamat sore'
  return 'Selamat malam'
}

function formatDate(): string {
  return new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export default function AppLayout() {
  const { user, signOut, isLoading } = useAuthStore()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleSignOut = async () => {
    try {
      await signOut()
    } finally {
      navigate('/login', { replace: true })
    }
  }

  const userName = user?.full_name || user?.email || 'Pengguna'
  const initials = getInitials(userName)

  return (
    <div className="app-shell">
      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            zIndex: 35,
          }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <div className="sidebar-logo-mark">💰</div>
          <div>
            <div className="sidebar-logo-text">Catat.in</div>
            <div className="sidebar-logo-sub">Keuangan Pribadi</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item, index) => {
            if ('section' in item) {
              return (
                <div key={index} className="nav-section-label">
                  {item.section}
                </div>
              )
            }

            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                onClick={() => setSidebarOpen(false)}
              >
                <span className="nav-item-icon">{item.icon}</span>
                <span>{item.label}</span>
                {'badge' in item ? <span className="nav-badge">{item.badge}</span> : null}
              </NavLink>
            )
          })}
        </nav>

        <div className="sidebar-bottom">
          <div className="user-avatar">{initials}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              className="user-name"
              style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
            >
              {userName}
            </div>
            <div className="user-plan-badge">
              {user?.plan_type === 'premium' ? 'Premium' : 'Free plan'}
            </div>
          </div>
          <button
            onClick={handleSignOut}
            disabled={isLoading}
            className="btn btn-danger"
            style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
            title="Keluar"
          >
            <span>↪</span> {isLoading ? 'Keluar...' : 'Keluar'}
          </button>
        </div>
      </aside>

      <div className="main-content">
        <header className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              className="mobile-menu-btn btn btn-secondary"
              style={{ padding: '6px 10px' }}
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              ☰
            </button>
            <div>
              <div className="topbar-title">
                {getGreeting()}, {user?.full_name?.split(' ')[0] || 'Pengguna'} 👋
              </div>
              <div className="topbar-sub">{formatDate()}</div>
            </div>
          </div>
          <div className="topbar-actions">
            <button className="btn btn-secondary">🔔 Notifikasi</button>
            <button className="btn btn-primary" onClick={() => navigate('/capture')}>
              ＋ Tambah transaksi
            </button>
          </div>
        </header>

        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
