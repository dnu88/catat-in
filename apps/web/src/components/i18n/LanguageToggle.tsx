import { Translate } from "@phosphor-icons/react"
import { useI18nStore, type AppLanguage } from "@store/i18n.store"

type LanguageToggleProps = {
  className?: string
}

const languages: { id: AppLanguage; short: string; label: string }[] = [
  { id: "id", short: "ID", label: "Bahasa Indonesia" },
  { id: "en", short: "EN", label: "English" },
]

export default function LanguageToggle({ className = "" }: LanguageToggleProps) {
  const language = useI18nStore((s) => s.language)
  const setLanguage = useI18nStore((s) => s.setLanguage)
  const current = languages.find((item) => item.id === language) ?? languages[0]

  return (
    <div
      className={`language-toggle ${className}`.trim()}
      role="group"
      aria-label="Pilih bahasa landing page"
    >
      <Translate aria-hidden="true" size={16} weight="bold" />
      <div className="language-toggle-options">
        {languages.map((item) => {
          const active = item.id === language
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setLanguage(item.id)}
              className={active ? "is-active" : ""}
              aria-pressed={active}
              aria-label={item.label}
            >
              {item.short}
            </button>
          )
        })}
      </div>
      <span aria-live="polite" className="language-toggle-sr">
        {current.label}
      </span>
    </div>
  )
}
