import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { apiConfigError } from '@lib/api'
import { supabase, supabaseConfigError, sessionReady } from '@lib/supabase'
import { useAuthStore } from '@store/auth.store'

import './index.css'

import AppLayout from '@components/AppLayout'
import LoginPage from '@pages/LoginPage'
import RegisterPage from '@pages/RegisterPage'
import ForgotPasswordPage from '@pages/ForgotPasswordPage'
import ResetPasswordPage from '@pages/ResetPasswordPage'
import DashboardPage from '@pages/DashboardPage'
import TransactionPage from '@pages/TransactionPage'
import WalletPage from '@pages/WalletPage'
import BudgetPage from '@pages/BudgetPage'
import BillsPage from '@pages/BillsPage'
import ReportsPage from '@pages/ReportsPage'
import SettingsPage from '@pages/SettingsPage'
import CapturePage from '@pages/CapturePage'
import GroupsPage from '@pages/GroupsPage'
import ImportsPage from '@pages/ImportsPage'

// Satu sumber kebenaran auth: apakah Supabase sudah selesai cek sesi awal.
let authResolved = false
let authSession = false

sessionReady.then((session) => {
  authSession = !!session
  authResolved = true
})

function useAuthReady(): { ready: boolean; hasSession: boolean } {
  const [ready, setReady] = useState(authResolved)
  const [hasSession, setHasSession] = useState(authSession)

  useEffect(() => {
    if (authResolved) {
      setReady(true)
      setHasSession(authSession)
      return
    }

    sessionReady.then((session) => {
      setReady(true)
      setHasSession(!!session)
    })
  }, [])

  // Tetap sinkron jika auth berubah setelah ready (login/logout)
  useEffect(() => {
    if (!supabaseConfigError) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setHasSession(!!session)
      })
      return () => subscription.unsubscribe()
    }
  }, [])

  return { ready, hasSession }
}

function FullscreenMessage({
  title,
  body,
  loading = false,
}: {
  title: string
  body: string
  loading?: boolean
}) {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        background: 'var(--bg-base)',
      }}
    >
      <div style={{ textAlign: 'center', maxWidth: '520px' }}>
        <div style={{ position: 'relative', width: '102px', height: '102px', margin: '0 auto 20px' }}>
          <div
            style={{
              position: 'absolute',
              inset: '-6px',
              borderRadius: '32px',
              border: '2px solid rgba(37, 99, 235, 0.08)',
              borderTopColor: 'rgba(37, 99, 235, 0.7)',
              borderRightColor: 'rgba(59, 130, 246, 0.38)',
              animation: loading ? 'loaderOrbit 1.2s linear infinite' : undefined,
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '24px',
              background: 'linear-gradient(135deg, #1E40AF, #2563EB 50%, #3B82F6)',
              boxShadow: '0 20px 40px rgba(37, 99, 235, 0.25)',
              animation: loading ? 'loaderFloat 1.8s ease-in-out infinite' : undefined,
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: '10px',
              borderRadius: '18px',
              background: 'rgba(255,255,255,0.14)',
              border: '1px solid rgba(255,255,255,0.22)',
              backdropFilter: 'blur(10px)',
              overflow: 'hidden',
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: '10px',
              borderRadius: '18px',
              background:
                'linear-gradient(120deg, transparent 10%, rgba(255,255,255,0.22) 30%, transparent 52%)',
              transform: 'translateX(-120%)',
              animation: loading ? 'loaderShine 1.8s ease-in-out infinite' : undefined,
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '34px',
              animation: loading ? 'loaderPulse 1.2s ease-in-out infinite' : undefined,
            }}
          >
            💰
          </div>
        </div>
        <div
          style={{
            fontSize: '14px',
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--accent)',
            marginBottom: '8px',
          }}
        >
          CATAT-IN
        </div>
        <h1 style={{ margin: '0 0 8px', fontSize: '24px', color: 'var(--text-primary)' }}>{title}</h1>
        <p style={{ margin: 0, color: 'var(--text-muted)', lineHeight: 1.7 }}>{body}</p>
        <style>{`
          @keyframes loaderOrbit {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }

          @keyframes loaderFloat {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-6px); }
          }

          @keyframes loaderPulse {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.08); opacity: 0.92; }
          }

          @keyframes loaderShine {
            0% { transform: translateX(-130%) skewX(-18deg); opacity: 0; }
            20% { opacity: 1; }
            60% { transform: translateX(130%) skewX(-18deg); opacity: 0.9; }
            100% { transform: translateX(130%) skewX(-18deg); opacity: 0; }
          }
        `}</style>
      </div>
    </div>
  )
}

function ConfigErrorPage() {
  const configError = supabaseConfigError || apiConfigError || 'Konfigurasi frontend belum lengkap.'

  return (
    <FullscreenMessage
      title="Konfigurasi frontend belum siap"
      body={`${configError} Isi environment frontend dengan VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, dan VITE_API_BASE_URL yang benar lalu deploy ulang.`}
    />
  )
}

function AuthCallbackPage() {
  const navigate = useNavigate()
  const { refreshUser } = useAuthStore()
  const { ready, hasSession } = useAuthReady()

  useEffect(() => {
    if (!ready) return
    if (supabaseConfigError || apiConfigError) {
      navigate('/login', { replace: true })
      return
    }
    if (hasSession) {
      refreshUser().finally(() => navigate('/dashboard', { replace: true }))
    } else {
      navigate('/login', { replace: true })
    }
  }, [ready, hasSession, navigate, refreshUser])

  return <FullscreenMessage title="Memproses login" body="Sedang menyiapkan sesi akun kamu." loading />
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const { ready, hasSession } = useAuthReady()

  if (!ready) {
    return <FullscreenMessage title="Memuat aplikasi" body="Sedang mengecek sesi login kamu." loading />
  }

  if (supabaseConfigError || apiConfigError) {
    return <ConfigErrorPage />
  }

  if (!hasSession) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <>{children}</>
}

function GuestOnly({ children }: { children: React.ReactNode }) {
  const { ready, hasSession } = useAuthReady()

  if (!ready) {
    return <FullscreenMessage title="Memuat halaman login" body="Sedang mengecek apakah sesi kamu masih aktif." loading />
  }

  if (supabaseConfigError || apiConfigError) {
    return <ConfigErrorPage />
  }

  if (hasSession) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      {supabaseConfigError || apiConfigError ? (
        <ConfigErrorPage />
      ) : (
        <Routes>
          <Route
            path="/login"
            element={
              <GuestOnly>
                <LoginPage />
              </GuestOnly>
            }
          />
          <Route
            path="/register"
            element={
              <GuestOnly>
                <RegisterPage />
              </GuestOnly>
            }
          />
          <Route
            path="/forgot-password"
            element={
              <GuestOnly>
                <ForgotPasswordPage />
              </GuestOnly>
            }
          />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />

          <Route
            element={
              <RequireAuth>
                <AppLayout />
              </RequireAuth>
            }
          >
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/transactions" element={<TransactionPage />} />
            <Route path="/capture" element={<CapturePage />} />
            <Route path="/wallets" element={<WalletPage />} />
            <Route path="/budgets" element={<BudgetPage />} />
            <Route path="/bills" element={<BillsPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/groups" element={<GroupsPage />} />
            <Route path="/imports" element={<ImportsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      )}
    </BrowserRouter>
  </React.StrictMode>,
)
