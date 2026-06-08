import { Moon, Sun } from '@phosphor-icons/react'
import { useThemeStore } from '@store/theme.store'

type ThemeToggleProps = {
  className?: string
}

export default function ThemeToggle({ className = '' }: ThemeToggleProps) {
  const { currentMode, setPreference } = useThemeStore()
  const isDark = currentMode === 'dark'
  const Icon = isDark ? Sun : Moon
  const nextLabel = isDark ? 'Ganti ke tema terang' : 'Ganti ke tema gelap'

  const onToggle = () => {
    setPreference(isDark ? 'light' : 'dark')
  }

  return (
    <button
      className={`theme-toggle ${className}`.trim()}
      onClick={onToggle}
      aria-label={`Theme toggle, ${nextLabel}`}
      title={nextLabel}
      type="button"
    >
      <Icon aria-hidden="true" size={18} weight="bold" />
      <span>{isDark ? 'Terang' : 'Gelap'}</span>
    </button>
  )
}
