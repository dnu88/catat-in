import type { CSSProperties, PropsWithChildren } from 'react'

type CardProps = PropsWithChildren<{
  className?: string
  style?: CSSProperties
}>

export function Card({ children, className = '', style }: CardProps) {
  return (
    <section className={`card ks-card ${className}`.trim()} style={style}>
      {children}
    </section>
  )
}
