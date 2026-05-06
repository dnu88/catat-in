import { useThemeStore } from '@store/theme.store'

export default function ThemeToggle() {
  const { currentMode, setPreference } = useThemeStore()

  const onToggle = () => {
    setPreference(currentMode === 'dark' ? 'light' : 'dark')
  }

  return (
    <button
      className="btn btn-secondary"
      onClick={onToggle}
      aria-label="Theme toggle"
      title="Theme"
      type="button"
    >
      {currentMode === 'dark' ? '☀️ Theme' : '🌙 Theme'}
    </button>
  )
}
