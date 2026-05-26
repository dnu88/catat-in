import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthShell from '@components/auth/AuthShell'
import Logo from '@components/Logo'
import { useAuthStore } from '@store/auth.store'
import { useI18nStore } from '@store/i18n.store'

export default function LoginPage() {
  const { language } = useI18nStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const { signInWithEmail, signInWithGoogle, isLoading } = useAuthStore()
  const navigate = useNavigate()

  const handleGoogleLogin = async () => {
    setError('')

    try {
      await signInWithGoogle()
      navigate('/dashboard')
    } catch (err: any) {
      setError(err?.message || (language === 'id' ? 'Login Google gagal. Coba lagi.' : 'Google login failed. Try again.'))
    }
  }

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

    setError('Sesi login belum terbentuk. Coba login lagi atau reload halaman.')
  }

  return (
    <AuthShell
      tagline={
        language === 'id' ? (
          <>
            Catat Keuangan,
            <br />
            Bijak Setiap Hari.
          </>
        ) : (
          <>
            Track your money,
            <br />
            wiser every day.
          </>
        )
      }
      features={['🤖 Input via AI Chat', '📷 Scan Struk Otomatis', '📊 Laporan Cerdas']}
    >
      <div className="auth-card-header">
        <h2 className="auth-card-title">{language === 'id' ? 'Masuk ke akun kamu' : 'Sign in to your account'}</h2>
        <p className="auth-card-subtitle">{language === 'id' ? 'Kelola keuangan dengan lebih cerdas' : 'Manage your finances smarter'}</p>
      </div>

      <button type="button" onClick={handleGoogleLogin} disabled={isLoading} className="btn btn-secondary auth-google-btn">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
        </svg>
        {language === 'id' ? 'Masuk dengan Google' : 'Continue with Google'}
      </button>

      <div className="auth-divider">
        <span>{language === 'id' ? 'atau masuk dengan email' : 'or sign in with email'}</span>
      </div>

      <form onSubmit={handleLogin} className="auth-form">
        <label className="auth-field">
          <span className="form-label">Email</span>
          <input
            className="form-input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@contoh.com"
            required
            autoComplete="email"
          />
        </label>

        <label className="auth-field">
          <span className="form-label">Password</span>
          <input
            className="form-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            autoComplete="current-password"
          />
        </label>

        <p className="auth-inline-link-row">
          <Link to="/forgot-password" className="auth-link">
            {language === 'id' ? 'Lupa password?' : 'Forgot password?'}
          </Link>
        </p>

        {error ? <p className="auth-alert auth-alert-error">{error}</p> : null}

        <button type="submit" disabled={isLoading} className="btn btn-primary auth-submit">
          {isLoading ? (
            <span className="auth-submit-loading">
              <span className="auth-submit-loader-shell">
                <span className="auth-submit-loader-ring" />
                <span className="auth-submit-loader-glow" />
                <span className="auth-submit-loader-mark">
                  <Logo size={14} variant="light" />
                </span>
              </span>
              <span>{language === 'id' ? 'Masuk...' : 'Signing in...'}</span>
            </span>
          ) : (
            <>{language === 'id' ? 'Masuk' : 'Sign in'}</>
          )}
        </button>
      </form>


      <p className="auth-footnote">
        {language === 'id' ? 'Belum punya akun?' : "Don't have an account?"}{' '}
        <Link to="/register" className="auth-link">
          {language === 'id' ? 'Daftar sekarang' : 'Register now'}
        </Link>
      </p>
    </AuthShell>
  )
}
