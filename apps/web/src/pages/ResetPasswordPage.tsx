import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import AuthShell from '@components/auth/AuthShell'
import { auth } from '@lib/firebase'
import { useAuthStore } from '@store/auth.store'
import { useI18nStore } from '@store/i18n.store'

export default function ResetPasswordPage() {
  const { language } = useI18nStore()
  const navigate = useNavigate()
  const location = useLocation()
  const { updatePassword, confirmPasswordResetByCode, isLoading } = useAuthStore()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [hasRecoverySession, setHasRecoverySession] = useState(false)
  const [oobCode, setOobCode] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const mode = params.get('mode')
    const actionCode = params.get('oobCode')

    const isResetLink = Boolean(actionCode && (mode === null || mode === 'resetPassword'))

    setOobCode(actionCode)
    setHasRecoverySession(Boolean(isResetLink || auth.currentUser))
  }, [location.search])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    setSuccess('')

    if (password.length < 8) {
      setError('Password baru minimal 8 karakter.')
      return
    }

    if (password !== confirmPassword) {
      setError('Konfirmasi password belum sama.')
      return
    }

    try {
      if (oobCode) {
        await confirmPasswordResetByCode(oobCode, password)
      } else {
        await updatePassword(password)
      }

      setSuccess('Password berhasil diperbarui. Kamu akan diarahkan ke halaman login.')
      setTimeout(() => navigate('/login', { replace: true }), 1500)
    } catch (err: any) {
      setError(err.message || 'Belum bisa memperbarui password.')
    }
  }

  return (
    <AuthShell
      tagline={language === 'id' ? 'Setel ulang password agar akunmu tetap aman dan bisa dipakai kembali.' : 'Set a new password to keep your account secure and accessible.'}
      features={['🛡️ Keamanan akun', '🔁 Reset cepat', '✅ Validasi otomatis']}
    >
      <div className="auth-card-header">
        <h2 className="auth-card-title">{language === 'id' ? 'Atur password baru' : 'Set new password'}</h2>
        <p className="auth-card-subtitle">
          {language === 'id' ? 'Masukkan password baru untuk akun kaswise kamu.' : 'Enter a new password for your kaswise account.'}
        </p>
      </div>

      {!hasRecoverySession ? (
        <p className="auth-alert auth-alert-success">Link reset tidak valid atau sudah kedaluwarsa. Silakan minta link reset baru dari halaman lupa password.</p>
      ) : (
        <form onSubmit={handleSubmit} className="auth-form">
          <label className="auth-field">
            <span className="form-label">{language === 'id' ? 'Password baru' : 'New password'}</span>
            <input
              className="form-input"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={language === 'id' ? 'Minimal 8 karakter' : 'Minimum 8 characters'}
              required
              autoComplete="new-password"
            />
          </label>

          <label className="auth-field">
            <span className="form-label">{language === 'id' ? 'Konfirmasi password' : 'Confirm password'}</span>
            <input
              className="form-input"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder={language === 'id' ? 'Ulangi password baru' : 'Repeat new password'}
              required
              autoComplete="new-password"
            />
          </label>

          {error ? <p className="auth-alert auth-alert-error">{error}</p> : null}
          {success ? <p className="auth-alert auth-alert-success">{success}</p> : null}

          <button type="submit" disabled={isLoading} className="btn btn-primary auth-submit">
            {isLoading ? (language === 'id' ? 'Menyimpan...' : 'Saving...') : (language === 'id' ? 'Simpan password baru' : 'Save new password')}
          </button>
        </form>
      )}

      <p className="auth-footnote">
        <Link to="/login" className="auth-link">{language === 'id' ? 'Kembali ke login' : 'Back to login'}</Link>
      </p>
    </AuthShell>
  )
}
