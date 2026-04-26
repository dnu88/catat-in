import { useState } from 'react'
import { supabase } from '@lib/supabase'

export default function RegisterPage() {
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
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      })
      if (error) throw error
      setSuccess(true)
    } catch (err: any) {
      setError(err.message || 'Pendaftaran gagal. Coba lagi.')
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <div className="login-page">
        <div className="login-brand">
          <div className="login-brand-bg" />
          <div className="login-brand-circle login-brand-circle-1" />
          <div className="login-brand-circle login-brand-circle-2" />
          <div className="login-brand-content">
            <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '36px', margin: '0 auto 20px', border: '1px solid rgba(255,255,255,0.25)' }}>
              ✓
            </div>
            <h1 className="login-logo-name">Pendaftaran Berhasil!</h1>
            <p className="login-tagline">
              Cek email <strong style={{ color: '#fff' }}>{email}</strong> dan klik link konfirmasi untuk mengaktifkan akun kamu.
            </p>
            <a
              href="/login"
              style={{
                display: 'inline-block',
                marginTop: '16px',
                background: '#fff',
                color: 'var(--accent)',
                padding: '12px 28px',
                borderRadius: 'var(--r-pill)',
                fontWeight: 700,
                fontSize: '14px',
                textDecoration: 'none',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              }}
            >
              Kembali ke Login
            </a>
          </div>
        </div>
        <style>{registerStyles}</style>
      </div>
    )
  }

  return (
    <div className="login-page">
      {/* Left side — branding */}
      <div className="login-brand">
        <div className="login-brand-bg" />
        <div className="login-brand-circle login-brand-circle-1" />
        <div className="login-brand-circle login-brand-circle-2" />
        <div className="login-brand-content">
          <div className="login-logo-mark">💰</div>
          <h1 className="login-logo-name">Catat.in</h1>
          <p className="login-tagline">
            Mulai kelola keuanganmu<br />dengan cara yang lebih cerdas.
          </p>
          <div className="login-features">
            <div className="login-feature">✨ Gratis selamanya untuk fitur dasar</div>
            <div className="login-feature">🔒 Data kamu aman & privat</div>
            <div className="login-feature">⚡ Setup dalam 30 detik</div>
          </div>
        </div>
      </div>

      {/* Right side — register form */}
      <div className="login-form-side">
        <div className="login-card">
          <div className="login-card-header">
            <h2 className="login-card-title">Buat akun baru</h2>
            <p className="login-card-sub">
              Daftar gratis dan mulai catat keuangan
            </p>
          </div>

          <form onSubmit={handleRegister} className="login-form">
            <div className="login-field">
              <label className="form-label" htmlFor="reg-name">Nama Lengkap</label>
              <input
                id="reg-name"
                className="form-input"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Budi Santoso"
                required
                autoComplete="name"
              />
            </div>

            <div className="login-field">
              <label className="form-label" htmlFor="reg-email">Email</label>
              <input
                id="reg-email"
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
              <label className="form-label" htmlFor="reg-password">Password</label>
              <input
                id="reg-password"
                className="form-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimal 8 karakter"
                required
                autoComplete="new-password"
              />
            </div>

            {error && <p className="login-error">{error}</p>}

            <button type="submit" disabled={isLoading} className="btn btn-primary login-submit">
              {isLoading ? 'Mendaftarkan...' : 'Daftar Sekarang'}
            </button>
          </form>

          <p className="login-register-text">
            Sudah punya akun?{' '}
            <a href="/login" className="login-register-link">Masuk di sini</a>
          </p>
        </div>
      </div>

      <style>{registerStyles}</style>
    </div>
  )
}

const registerStyles = `
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
`
