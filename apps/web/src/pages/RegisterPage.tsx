import { useState } from 'react'
import { Link } from 'react-router-dom'
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth'
import AuthShell from '@components/auth/AuthShell'
import { auth } from '@lib/firebase'
import { ensureUserProfileFromAuth } from '@lib/firestore'
import { useI18nStore } from '@store/i18n.store'

export default function RegisterPage() {
  const { language } = useI18nStore()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password.length < 8) {
      setError('Password minimal 8 karakter.')
      return
    }

    setIsLoading(true)
    try {
      const credential = await createUserWithEmailAndPassword(auth, email, password)
      if (fullName.trim()) {
        await updateProfile(credential.user, { displayName: fullName.trim() })
      }
      await ensureUserProfileFromAuth(credential.user)
      setSuccess(true)
    } catch (err: any) {
      setError(err.message || 'Pendaftaran gagal. Coba lagi.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthShell
      tagline={
        language === 'id' ? (
          <>
            Mulai kelola keuanganmu,
            <br />
            dengan cara yang lebih cerdas.
          </>
        ) : (
          <>
            Start managing your finances,
            <br />
            in a smarter way.
          </>
        )
      }
      features={['✨ Gratis untuk fitur dasar', '🔒 Data aman & privat', '⚡ Setup cepat']}
    >
      {success ? (
        <div className="auth-success-state">
          <div className="auth-success-icon">✓</div>
          <h2 className="auth-card-title">{language === 'id' ? 'Pendaftaran berhasil!' : 'Registration successful!'}</h2>
          <p className="auth-card-subtitle">
            {language === 'id'
              ? `Akun untuk ${email} berhasil dibuat. Lanjut login untuk mulai mencatat keuanganmu.`
              : `Account for ${email} has been created. Continue to sign in and start tracking.`}
          </p>
          <Link to="/login" className="btn btn-primary auth-submit">
            {language === 'id' ? 'Kembali ke Login' : 'Back to Login'}
          </Link>
        </div>
      ) : (
        <>
          <div className="auth-card-header">
            <h2 className="auth-card-title">{language === 'id' ? 'Buat akun baru' : 'Create new account'}</h2>
            <p className="auth-card-subtitle">
              {language === 'id' ? 'Daftar gratis dan mulai catat keuangan' : 'Sign up for free and start tracking your finances'}
            </p>
          </div>

          <form onSubmit={handleRegister} className="auth-form">
            <label className="auth-field">
              <span className="form-label">{language === 'id' ? 'Nama lengkap' : 'Full name'}</span>
              <input
                className="form-input"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Budi Santoso"
                required
                autoComplete="name"
              />
            </label>

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
                placeholder={language === 'id' ? 'Minimal 8 karakter' : 'Minimum 8 characters'}
                required
                autoComplete="new-password"
              />
            </label>

            {error ? <p className="auth-alert auth-alert-error">{error}</p> : null}

            <button type="submit" disabled={isLoading} className="btn btn-primary auth-submit">
              {isLoading ? (language === 'id' ? 'Mendaftarkan...' : 'Registering...') : (language === 'id' ? 'Daftar sekarang' : 'Register now')}
            </button>
          </form>

          <p className="auth-footnote">
            {language === 'id' ? 'Sudah punya akun?' : 'Already have an account?'}{' '}
            <Link to="/login" className="auth-link">
              {language === 'id' ? 'Masuk di sini' : 'Sign in here'}
            </Link>
          </p>
        </>
      )}
    </AuthShell>
  )
}
