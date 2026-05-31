const appUrl = import.meta.env.VITE_KASWISE_APP_URL?.trim() || 'https://kaswise.com'

const featureCards = [
  {
    title: 'Catat transaksi dengan kalimat biasa',
    body: 'Tulis “beli kopi 35rb” dan Kaswise menyiapkan nominal, kategori, dan tanggal tanpa form panjang.',
    icon: '✍️',
  },
  {
    title: 'Budget yang mengikuti kategori',
    body: 'Warna dan kategori budget tersinkron dengan transaksi, jadi sisa uang mudah dibaca sekilas.',
    icon: '🎯',
  },
  {
    title: 'Laporan bulanan yang tidak berisik',
    body: 'Fokus pada arus kas, kategori terbesar, dan pola belanja—bukan puluhan chart yang sulit dipakai.',
    icon: '📊',
  },
]

const proofItems = [
  { label: 'Input', value: 'beli kopi 35rb di Kopi Kenangan' },
  { label: 'Kategori', value: 'Makan & Minum' },
  { label: 'Budget', value: 'Otomatis mengurangi budget makan' },
]

export default function LandingPage() {
  return (
    <main className="landing-page" data-testid="web-landing-page">
      <header className="landing-header" aria-label="Navigasi Kaswise">
        <a className="landing-brand" href="#top" aria-label="Kaswise">
          <span className="landing-brand-mark">K</span>
          <span>
            <strong>kaswise</strong>
            <small>Catat keuangan, bijak setiap hari</small>
          </span>
        </a>
        <nav className="landing-nav" aria-label="Navigasi landing">
          <a href="#fitur">Fitur</a>
          <a href="#cara-kerja">Cara kerja</a>
          <a href="#keamanan">Keamanan</a>
        </nav>
        <a className="landing-nav-cta" href={appUrl}>Buka aplikasi</a>
      </header>

      <section id="top" className="landing-hero">
        <div className="landing-hero-copy">
          <div className="landing-eyebrow">Mobile-first finance companion</div>
          <h1>Catat pengeluaran harian tanpa merasa sedang mengisi spreadsheet.</h1>
          <p>
            Kaswise membantu mencatat transaksi, menjaga budget, dan membaca laporan bulanan
            dengan alur yang singkat, natural, dan cocok untuk kebiasaan finansial sehari-hari.
          </p>
          <div className="landing-actions">
            <a className="landing-primary" href={appUrl}>Buka Kaswise PWA</a>
            <a className="landing-secondary" href="#cara-kerja">Lihat cara kerjanya</a>
          </div>
          <p className="landing-note">
            Sudah live sebagai PWA. Bisa dibuka dari browser dan dipasang ke layar utama.
          </p>
        </div>

        <div className="landing-product-card" aria-label="Contoh alur Kaswise">
          <div className="landing-phone-frame">
            <div className="landing-phone-top">
              <span>Input cepat</span>
              <span className="landing-pill">AI siap bantu</span>
            </div>
            <div className="landing-input-bubble">beli kopi 35rb di Kopi Kenangan</div>
            <div className="landing-result-card">
              {proofItems.map((item) => (
                <div key={item.label} className="landing-result-row">
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>
            <div className="landing-budget-preview">
              <div>
                <span>Budget Makan</span>
                <strong>Rp 465.000 tersisa</strong>
              </div>
              <div className="landing-progress" aria-hidden="true">
                <span />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="fitur" className="landing-section">
        <div className="landing-section-heading">
          <span className="landing-eyebrow">Fitur utama</span>
          <h2>Dibuat untuk mencatat cepat, bukan mengatur dashboard seharian.</h2>
        </div>
        <div className="landing-feature-grid">
          {featureCards.map((item) => (
            <article key={item.title} className="landing-feature-card">
              <div className="landing-feature-icon" aria-hidden="true">{item.icon}</div>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="cara-kerja" className="landing-section landing-split">
        <div>
          <span className="landing-eyebrow">Cara kerja</span>
          <h2>Tiga langkah yang dekat dengan kebiasaan harian.</h2>
        </div>
        <ol className="landing-steps">
          <li><strong>Tulis transaksi.</strong><span>Pakai bahasa sehari-hari, bukan form panjang.</span></li>
          <li><strong>Review jika perlu.</strong><span>Confidence rendah tetap bisa diedit sebelum disimpan.</span></li>
          <li><strong>Lihat dampaknya.</strong><span>Budget dan laporan langsung ikut membaca transaksi baru.</span></li>
        </ol>
      </section>

      <section id="keamanan" className="landing-section landing-trust">
        <div>
          <span className="landing-eyebrow">Keamanan</span>
          <h2>Data finansial perlu batas yang jelas.</h2>
          <p>
            Kaswise memakai Supabase dengan Row Level Security untuk membatasi akses data per pengguna.
            Proses go-live juga mencakup smoke test, hardening auth, dan security header PWA.
          </p>
        </div>
        <a className="landing-secondary" href={appUrl}>Masuk ke aplikasi</a>
      </section>

      <footer className="landing-footer">
        <span>© 2026 Kaswise</span>
        <span>Personal finance PWA untuk pencatatan yang lebih ringan.</span>
      </footer>
    </main>
  )
}
