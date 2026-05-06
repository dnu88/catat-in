import { useMemo, useState } from 'react'
import { useAuthStore } from '@store/auth.store'
import { useI18nStore } from '@store/i18n.store'
import { useThemeStore } from '@store/theme.store'

type ThemeMode = 'system' | 'light' | 'dark'

export default function SettingsPage() {
  const { user } = useAuthStore()
  const { language, setLanguage } = useI18nStore()
  const { preference, setPreference, currentMode } = useThemeStore()

  const [currency, setCurrency] = useState('IDR')
  const [dailyReminder, setDailyReminder] = useState(true)
  const [billReminder, setBillReminder] = useState(true)

  const activeThemeLabel = useMemo(() => {
    if (preference === 'system') {
      return `Sistem (${currentMode === 'dark' ? 'Dark' : 'Light'})`
    }
    return preference === 'dark' ? 'Dark' : 'Light'
  }, [currentMode, preference])

  return (
    <div className="animate-fade-in page-shell">
      <div className="page-header">
        <div>
          <h2 className="page-title">Pengaturan</h2>
          <p className="page-subtitle">Atur akun, preferensi aplikasi, tema, dan notifikasi sesuai kebutuhanmu.</p>
        </div>
        <span className="badge badge-info">Tema aktif: {activeThemeLabel}</span>
      </div>

      <section className="card page-section-card">
        <div className="section-head">
          <h3 className="section-title">Profil akun</h3>
          <p className="section-subtitle">Data dasar dari akun autentikasi.</p>
        </div>

        <div className="settings-grid">
          <InfoField label="Nama lengkap" value={user?.full_name || 'Belum tersedia'} />
          <InfoField label="Email" value={user?.email || 'Belum tersedia'} />
          <InfoField label="Plan" value={user?.plan_type === 'premium' ? 'Premium' : 'Free'} />
          <InfoField label="ID pengguna" value={user?.id || 'Belum tersedia'} />
        </div>
      </section>

      <section className="card page-section-card">
        <div className="section-head">
          <h3 className="section-title">Preferensi aplikasi</h3>
          <p className="section-subtitle">Perubahan tema dan bahasa aktif secara real-time pada aplikasi web.</p>
        </div>

        <div className="settings-stack">
          <div>
            <label className="form-label">Tema tampilan</label>
            <div className="chip-row">
              {(['system', 'light', 'dark'] as ThemeMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  className={`chip-toggle ${preference === mode ? 'active' : ''}`}
                  onClick={() => setPreference(mode)}
                >
                  {mode === 'system' ? 'Ikuti sistem' : mode === 'light' ? 'Terang' : 'Gelap'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="form-label">Bahasa / Language</label>
            <div className="chip-row">
              <button
                type="button"
                className={`chip-toggle ${language === 'id' ? 'active' : ''}`}
                onClick={() => setLanguage('id')}
              >
                Indonesia
              </button>
              <button
                type="button"
                className={`chip-toggle ${language === 'en' ? 'active' : ''}`}
                onClick={() => setLanguage('en')}
              >
                English
              </button>
            </div>
          </div>

          <div>
            <label className="form-label">Mata uang utama</label>
            <select className="form-input" value={currency} onChange={(event) => setCurrency(event.target.value)}>
              <option value="IDR">Rupiah Indonesia (IDR)</option>
              <option value="USD">US Dollar (USD)</option>
              <option value="SGD">Singapore Dollar (SGD)</option>
            </select>
          </div>
        </div>
      </section>

      <section className="card page-section-card">
        <div className="section-head">
          <h3 className="section-title">Notifikasi</h3>
          <p className="section-subtitle">Pilih pengingat yang kamu butuhkan agar cashflow tetap terkendali.</p>
        </div>

        <div className="settings-stack">
          <ToggleRow
            title="Ringkasan harian"
            description="Kirim pengingat singkat untuk cek pemasukan dan pengeluaran harian."
            checked={dailyReminder}
            onChange={() => setDailyReminder((value) => !value)}
          />
          <ToggleRow
            title="Pengingat tagihan"
            description="Beritahu pengguna sebelum jatuh tempo tagihan rutin."
            checked={billReminder}
            onChange={() => setBillReminder((value) => !value)}
          />
        </div>
      </section>

      <section className="settings-highlight">
        <h3>Langkah lanjutan</h3>
        <p>
          Struktur UI ini siap disambungkan ke penyimpanan preferensi user di backend agar sinkron antar perangkat.
        </p>
      </section>
    </div>
  )
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div className="settings-info-item">
      <p className="settings-info-label">{label}</p>
      <p className="settings-info-value">{value}</p>
    </div>
  )
}

function ToggleRow({
  title,
  description,
  checked,
  onChange,
}: {
  title: string
  description: string
  checked: boolean
  onChange: () => void
}) {
  return (
    <button type="button" onClick={onChange} className="settings-toggle-row">
      <div>
        <p className="settings-toggle-title">{title}</p>
        <p className="settings-toggle-description">{description}</p>
      </div>
      <div className={`settings-toggle-pill ${checked ? 'active' : ''}`}>
        <div className="settings-toggle-knob" />
      </div>
    </button>
  )
}
