import { ReactNode } from 'react'
import Logo from '../Logo'

type AuthShellProps = {
  tagline: ReactNode
  features?: string[]
  children: ReactNode
}

export default function AuthShell({ tagline, features = [], children }: AuthShellProps) {
  return (
    <div className="auth-page">
      <div className="auth-brand">
        <div className="auth-brand-bg" />
        <div className="auth-brand-circle auth-brand-circle-1" />
        <div className="auth-brand-circle auth-brand-circle-2" />
        <div className="auth-brand-content">
          <div className="auth-logo-mark" aria-hidden>
            <Logo size={72} variant="dark" />
          </div>
          <h1 className="auth-logo-name">kaswise</h1>
          <p className="auth-tagline">{tagline}</p>
          {features.length ? (
            <div className="auth-features">
              {features.map((feature) => (
                <div key={feature} className="auth-feature">
                  {feature}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div className="auth-form-side">
        <div className="auth-card">{children}</div>
      </div>
    </div>
  )
}
