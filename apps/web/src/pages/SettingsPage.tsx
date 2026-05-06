import { useState } from 'react'
import { useAuthStore } from '@store/auth.store'
import { useI18nStore } from '@store/i18n.store'

type ThemeMode = 'system' | 'light' | 'dark'

export default function SettingsPage() {
  const { user } = useAuthStore()
  const [theme, setTheme] = useState<ThemeMode>('system')
  const { language, setLanguage } = useI18nStore()
  const [currency, setCurrency] = useState('IDR')
  const [dailyReminder, setDailyReminder] = useState(true)
  const [billReminder, setBillReminder] = useState(true)

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
          Pengaturan
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
          Halaman ini menyiapkan fondasi preferensi akun dan aplikasi kaswise.
        </p>
      </div>

      <section className="card" style={{ padding: '18px' }}>
        <div style={{ marginBottom: '14px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
            Profil akun
          </h3>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Data dasar yang sekarang diambil dari akun Firebase.
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '12px',
          }}
        >
          <InfoField label="Nama lengkap" value={user?.full_name || 'Belum tersedia'} />
          <InfoField label="Email" value={user?.email || 'Belum tersedia'} />
          <InfoField label="Plan" value={user?.plan_type === 'premium' ? 'Premium' : 'Free'} />
          <InfoField label="ID pengguna" value={user?.id || 'Belum tersedia'} />
        </div>
      </section>

      <section className="card" style={{ padding: '18px' }}>
        <div style={{ marginBottom: '14px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
            Preferensi aplikasi
          </h3>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Saat ini masih lokal di UI, tapi strukturnya siap dihubungkan ke backend nanti.
          </p>
        </div>

        <div style={{ display: 'grid', gap: '14px' }}>
          <div>
            <label className="form-label">Tema tampilan</label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {(['system', 'light', 'dark'] as ThemeMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  className={`badge ${theme === mode ? 'badge-ok' : 'badge-info'}`}
                  style={{ cursor: 'pointer', border: 'none', padding: '8px 14px' }}
                  onClick={() => setTheme(mode)}
                >
                  {mode === 'system' ? 'Ikuti sistem' : mode === 'light' ? 'Terang' : 'Gelap'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="form-label">Bahasa / Language</label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button type="button" className={`badge ${language === 'id' ? 'badge-ok' : 'badge-info'}`} style={{ cursor: 'pointer', border: 'none', padding: '8px 14px' }} onClick={() => setLanguage('id')}>
                Indonesia
              </button>
              <button type="button" className={`badge ${language === 'en' ? 'badge-ok' : 'badge-info'}`} style={{ cursor: 'pointer', border: 'none', padding: '8px 14px' }} onClick={() => setLanguage('en')}>
                English
              </button>
            </div>
          </div>

          <div>
            <label className="form-label">Mata uang utama</label>
            <select
              className="form-input"
              value={currency}
              onChange={(event) => setCurrency(event.target.value)}
            >
              <option value="IDR">Rupiah Indonesia (IDR)</option>
              <option value="USD">US Dollar (USD)</option>
              <option value="SGD">Singapore Dollar (SGD)</option>
            </select>
          </div>
        </div>
      </section>

      <section className="card" style={{ padding: '18px' }}>
        <div style={{ marginBottom: '14px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
            Notifikasi
          </h3>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Cocok jadi sambungan berikutnya ke push notification dan reminder backend.
          </p>
        </div>

        <div style={{ display: 'grid', gap: '10px' }}>
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

      <section
        style={{
          borderRadius: '16px',
          padding: '18px',
          background: 'linear-gradient(135deg, #0F766E, #0EA5A4)',
          color: '#fff',
        }}
      >
        <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '8px' }}>
          Langkah lanjutan yang cocok
        </h3>
        <p style={{ fontSize: '13px', lineHeight: 1.7, color: 'rgba(255,255,255,0.86)' }}>
          Dari halaman ini kita bisa lanjut ke simpan preferensi ke Firestore, ganti tema real-time, atau sambungkan notifikasi ke FCM.
        </p>
      </section>
    </div>
  )
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        border: '1px solid var(--border)',
        borderRadius: '12px',
        padding: '14px',
        background: 'var(--bg-card2)',
      }}
    >
      <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px' }}>{label}</p>
      <p style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 600, wordBreak: 'break-word' }}>
        {value}
      </p>
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
    <button
      type="button"
      onClick={onChange}
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '16px',
        padding: '14px 16px',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        background: 'var(--bg-card)',
        cursor: 'pointer',
        textAlign: 'left',
      }}
    >
      <div>
        <p style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 600, marginBottom: '4px' }}>
          {title}
        </p>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{description}</p>
      </div>
      <div
        style={{
          width: '48px',
          height: '28px',
          borderRadius: '999px',
          background: checked ? 'var(--accent)' : 'var(--border-strong)',
          position: 'relative',
          flexShrink: 0,
          transition: 'background 0.2s ease',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '3px',
            left: checked ? '23px' : '3px',
            width: '22px',
            height: '22px',
            borderRadius: '50%',
            background: '#fff',
            transition: 'left 0.2s ease',
          }}
        />
      </div>
    </button>
  )
}
