const appUrl = import.meta.env.VITE_KASWISE_APP_URL?.trim() || 'https://kaswise.com'
const appBase = appUrl.replace(/\/+$/, '')
const registerUrl = `${appBase}/register`
const loginUrl = `${appBase}/login`

const flowSteps = [
  {
    title: 'Tulis seperti chat',
    body: 'Contoh: "beli kopi 35rb di Kopi Kenangan". Tidak perlu membuka form panjang atau memilih kategori manual.',
  },
  {
    title: 'Periksa hasil baca',
    body: 'Nominal, kategori, dan tanggal sudah disiapkan. Kalau konteksnya kurang jelas, tetap bisa diedit dulu sebelum disimpan.',
  },
  {
    title: 'Budget ikut berubah',
    body: 'Transaksi yang disimpan langsung terbaca di budget kategori dan laporan bulan berjalan.',
  },
]

// Screenshot PWA asli (mode dark) dikirim user. Isi `img` dengan path di
// /public saat aset siap; selama kosong, slot menampilkan placeholder.
const features = [
  {
    label: 'Capture AI',
    title: 'Catat transaksi dalam satu kalimat',
    body: 'Fokus ke kebiasaan harian: jajan, transport, tagihan, dan transfer kecil yang biasanya cepat terlupa.',
    tone: 'primary',
    shot: 'Layar capture',
    img: '/shots/capture.webp',
  },
  {
    label: 'Budget kategori',
    title: 'Sisa uang terlihat tanpa hitung manual',
    body: 'Warna kategori konsisten antara transaksi dan budget, jadi sisa anggaran langsung kebaca sekilas.',
    tone: 'warning',
    shot: 'Layar budget',
    img: '/shots/budget.webp',
  },
  {
    label: 'Laporan bulanan',
    title: 'Ringkas, bukan dashboard penuh chart',
    body: 'Kaswise menonjolkan arus kas, kategori terbesar, dan pola yang perlu diperhatikan bulan ini.',
    tone: 'info',
    shot: 'Layar laporan',
    img: '/shots/reports.webp',
  },
]

const securityPoints = [
  'Setiap akun terisolasi: hanya kamu yang bisa melihat transaksimu.',
  'Login aman lewat Supabase Auth, dan data dikirim melalui koneksi terenkripsi (HTTPS).',
  'Jalan di browser, bisa dipasang ke layar utama (PWA) di HP maupun laptop.',
]

const faqItems = [
  {
    q: 'Apakah Kaswise gratis?',
    a: 'Ya. Fitur inti (catat transaksi dengan AI, budget kategori, dan laporan bulanan) bisa dipakai gratis. Mulai tanpa kartu kredit.',
  },
  {
    q: 'Apakah data keuangan saya aman?',
    a: 'Setiap akun terisolasi dan hanya bisa diakses olehmu. Login lewat Supabase Auth dan data dikirim melalui koneksi terenkripsi.',
  },
  {
    q: 'Perlu install aplikasi?',
    a: 'Tidak wajib. Kaswise berjalan di browser, dan bisa kamu pasang ke layar utama (PWA) kalau mau rasa seperti aplikasi.',
  },
  {
    q: 'Bisa dipakai di HP dan laptop?',
    a: 'Bisa. Kaswise dirancang mobile-first, tapi tetap nyaman dibuka di laptop untuk meninjau laporan.',
  },
]

