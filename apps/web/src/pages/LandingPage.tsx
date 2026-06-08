import LanguageToggle from '@components/i18n/LanguageToggle'

import ThemeToggle from '@components/theme/ThemeToggle'

const appUrl = import.meta.env.VITE_KASWISE_APP_URL?.trim() || 'https://kaswise.com'
const supportEmail = 'kaswise.id@gmail.com'
const supportMailto = `mailto:${supportEmail}`

const heroStats = [
  { value: '5 modul', label: 'Capture, wallet, budget, transaksi, dan laporan' },
  { value: '25–24', label: 'Siap untuk siklus gajian dan periode custom' },
  { value: 'PWA', label: 'Buka cepat dari browser atau layar utama' },
]

const quickMenus = [
  { href: '#masalah', label: 'Masalah', body: 'Kenapa uang terasa bocor' },
  { href: '#sistem', label: 'Cara kerja', body: 'Catat, budget, review' },
  { href: '#periode', label: 'Periode gajian', body: 'Laporan 25–24 dan custom' },
  { href: '#faq', label: 'FAQ', body: 'Jawaban sebelum mulai' },
]

const problems = [
  {
    title: 'Transaksi kecil cepat terlupa',
    body: 'Kopi, parkir, transport, dan jajan kecil sering hilang dari catatan. Akumulasinya baru terasa di akhir periode.',
  },
  {
    title: 'Budget tidak ikut update',
    body: 'Budget yang terpisah dari transaksi membuat Anda tetap harus menghitung ulang sebelum mengambil keputusan belanja.',
  },
  {
    title: 'Laporan tidak cocok dengan tanggal gajian',
    body: 'Bulan kalender tidak selalu sama dengan realita cashflow. Banyak orang butuh periode seperti 25–24.',
  },
  {
    title: 'Saldo sering dikira performa bulanan',
    body: 'Total saldo adalah aset di dompet aktif. Cashflow periode perlu dibaca terpisah agar keputusan lebih jelas.',
  },
]

const dailySystem = [
  {
    title: 'Tulis seperti chat',
    body: 'Contoh: “beli kopi 35rb di Kopi Kenangan”. Kaswise membantu menyiapkan nominal, kategori, tanggal, dan dompet untuk dicek.',
  },
  {
    title: 'Kaswise rapikan datanya',
    body: 'Transaksi tersimpan dengan konteks yang konsisten, sehingga dompet, budget kategori, dan riwayat transaksi langsung ikut bergerak.',
  },
  {
    title: 'Review cashflow periode aktif',
    body: 'Dashboard, Reports, dan Transactions membaca periode yang sama agar Anda tahu sisa ruang belanja sebelum keputusan berikutnya.',
  },
]

const periodHighlights = [
  'Pakai bulan kalender saat ingin membaca performa bulanan standar.',
  'Pakai rentang custom untuk kebutuhan audit, liburan, tagihan, atau proyek tertentu.',
  'Simpan aturan seperti 25–24 agar laporan mengikuti siklus gajian Anda.',
  'Dashboard, Reports, dan Transactions tetap sinkron dengan periode aktif yang sama.',
]

const appHighlights = [
  {
    label: 'Capture pintar',
    title: 'Input pendek, hasil tetap rapi',
    body: 'Cocok untuk transaksi kecil yang sering terlupa: kopi, parkir, transport, jajan, transfer, sampai tagihan rutin.',
    tone: 'primary',
  },
  {
    label: 'Dompet & saldo',
    title: 'Pisahkan kas, bank, e-wallet, dan kartu',
    body: 'Pantau total saldo semua dompet aktif tanpa mencampurnya dengan performa bulanan atau cashflow periode.',
    tone: 'info',
  },
  {
    label: 'Budget kategori',
    title: 'Tahu batas sebelum kebablasan',
    body: 'Budget makan, transport, belanja, dan kebutuhan lain tampil dengan sisa yang mudah dipahami setiap hari.',
    tone: 'warning',
  },
  {
    label: 'Laporan periode',
    title: 'Bulan kalender atau siklus gajian',
    body: 'Pilih bulan ini, rentang custom, atau simpan aturan seperti 25–24 agar laporan mengikuti realita arus kas Anda.',
    tone: 'primary',
  },
  {
    label: 'Transaksi',
    title: 'Cari dan audit pengeluaran cepat',
    body: 'Filter transaksi mengikuti periode laporan aktif, jadi dashboard, reports, dan daftar transaksi tetap sinkron.',
    tone: 'info',
  },
  {
    label: 'Privasi mobile',
    title: 'Nominal bisa disembunyikan saat di luar',
    body: 'Mode sembunyikan nominal dan tema terang/gelap membantu Kaswise tetap nyaman dipakai di situasi harian.',
    tone: 'warning',
  },
]

