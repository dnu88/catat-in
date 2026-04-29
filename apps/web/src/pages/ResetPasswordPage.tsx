import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { auth } from '@lib/firebase'
import { useAuthStore } from '@store/auth.store'

export default function ResetPasswordPage() {
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
    const actionCode = params.get('oobCode')
    setOobCode(actionCode)
    setHasRecoverySession(Boolean(actionCode || auth.currentUser))
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
    <div className="simple-auth-page">
      <div className="simple-auth-card">
        <h1 className="simple-auth-title">Atur password baru</h1>
        <p className="simple-auth-subtitle">Masukkan password baru untuk akun Catat.in kamu.</p>

        {!hasRecoverySession ? (
          <p className="simple-auth-success">
            Link reset belum aktif atau sudah kedaluwarsa. Coba minta link reset baru dari halaman lupa password.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="simple-auth-form">
            <label className="simple-auth-field">
              <span>Password baru</span>
              <input
                className="form-input"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Minimal 8 karakter"
                required
                autoComplete="new-password"
              />
            </label>

            <label className="simple-auth-field">
              <span>Konfirmasi password</span>
              <input
                className="form-input"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Ulangi password baru"
                required
                autoComplete="new-password"
              />
            </label>

            {error ? <p className="simple-auth-error">{error}</p> : null}
            {success ? <p className="simple-auth-success">{success}</p> : null}

            <button type="submit" disabled={isLoading} className="btn btn-primary">
              {isLoading ? 'Menyimpan...' : 'Simpan password baru'}
            </button>
          </form>
        )}

        <p className="simple-auth-footer">
          <Link to="/login">Kembali ke login</Link>
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