export default function LandingPage() {
  return (
    <main className="landing-page" data-testid="web-landing-page">
      <a className="landing-skip" href="#top">Lewati ke konten</a>
      <header className="landing-header" aria-label="Navigasi Kaswise">
        <a className="landing-brand" href="#top" aria-label="Kaswise">
          <span className="landing-logo-shell" aria-hidden="true">
            <img src="/brand/logo-kaswise-mark.svg" alt="" />
          </span>
          <span>
            <strong>kaswise</strong>
            <small>Catat keuangan secepat mengetik chat</small>
          </span>
        </a>

        <nav className="landing-nav" aria-label="Navigasi landing">
          <a href="#kenapa">Kenapa</a>
          <a href="#cara-kerja">Cara kerja</a>
          <a href="#fitur">Fitur</a>
          <a href="#keamanan">Keamanan</a>
        </nav>

        <div className="landing-header-actions">
          <a className="landing-ghost" href={loginUrl}>Masuk</a>
          <a className="landing-nav-cta" href={registerUrl}>Mulai gratis</a>
        </div>
      </header>

      <section id="top" className="landing-hero" aria-labelledby="landing-title">
        <div className="landing-hero-copy">
          <span className="landing-eyebrow">Pencatat keuangan harian</span>
          <h1 id="landing-title">Catat uang keluar sebelum lupa.</h1>
          <p>
            Tulis transaksi seperti mengetik chat. Ketik "beli kopi 35rb di Kopi Kenangan",
            lalu Kaswise yang merapikan nominal, kategori, dan tanggalnya. Tanpa form panjang,
            tanpa spreadsheet.
          </p>

          <div className="landing-actions" aria-label="Aksi utama">
            <a className="landing-primary" href={registerUrl}>Mulai gratis</a>
            <a className="landing-secondary" href="#cara-kerja">Lihat caranya</a>
          </div>

          <div className="landing-proof-strip" aria-label="Ringkasan produk">
            <span>Mulai gratis</span>
            <span>Konteks lokal</span>
            <span>HP &amp; laptop</span>
          </div>
        </div>

        <div className="landing-device-wrap" aria-label="Preview antarmuka Kaswise">
          {/* TODO(screenshot): opsional ganti mockup ini dengan screenshot capture PWA asli */}
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
                <span>Makan &amp; Minum</span>
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

      <section id="kenapa" className="landing-section landing-why-section" aria-labelledby="why-title">
        <div className="landing-section-heading compact">
          <span className="landing-eyebrow">Kenapa Kaswise</span>
          <h2 id="why-title">Mencatat keuangan harusnya secepat mengetik pesan.</h2>
        </div>

        <div className="landing-versus" aria-label="Perbandingan cara mencatat">
          <article className="landing-versus-card landing-versus-old">
            <span className="landing-versus-tag">Cara biasa</span>
            <p>
              Buka aplikasi → pilih kategori → isi nominal → pilih dompet → pilih tanggal →
              simpan. Enam langkah hanya untuk satu kopi, sampai akhirnya malas mencatat.
            </p>
          </article>

          <article className="landing-versus-card landing-versus-new">
            <span className="landing-versus-tag">Cara Kaswise</span>
            <p>
              Tulis "beli kopi 35rb di Kopi Kenangan". Selesai. Sisanya Kaswise yang merapikan.
            </p>
          </article>
        </div>

        <div className="landing-support-points">
          <div className="landing-support-point">
            <span className="landing-icon-bubble landing-icon-bubble-primary" aria-hidden="true">ID</span>
            <div>
              <h3>Paham konteks lokal</h3>
              <p>Kopi Kenangan, QRIS, 35rb, transfer bank: istilah sehari-hari langsung dikenali.</p>
            </div>
          </div>
          <div className="landing-support-point">
            <span className="landing-icon-bubble landing-icon-bubble-info" aria-hidden="true">∙∙</span>
            <div>
              <h3>Ringan, bukan dashboard penuh chart</h3>
              <p>Cukup arus kas, kategori terbesar, dan sisa budget, tanpa UI yang bikin pusing.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="cara-kerja" className="landing-section landing-flow-section" aria-labelledby="flow-title">
        <div className="landing-section-heading">
          <span className="landing-eyebrow">Cara kerja</span>
          <h2 id="flow-title">Tiga langkah, selesai sebelum lupa.</h2>
        </div>

        <div className="landing-flow-list">
          {flowSteps.map((step, index) => (
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

      <section id="fitur" className="landing-section landing-feature-section" aria-labelledby="feature-title">
        <div className="landing-section-heading compact">
          <span className="landing-eyebrow">Yang terasa di pemakaian harian</span>
          <h2 id="feature-title">Lebih sedikit langkah untuk hal yang sering dilakukan.</h2>
        </div>

        <div className="landing-feature-grid">
          {features.map((item) => (
            <article className="landing-feature-card" key={item.title}>
              <div className="landing-shot">
                {item.img ? (
                  <img src={item.img} alt={`Pratinjau ${item.label} Kaswise`} loading="lazy" />
                ) : (
                  <span aria-hidden="true">{item.shot}</span>
                )}
              </div>
              <div className="landing-feature-body">
                <span className={`landing-icon-bubble landing-icon-bubble-${item.tone}`}>
                  {item.label.slice(0, 2)}
                </span>
                <div>
                  <span className="landing-card-label">{item.label}</span>
                  <h3>{item.title}</h3>
                  <p>{item.body}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="keamanan" className="landing-section landing-trust" aria-labelledby="trust-title">
        <div className="landing-trust-copy">
          <span className="landing-eyebrow">Keamanan &amp; transparansi</span>
          <h2 id="trust-title">Data keuanganmu tetap milikmu.</h2>
          <p>
            Kaswise dibuat di Indonesia untuk kebiasaan keuangan sehari-hari di sini. Masih muda
            dan dikembangkan aktif, jadi yang kamu lihat adalah fitur yang benar-benar sudah
            jalan, bukan janji.
          </p>
        </div>

        <ul className="landing-trust-list">
          {securityPoints.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section id="faq" className="landing-section landing-faq-section" aria-labelledby="faq-title">
        <div className="landing-section-heading compact">
          <span className="landing-eyebrow">Pertanyaan umum</span>
          <h2 id="faq-title">Hal yang biasanya ditanyakan dulu.</h2>
        </div>

        <div className="landing-faq-list">
          {faqItems.map((item) => (
            <article className="landing-faq-item" key={item.q}>
              <h3>{item.q}</h3>
              <p>{item.a}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-final-cta" aria-label="Mulai menggunakan Kaswise">
        <span className="landing-logo-shell landing-logo-shell-large" aria-hidden="true">
          <img src="/brand/logo-kaswise-mark.svg" alt="" />
        </span>
        <h2>Mulai dari transaksi berikutnya.</h2>
        <p>
          Buka Kaswise, tulis transaksi pertama, lalu biarkan budget dan laporan ikut membaca
          kebiasaan belanja Anda.
        </p>
        <div className="landing-actions">
          <a className="landing-primary" href={registerUrl}>Mulai gratis</a>
          <a className="landing-ghost landing-ghost-strong" href={loginUrl}>Sudah punya akun? Masuk</a>
        </div>
      </section>

      <footer className="landing-footer">
        <span>© 2026 Kaswise</span>
        <span>Pencatat keuangan personal, dibuat di Indonesia.</span>
      </footer>
    </main>
  )
}
