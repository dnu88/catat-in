const appUrl = import.meta.env.VITE_KASWISE_APP_URL?.trim() || 'https://kaswise.com'

const captureSteps = [
  {
    title: 'Tulis seperti chat',
    body: 'Contoh: “beli kopi 35rb di Kopi Kenangan”. Tidak perlu membuka form panjang.',
  },
  {
    title: 'Periksa hasil baca',
    body: 'Nominal, kategori, dan tanggal disiapkan. Kalau konteksnya kurang jelas, tetap bisa diedit dulu.',
  },
  {
    title: 'Budget ikut berubah',
    body: 'Transaksi yang disimpan langsung terbaca di budget kategori dan laporan bulan berjalan.',
  },
]

const appHighlights = [
  {
    label: 'Capture cepat',
    title: 'Input transaksi dibuat pendek',
    body: 'Fokus ke kebiasaan harian: jajan, transport, tagihan, dan transfer kecil yang biasanya cepat terlupa.',
    tone: 'primary',
  },
  {
    label: 'Budget kategori',
    title: 'Sisa uang terlihat tanpa hitung manual',
    body: 'Warna kategori konsisten antara transaksi dan budget, termasuk label Indonesia/Inggris.',
    tone: 'warning',
  },
  {
    label: 'Laporan bulanan',
    title: 'Ringkas, bukan dashboard penuh chart',
    body: 'Kaswise menonjolkan arus kas, kategori terbesar, dan pola yang perlu diperhatikan.',
    tone: 'info',
  },
]

const trustItems = [
  'PWA sudah live dan bisa dipasang ke layar utama.',
  'Auth, Row Level Security, dan security header sudah masuk proses hardening go-live.',
  'Fitur publik di halaman ini hanya menjelaskan alur yang tersedia di aplikasi.',
]

export default function LandingPage() {
  return (
    <main className="landing-page" data-testid="web-landing-page">
      <header className="landing-header" aria-label="Navigasi Kaswise">
        <a className="landing-brand" href="#top" aria-label="Kaswise">
          <span className="landing-brand-mark">K</span>
          <span>
            <strong>kaswise</strong>
            <small>Personal finance PWA</small>
          </span>
        </a>

        <nav className="landing-nav" aria-label="Navigasi landing">
          <a href="#alur">Alur</a>
          <a href="#fitur">Fitur</a>
          <a href="#keamanan">Keamanan</a>
        </nav>

        <a className="landing-nav-cta" href={appUrl}>Buka aplikasi</a>
      </header>

      <section id="top" className="landing-hero" aria-labelledby="landing-title">
        <div className="landing-hero-copy">
          <span className="landing-eyebrow">Mobile-first finance companion</span>
          <h1 id="landing-title">Catat uang keluar sebelum lupa.</h1>
          <p>
            Kaswise membantu mencatat transaksi harian dengan kalimat biasa, menjaga budget
            kategori, dan membaca laporan bulanan tanpa spreadsheet atau dashboard yang ramai.
          </p>

          <div className="landing-actions" aria-label="Aksi utama">
            <a className="landing-primary" href={appUrl}>Buka Kaswise PWA</a>
            <a className="landing-secondary" href="#alur">Lihat alurnya</a>
          </div>

          <div className="landing-proof-strip" aria-label="Ringkasan produk">
            <span>PWA live</span>
            <span>Bahasa Indonesia</span>
            <span>Budget kategori</span>
          </div>
        </div>

        <div className="landing-device-wrap" aria-label="Preview antarmuka Kaswise">
          <div className="landing-device">
            <div className="landing-device-status" aria-hidden="true">
              <span>09:41</span>
              <span>Kaswise</span>
            </div>

            <div className="landing-app-header">
              <div>
                <span>Hari ini</span>
                <strong>Catat cepat</strong>
              </div>
              <span className="landing-icon-bubble landing-icon-bubble-primary">AI</span>
            </div>

            <div className="landing-capture-card">
              <span className="landing-card-label">Input</span>
              <p>beli kopi 35rb di Kopi Kenangan</p>
            </div>

            <div className="landing-review-card">
              <div className="landing-review-head">
                <span>Siap disimpan</span>
                <strong>Confidence tinggi</strong>
              </div>
              <div className="landing-chip-row" aria-label="Hasil pembacaan transaksi">
                <span>Rp35.000</span>
                <span>Makan & Minum</span>
                <span>Hari ini</span>
              </div>
            </div>

            <div className="landing-budget-card">
              <div className="landing-budget-copy">
                <span>Budget Makan</span>
                <strong>Rp465.000 tersisa</strong>
              </div>
              <div className="landing-progress" aria-label="Budget makan tersisa 72 persen">
                <span />
              </div>
            </div>

            <div className="landing-tabbar" aria-hidden="true">
              <span className="active">Beranda</span>
              <span>Capture</span>
              <span>Budget</span>
            </div>
          </div>
        </div>
      </section>

      <section id="alur" className="landing-section landing-flow-section" aria-labelledby="flow-title">
        <div className="landing-section-heading">
          <span className="landing-eyebrow">Alur utama</span>
          <h2 id="flow-title">Didesain seperti aplikasi mobile, bukan formulir akuntansi.</h2>
        </div>

        <div className="landing-flow-list">
          {captureSteps.map((step, index) => (
            <article className="landing-flow-item" key={step.title}>
              <span className="landing-step-number">0{index + 1}</span>
              <div>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="fitur" className="landing-section landing-highlight-section" aria-labelledby="feature-title">
        <div className="landing-section-heading compact">
          <span className="landing-eyebrow">Yang terasa di pemakaian harian</span>
          <h2 id="feature-title">Lebih sedikit langkah untuk hal yang sering dilakukan.</h2>
        </div>

        <div className="landing-highlight-grid">
          {appHighlights.map((item) => (
            <article className="landing-highlight-card" key={item.title}>
              <span className={`landing-icon-bubble landing-icon-bubble-${item.tone}`}>{item.label.slice(0, 2)}</span>
              <div>
                <span className="landing-card-label">{item.label}</span>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="keamanan" className="landing-section landing-trust" aria-labelledby="trust-title">
        <div className="landing-trust-copy">
          <span className="landing-eyebrow">Kesiapan go-live</span>
          <h2 id="trust-title">Data finansial perlu batas yang jelas.</h2>
          <p>
            Kaswise memakai Supabase dengan Row Level Security, autentikasi yang sudah diperketat,
            dan validasi smoke test untuk alur mobile/PWA sebelum rilis lebih luas.
          </p>
        </div>

        <ul className="landing-trust-list">
          {trustItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="landing-final-cta" aria-label="Mulai menggunakan Kaswise">
        <span className="landing-brand-mark">K</span>
        <h2>Mulai dari transaksi berikutnya.</h2>
        <p>Buka PWA, tulis transaksi pertama, lalu biarkan budget dan laporan ikut membaca kebiasaan belanja Anda.</p>
        <a className="landing-primary" href={appUrl}>Buka Kaswise PWA</a>
      </section>

      <footer className="landing-footer">
        <span>© 2026 Kaswise</span>
        <span>Personal finance PWA untuk pencatatan yang lebih ringan.</span>
      </footer>
    </main>
  )
}
