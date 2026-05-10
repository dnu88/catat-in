import { useState } from 'react'
import { Link } from 'react-router-dom'
import AuthShell from '@components/auth/AuthShell'
import { useAuthStore } from '@store/auth.store'
import { useI18nStore } from '@store/i18n.store'

export default function ForgotPasswordPage() {
  const { language } = useI18nStore()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const { requestPasswordReset, isLoading } = useAuthStore()

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    setSuccess('')

    try {
      await requestPasswordReset(email)
      setSuccess('Jika email terdaftar, link reset password sudah dikirim. Silakan cek inbox dan folder spam.')
    } catch (err: any) {
      setError(err.message || 'Belum bisa mengirim email reset password.')
    }
  }

  return (
    <AuthShell
      tagline={language === 'id' ? 'Lupa password bukan masalah. Kami bantu kamu akses akun lagi dengan aman.' : 'Forgot your password? We will help you securely access your account again.'}
      features={['📩 Link reset instan', '🔐 Aman', '⚡ Cepat']}
    >
      <div className="auth-card-header">
        <h2 className="auth-card-title">{language === 'id' ? 'Lupa password' : 'Forgot password'}</h2>
        <p className="auth-card-subtitle">
          {language === 'id' ? 'Masukkan email akun kamu untuk menerima link reset password.' : 'Enter your account email to receive a reset link.'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="auth-form">
        <label className="auth-field">
          <span className="form-label">Email</span>
          <input
            className="form-input"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder={language === 'id' ? 'email@contoh.com' : 'email@example.com'}
            required
            autoComplete="email"
          />
        </label>

        {error ? <p className="auth-alert auth-alert-error">{error}</p> : null}
        {success ? <p className="auth-alert auth-alert-success">{success}</p> : null}

        <button type="submit" disabled={isLoading} className="btn btn-primary auth-submit">
          {isLoading ? (language === 'id' ? 'Mengirim...' : 'Sending...') : (language === 'id' ? 'Kirim link reset' : 'Send reset link')}
        </button>
      </form>

      <p className="auth-footnote">
        <Link to="/login" className="auth-link">{language === 'id' ? 'Kembali ke login' : 'Back to login'}</Link>
      </p>
    </AuthShell>
  )
}
