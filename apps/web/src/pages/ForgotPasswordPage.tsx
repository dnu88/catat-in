import { useState } from 'react'
import { Link } from 'react-router-dom'
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
    <div className="simple-auth-page">
      <div className="simple-auth-card">
        <h1 className="simple-auth-title">{language === 'id' ? 'Lupa password' : 'Forgot password'}</h1>
        <p className="simple-auth-subtitle">{language === 'id' ? 'Masukkan email akun kamu untuk menerima link reset password.' : 'Enter your account email to receive a reset link.'}</p>

        <form onSubmit={handleSubmit} className="simple-auth-form">
          <label className="simple-auth-field">
            <span>{language === 'id' ? 'Email' : 'Email'}</span>
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

          {error ? <p className="simple-auth-error">{error}</p> : null}
          {success ? <p className="simple-auth-success">{success}</p> : null}

          <button type="submit" disabled={isLoading} className="btn btn-primary">
            {isLoading ? (language === 'id' ? 'Mengirim...' : 'Sending...') : (language === 'id' ? 'Kirim link reset' : 'Send reset link')}
          </button>
        </form>

        <p className="simple-auth-footer">
          <Link to="/login">{language === 'id' ? 'Kembali ke login' : 'Back to login'}</Link>
        </p>
      </div>

      <style>{`
        .simple-auth-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          background: var(--bg-base);
        }
        .simple-auth-card {
          width: 100%;
          max-width: 420px;
          padding: 28px;
          border-radius: 20px;
          background: var(--bg-card);
          border: 1px solid var(--border);
          box-shadow: var(--shadow-sm);
        }
        .simple-auth-title {
          margin: 0 0 6px;
          font-size: 24px;
          color: var(--text-primary);
        }
        .simple-auth-subtitle {
          margin: 0 0 20px;
          font-size: 14px;
          color: var(--text-muted);
          line-height: 1.7;
        }
        .simple-auth-form {
          display: grid;
          gap: 14px;
        }
        .simple-auth-field {
          display: grid;
          gap: 6px;
          font-size: 13px;
          color: var(--text-secondary);
          font-weight: 600;
        }
        .simple-auth-error, .simple-auth-success {
          margin: 0;
          padding: 10px 12px;
          border-radius: 12px;
          font-size: 13px;
          line-height: 1.7;
        }
        .simple-auth-error {
          color: var(--red);
          background: rgba(239, 68, 68, 0.08);
          border: 1px solid rgba(239, 68, 68, 0.15);
        }
        .simple-auth-success {
          color: var(--green);
          background: rgba(16, 185, 129, 0.08);
          border: 1px solid rgba(16, 185, 129, 0.16);
        }
        .simple-auth-footer {
          margin: 18px 0 0;
          text-align: center;
          font-size: 13px;
        }
      `}</style>
    </div>
  )
}