const previewPanels = [
  {
    title: 'Dashboard',
    label: 'Sisa periode ini',
    value: 'Rp3.420.000',
    body: 'Hero menampilkan cashflow periode aktif. Total saldo semua dompet tetap dibaca sebagai metrik terpisah.',
  },
  {
    title: 'Capture',
    label: 'Input cepat',
    value: 'beli kopi 35rb',
    body: 'Catat transaksi seperti percakapan, lalu cek hasil baca sebelum disimpan.',
  },
  {
    title: 'Reports',
    label: 'Cycle Salary',
    value: '25 Mei – 24 Jun',
    body: 'Laporan mengikuti aturan periode yang Anda pilih, termasuk siklus gajian.',
  },
]

const trustItems = [
  'PWA sudah live dan bisa dipasang ke layar utama.',
  'Akses data dibatasi per akun dengan autentikasi dan Row Level Security.',
  'Fitur yang ditampilkan di landing mengikuti kemampuan produk Kaswise yang tersedia.',
]

const faqs = [
  {
    question: 'Apa itu Kaswise?',
    answer: 'Kaswise adalah personal finance PWA untuk mencatat transaksi, mengelola dompet, mengatur budget, dan membaca laporan cashflow harian maupun periode custom.',
  },
  {
    question: 'Apakah bisa digunakan di HP?',
    answer: 'Bisa. Kaswise dibuat mobile-first sebagai PWA, sehingga bisa dibuka dari browser dan dipasang ke layar utama perangkat yang mendukung.',
  },
  {
    question: 'Apakah bisa pakai periode gajian seperti 25–24?',
    answer: 'Bisa. Anda dapat memilih rentang custom dan menyimpan aturan periode bulanan agar laporan mengikuti siklus gajian atau tagihan.',
  },
  {
    question: 'Apa beda Total saldo dan Sisa periode ini?',
    answer: 'Total saldo adalah jumlah seluruh dompet aktif. Sisa periode ini adalah cashflow periode aktif: pemasukan dikurangi pengeluaran pada rentang laporan yang dipilih.',
  },
  {
    question: 'Apakah data saya aman?',
    answer: 'Kaswise menggunakan autentikasi dan pembatasan akses data per akun. Anda tetap perlu menjaga perangkat, email, dan kredensial login agar tidak digunakan pihak lain.',
  },
  {
    question: 'Apakah Kaswise menggantikan nasihat keuangan?',
    answer: 'Tidak. Kaswise adalah alat bantu pencatatan dan pengelolaan uang pribadi, bukan pengganti nasihat keuangan, pajak, investasi, atau hukum profesional.',
  },
]

