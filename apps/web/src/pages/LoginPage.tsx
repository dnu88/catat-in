import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@store/auth.store'
import { supabase } from '@lib/supabase'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const { signInWithEmail, signInWithGoogle, isLoading } = useAuthStore()
  const navigate = useNavigate()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    try {
      const signedIn = await signInWithEmail(email, password)
      if (signedIn) {
        navigate('/dashboard')
        return
      }
    } catch (err: any) {
      const message = String(err?.message || '')
      const lower = message.toLowerCase()

      if (lower.includes('invalid login credentials')) {
        setError('Email atau password salah. Coba periksa lagi.')
        return
      }

      if (lower.includes('email not confirmed')) {
        setError('Email kamu belum diverifikasi. Cek inbox lalu klik link verifikasi dulu.')
        return
      }

      setError(message || 'Login gagal. Coba lagi beberapa saat lagi.')
      return
    }

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (session) {
      navigate('/dashboard')
    } else {
      setError('Sesi login belum terbentuk. Coba login lagi atau reload halaman.')
    }
  }

  return (
    <div className="login-page">
      <div className="login-brand">
        <div className="login-brand-bg" />
        <div className="login-brand-circle login-brand-circle-1" />
        <div className="login-brand-circle login-brand-circle-2" />
        <div className="login-brand-content">
          <div className="login-logo-mark">💰</div>
          <h1 className="login-logo-name">Catat.in</h1>
          <p className="login-tagline">
            Catat keuanganmu dengan
            <br />
            mudah, cerdas, menyenangkan.
          </p>
          <div className="login-features">
            <div className="login-feature">🤖 Input via AI Chat</div>
            <div className="login-feature">📷 Scan Struk Otomatis</div>
            <div className="login-feature">📊 Laporan Cerdas</div>
          </div>
        </div>
      </div>

      <div className="login-form-side">
        <div className="login-card">
          <div className="login-card-header">
            <h2 className="login-card-title">Masuk ke akun kamu</h2>
            <p className="login-card-sub">Kelola keuangan dengan lebih cerdas</p>
          </div>

          <form onSubmit={handleLogin} className="login-form">
            <div className="login-field">
              <label className="form-label" htmlFor="login-email">
                Email
              </label>
              <input
                id="login-email"
                className="form-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@contoh.com"
                required
                autoComplete="email"
              />
            </div>

            <div className="login-field">
              <label className="form-label" htmlFor="login-password">
                Password
              </label>
              <input
                id="login-password"
                className="form-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '-6px' }}>
              <a href="/forgot-password" className="login-register-link" style={{ fontSize: '13px' }}>
                Lupa password?
              </a>
            </div>

            {error ? <p className="login-error">{error}</p> : null}

            <button type="submit" disabled={isLoading} className="btn btn-primary login-submit">
              {isLoading ? (
                <span className="login-submit-loading">
                  <span className="login-submit-loader-shell">
                    <span className="login-submit-loader-ring" />
                    <span className="login-submit-loader-glow" />
                    <span className="login-submit-loader-mark">💰</span>
                  </span>
                  <span>Masuk...</span>
                </span>
              ) : (
                'Masuk'
              )}
            </button>
          </form>

          <div className="login-divider">
            <span>atau</span>
          </div>

          <button onClick={signInWithGoogle} disabled={isLoading} className="btn btn-secondary login-google">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Masuk dengan Google
          </button>

          <p className="login-register-text">
            Belum punya akun? <a href="/register" className="login-register-link">Daftar sekarang</a>
          </p>
        </div>
      </div>

      <style>{`
        .login-page {
          min-height: 100vh;
          display: flex;
        }

        .login-brand {
          flex: 1;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .login-brand-bg {
          position: absolute;
          inset: 0;
          background: var(--g-card);
        }

        .login-brand-circle {
          position: absolute;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.07);
        }

        .login-brand-circle-1 {
          top: -80px;
          right: -80px;
          width: 300px;
          height: 300px;
        }

        .login-brand-circle-2 {
          bottom: -60px;
          left: -60px;
          width: 250px;
          height: 250px;
        }

        .login-brand-content {
          position: relative;
          z-index: 1;
          text-align: center;
          padding: 40px;
        }

        .login-logo-mark {
          width: 72px;
          height: 72px;
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 36px;
          margin: 0 auto 20px;
          border: 1px solid rgba(255, 255, 255, 0.25);
          backdrop-filter: blur(10px);
        }

        .login-logo-name {
          font-size: 32px;
          font-weight: 700;
          color: #fff;
          letter-spacing: -0.5px;
          margin-bottom: 8px;
        }

        .login-tagline {
          font-size: 15px;
          color: rgba(255, 255, 255, 0.75);
          line-height: 1.7;
          margin-bottom: 32px;
        }

        .login-features {
          display: flex;
          flex-direction: column;
          gap: 10px;
          align-items: center;
        }

        .login-feature {
          background: rgba(255, 255, 255, 0.12);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: var(--r-pill);
          padding: 8px 20px;
          font-size: 13px;
          color: rgba(255, 255, 255, 0.9);
          font-weight: 500;
        }

        .login-form-side {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px;
          background: var(--bg-base);
        }

        .login-card {
          width: 100%;
          max-width: 400px;
        }

        .login-card-header {
          margin-bottom: 28px;
        }

        .login-card-title {
          font-size: 24px;
          font-weight: 700;
          color: var(--text-primary);
          letter-spacing: -0.3px;
          margin-bottom: 6px;
        }

        .login-card-sub {
          font-size: 14px;
          color: var(--text-muted);
        }

        .login-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .login-field {
          display: flex;
          flex-direction: column;
        }

        .login-error {
          font-size: 13px;
          color: var(--red);
          background: rgba(239, 68, 68, 0.08);
          border: 1px solid rgba(239, 68, 68, 0.15);
          padding: 10px 14px;
          border-radius: var(--r-sm);
          margin: 0;
        }

        .login-submit {
          width: 100%;
          padding: 12px;
          font-size: 15px;
          margin-top: 4px;
        }

        .login-submit-loading {
          display: inline-flex;
          align-items: center;
          gap: 10px;
        }

        .login-submit-loader-shell {
          position: relative;
          width: 30px;
          height: 30px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .login-submit-loader-ring {
          position: absolute;
          inset: -2px;
          border-radius: 12px;
          border: 2px solid rgba(255, 255, 255, 0.18);
          border-top-color: rgba(255, 255, 255, 0.95);
          border-right-color: rgba(255, 255, 255, 0.6);
          animation: login-loader-spin 1s linear infinite;
        }

        .login-submit-loader-glow {
          position: absolute;
          inset: 3px;
          border-radius: 10px;
          background: radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.28), rgba(255, 255, 255, 0.08));
          animation: login-loader-breathe 1.5s ease-in-out infinite;
        }

        .login-submit-loader-mark {
          position: relative;
          z-index: 1;
          width: 24px;
          height: 24px;
          border-radius: 9px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.24);
          box-shadow: 0 6px 18px rgba(15, 21, 35, 0.12);
          animation: login-loader-bob 1.3s ease-in-out infinite;
        }

        @keyframes login-loader-bob {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-2px) scale(1.05); }
        }

        @keyframes login-loader-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes login-loader-breathe {
          0%, 100% { transform: scale(0.92); opacity: 0.72; }
          50% { transform: scale(1.04); opacity: 1; }
        }

        .login-divider {
          text-align: center;
          color: var(--text-muted);
          margin: 20px 0;
          font-size: 13px;
          position: relative;
        }

        .login-divider::before,
        .login-divider::after {
          content: '';
          position: absolute;
          top: 50%;
          width: calc(50% - 24px);
          height: 1px;
          background: var(--border);
        }

        .login-divider::before { left: 0; }
        .login-divider::after { right: 0; }

        .login-google {
          width: 100%;
          padding: 12px;
          font-size: 14px;
          font-weight: 600;
        }

        .login-register-text {
          text-align: center;
          margin-top: 24px;
          color: var(--text-muted);
          font-size: 14px;
        }

        .login-register-link {
          color: var(--accent);
          text-decoration: none;
          font-weight: 600;
        }

        .login-register-link:hover {
          text-decoration: underline;
        }

        @media (max-width: 768px) {
          .login-page {
            flex-direction: column;
          }

          .login-brand {
            min-height: 260px;
            flex: none;
          }

          .login-features {
            display: none;
          }

          .login-form-side {
            padding: 24px;
          }
        }
      `}</style>
    </div>
  )
}
