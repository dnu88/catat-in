import { useId } from 'react'

type LogoProps = {
  size?: number
  variant?: 'light' | 'dark'
  className?: string
}

export default function Logo({ size = 32, variant = 'light', className = '' }: LogoProps) {
  const id = useId().replace(/:/g, '')
  const bgId = `logo-bg-${id}`
  const indigoId = `logo-indigo-${id}`
  const emeraldId = `logo-emerald-${id}`
  const shadowId = `logo-shadow-${id}`

  const isDark = variant === 'dark'

  return (
    <div
      className={`logo-wrapper ${className}`.trim()}
      style={{
        width: size,
        height: size,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <svg width="100%" height="100%" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <defs>
          <linearGradient id={bgId} x1="0" y1="0" x2="512" y2="512">
            <stop offset="0%" stopColor="#0F172A" />
            <stop offset="100%" stopColor="#020617" />
          </linearGradient>

          <linearGradient id={indigoId} x1="120" y1="120" x2="280" y2="380">
            <stop offset="0%" stopColor="#818CF8" />
            <stop offset="100%" stopColor="#4F46E5" />
          </linearGradient>

          <linearGradient id={emeraldId} x1="260" y1="120" x2="420" y2="260">
            <stop offset="0%" stopColor="#6EE7B7" />
            <stop offset="100%" stopColor="#10B981" />
          </linearGradient>

          <filter id={shadowId} x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow
              dx="0"
              dy={isDark ? '12' : '10'}
              stdDeviation={isDark ? '20' : '18'}
              floodColor={isDark ? '#000000' : '#64748B'}
              floodOpacity={isDark ? '0.35' : '0.18'}
            />
          </filter>
        </defs>

        <rect x="24" y="24" width="464" height="464" rx="96" fill={isDark ? `url(#${bgId})` : '#F8FAFC'} filter={`url(#${shadowId})`} />
        <rect x="120" y="120" width="52" height="240" rx="26" fill={`url(#${indigoId})`} />
        <path d="M180 256 L300 380 H230 L145 290 Z" fill={`url(#${indigoId})`} />
        <path d="M255 185 L350 90 L385 125 L290 220 Z" fill={`url(#${emeraldId})`} />
        <path d="M345 90 H420 V165 Z" fill={`url(#${emeraldId})`} />
        <path d="M320 300 L380 360 V250 Z" fill={`url(#${emeraldId})`} opacity="0.9" />
      </svg>
    </div>
  )
}