export default function LandingPage() {
  return (
    <main className="landing-page" data-testid="web-landing-page">
      <header className="landing-header" aria-label="Navigasi Kaswise">
        <a className="landing-brand" href="#top" aria-label="Kaswise">
          <span className="landing-logo-shell" aria-hidden="true">
            <img src="/brand/logo-kaswise-mark.svg" alt="" />
          </span>
          <span>
            <strong>kaswise</strong>
            <small>Premium finance tracker</small>
          </span>
        </a>

        <nav className="landing-nav" aria-label="Navigasi landing">
          <a href="#top">Produk</a>
          <a href="#masalah">Masalah</a>
          <a href="#sistem">Cara kerja</a>
          <a href="#periode">Periode</a>
          <a href="#fitur">Fitur</a>
          <a href="#faq">FAQ</a>
        </nav>

        <div className="landing-header-actions">
          <ThemeToggle className="landing-theme-toggle" />
          <LanguageToggle className="landing-language-toggle" />
          <a className="landing-nav-cta" href={appUrl}>Buka aplikasi</a>
        </div>
      </header>

      <section id="top" className="landing-hero landing-hero--ledger-grid" aria-labelledby="landing-title">
        <div className="landing-hero-copy">
          <span className="landing-eyebrow">All-in-one finance tracker</span>
          <h1 id="landing-title">Kontrol uang harian tanpa spreadsheet.</h1>
          <p>
            Kaswise membantu Anda mencatat transaksi cepat, menjaga budget, dan membaca cashflow
            sesuai periode hidup nyata seperti siklus gajian.
          </p>

          <div className="landing-actions" aria-label="Aksi utama">
            <a className="landing-primary" href={appUrl}>Buka Kaswise PWA</a>
            <a className="landing-secondary" href="#sistem">Lihat cara kerja</a>
          </div>

          <div className="landing-proof-strip" aria-label="Ringkasan produk">
            <span>PWA mobile-first</span>
            <span>Budget & reports</span>
            <span>Periode gajian</span>
          </div>

          <nav className="landing-quick-menu" aria-label="Pilih bagian landing page">
            {quickMenus.map((item) => (
              <a href={item.href} key={item.href}>
                <strong>{item.label}</strong>
                <span>{item.body}</span>
              </a>
            ))}
          </nav>

          <div className="landing-stat-grid" aria-label="Ringkasan kemampuan Kaswise">
            {heroStats.map((item) => (
              <div className="landing-stat-card" key={item.value}>
                <strong>{item.value}</strong>
                <span>{item.label}</span>
              </div>
            ))}
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
                <span>Periode aktif</span>
                <strong>Sisa periode ini</strong>
              </div>
              <span className="landing-profile-avatar" aria-hidden="true">RP</span>
            </div>

            <div className="landing-balance-card">
              <span className="landing-card-label">Cashflow 25 Mei – 24 Jun</span>
              <strong>Rp3.420.000</strong>
              <p>Pemasukan dikurangi pengeluaran untuk periode laporan aktif.</p>
            </div>

            <div className="landing-review-card">
              <div className="landing-review-head">
                <span>Input cepat</span>
                <strong>Siap dicek</strong>
              </div>
              <div className="landing-capture-card compact">
                <p>beli kopi 35rb di Kopi Kenangan</p>
              </div>
              <div className="landing-chip-row" aria-label="Hasil pembacaan transaksi">
                <span>Rp35.000</span>
                <span>Makan & Minum</span>
                <span>Hari ini</span>
              </div>
            </div>

            <div className="landing-budget-card">
              <div className="landing-budget-copy">
                <span>Total saldo semua dompet</span>
                <strong>Rp12.840.000</strong>
              </div>
              <div className="landing-progress" aria-label="Budget makan tersisa 72 persen">
                <span />
              </div>
            </div>

            <div className="landing-tabbar" aria-hidden="true">
              <span className="active">Beranda</span>
              <span>Transaksi</span>
              <span>Laporan</span>
            </div>
          </div>
        </div>
      </section>

      <section id="masalah" className="landing-section landing-problem-section" aria-labelledby="problem-title">
        <div className="landing-section-heading compact">
          <p className="landing-section-kicker">Masalah yang nyata</p>
          <h2 id="problem-title">Uang sering bocor bukan karena besar, tapi karena tidak terlihat.</h2>
        </div>

        <div className="landing-problem-grid">
          {problems.map((item) => (
            <article className="landing-problem-card" key={item.title}>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="sistem" className="landing-section landing-flow-section" aria-labelledby="flow-title">
        <div className="landing-section-heading">
          <p className="landing-section-kicker">Cara kerja</p>
          <h2 id="flow-title">Dari catat transaksi sampai paham cashflow.</h2>
        </div>

        <div className="landing-flow-list">
          {dailySystem.map((step, index) => (
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

      <section id="periode" className="landing-section landing-period" aria-labelledby="period-title">
        <div>
          <span className="landing-eyebrow">Pembeda utama</span>
          <h2 id="period-title">Laporan mengikuti realita cashflow Anda, bukan cuma kalender.</h2>
          <p>
            Banyak orang menerima gaji, membayar tagihan, dan mengatur belanja di siklus yang tidak selalu dimulai tanggal 1.
            Kaswise membuat periode laporan bisa mengikuti pola tersebut.
          </p>
        </div>
        <ul className="landing-period-list">
          {periodHighlights.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section id="fitur" className="landing-section landing-highlight-section" aria-labelledby="feature-title">
        <div className="landing-section-heading compact">
          <p className="landing-section-kicker">Fitur utama</p>
          <h2 id="feature-title">Satu tempat untuk mencatat, mengatur, dan membaca uang Anda.</h2>
        </div>

        <div className="landing-highlight-grid landing-highlight-grid-large">
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

      <section className="landing-section landing-preview-section" aria-labelledby="preview-title">
        <div className="landing-section-heading compact">
          <p className="landing-section-kicker">Preview produk</p>
          <h2 id="preview-title">Tiga layar utama untuk keputusan uang harian.</h2>
        </div>

        <div className="landing-preview-grid">
          {previewPanels.map((panel) => (
            <article className="landing-preview-card" key={panel.title}>
              <div className="landing-preview-window">
                <span>{panel.title}</span>
                <strong>{panel.value}</strong>
                <small>{panel.label}</small>
              </div>
              <h3>{panel.title}</h3>
              <p>{panel.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="keamanan" className="landing-section landing-trust" aria-labelledby="trust-title">
        <div className="landing-trust-copy">
          <span className="landing-eyebrow">Keamanan & kesiapan</span>
          <h2 id="trust-title">Data finansial perlu fondasi yang serius.</h2>
          <p>
            Kaswise memakai Supabase dengan Row Level Security, autentikasi yang diperketat,
            dan validasi mobile/PWA sebelum perubahan dirilis ke production.
          </p>
        </div>

        <ul className="landing-trust-list">
          {trustItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section id="faq" className="landing-section landing-faq" aria-labelledby="faq-title">
        <div className="landing-section-heading compact">
          <p className="landing-section-kicker">FAQ</p>
          <h2 id="faq-title">Pertanyaan umum sebelum mulai menggunakan Kaswise.</h2>
        </div>

        <div className="landing-faq-list">
          {faqs.map((item) => (
            <details className="landing-faq-item" key={item.question}>
              <summary>{item.question}</summary>
              <p>{item.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section id="bantuan" className="landing-section landing-help" aria-labelledby="help-title">
        <div className="landing-section-heading compact">
          <p className="landing-section-kicker">Pusat informasi</p>
          <h2 id="help-title">Bantuan, syarat penggunaan, dan privasi dibuat mudah ditemukan.</h2>
        </div>

        <div className="landing-help-grid">
          <article className="landing-help-card" id="bantuan-produk">
            <span className="landing-card-label">Bantuan</span>
            <h3>Butuh bantuan menggunakan Kaswise?</h3>
            <p>Mulai dari membuka PWA, mencatat transaksi, mengatur dompet, sampai membaca laporan periode aktif.</p>
            <a href="/help">Buka bantuan</a>
          </article>

          <article className="landing-help-card" id="syarat-ketentuan">
            <span className="landing-card-label">Syarat & ketentuan</span>
            <h3>Gunakan Kaswise untuk pencatatan pribadi yang bertanggung jawab.</h3>
            <p>Informasi di Kaswise membantu pengelolaan uang harian dan bukan pengganti nasihat keuangan profesional.</p>
            <a href="/terms">Baca ketentuan</a>
          </article>

          <article className="landing-help-card" id="kebijakan-privasi">
            <span className="landing-card-label">Kebijakan privasi</span>
            <h3>Data finansial perlu perlindungan dan batas akses yang jelas.</h3>
            <p>Kaswise memakai autentikasi dan Row Level Security untuk membantu menjaga data sesuai akun pengguna.</p>
            <a href="/privacy">Baca privasi</a>
          </article>
        </div>
      </section>

      <section className="landing-final-cta" aria-label="Mulai menggunakan Kaswise">
        <span className="landing-logo-shell landing-logo-shell-large" aria-hidden="true">
          <img src="/brand/logo-kaswise-mark.svg" alt="" />
        </span>
        <h2>Mulai rapikan uang dari transaksi berikutnya.</h2>
        <p>
          Buka PWA, catat pengeluaran pertama, lalu biarkan dompet, budget,
          transaksi, dan laporan periode ikut tersusun otomatis.
        </p>
        <a className="landing-primary" href={appUrl}>Buka Kaswise PWA</a>
      </section>

      <footer className="landing-footer landing-footer-rich">
        <div className="landing-footer-brand">
          <strong>Kaswise</strong>
          <span>Premium finance tracker untuk kontrol uang harian.</span>
          <small>© 2026 Kaswise. All rights reserved.</small>
        </div>
        <nav className="landing-footer-column" aria-label="Menu produk">
          <strong>Produk</strong>
          <a href="#sistem">Cara kerja</a>
          <a href="#fitur">Fitur</a>
          <a href="#periode">Laporan periode</a>
          <a href="#keamanan">Keamanan</a>
        </nav>
        <nav className="landing-footer-column" aria-label="Menu informasi">
          <strong>Informasi</strong>
          <a href="/help">Bantuan</a>
          <a href="/terms">Syarat & ketentuan</a>
          <a href="/privacy">Kebijakan privasi</a>
          <a href="/contact">Kontak support</a>
        </nav>
        <div className="landing-footer-column">
          <strong>Hubungi kami</strong>
          <a href={supportMailto}>{supportEmail}</a>
          <span>Untuk bantuan produk, laporan masalah, atau pertanyaan privasi.</span>
        </div>
      </footer>
    </main>
  )
}
