import LanguageToggle from '@components/i18n/LanguageToggle'

import ThemeToggle from '@components/theme/ThemeToggle'

type LegalPageKind = 'help' | 'terms' | 'privacy' | 'contact'

type LegalSection = {
  title: string
  body: string
}

const supportEmail = 'kaswise.id@gmail.com'
const supportMailto = `mailto:${supportEmail}`

const content: Record<LegalPageKind, {
  eyebrow: string
  title: string
  intro: string
  sections: LegalSection[]
  ctaLabel: string
  ctaHref: string
}> = {
  help: {
    eyebrow: 'Bantuan Kaswise',
    title: 'Bantuan menggunakan Kaswise',
    intro: 'Kaswise dibuat untuk membantu Anda mencatat transaksi, memantau dompet, mengatur budget, dan membaca laporan cashflow dengan lebih mudah.',
    ctaLabel: 'Email bantuan',
    ctaHref: `${supportMailto}?subject=Bantuan%20Kaswise`,
    sections: [
      {
        title: 'Mencatat transaksi harian',
        body: 'Tulis transaksi seperti kebiasaan sehari-hari, misalnya “beli kopi 35rb”. Kaswise membantu merapikan nominal, kategori, tanggal, dan dompet sebelum transaksi disimpan.',
      },
      {
        title: 'Mengelola dompet',
        body: 'Pisahkan uang berdasarkan kas, rekening bank, e-wallet, atau kartu. Total saldo menampilkan seluruh dompet aktif.',
      },
      {
        title: 'Mengatur budget kategori',
        body: 'Buat batas pengeluaran untuk kategori seperti makan, transport, belanja, tagihan, atau kebutuhan lain.',
      },
      {
        title: 'Membaca laporan periode',
        body: 'Gunakan bulan kalender, rentang custom, atau aturan periode seperti 25–24 agar laporan mengikuti siklus gajian.',
      },
      {
        title: 'Menjaga privasi tampilan',
        body: 'Anda dapat menyembunyikan nominal di dashboard saat menggunakan Kaswise di tempat umum.',
      },
    ],
  },
  terms: {
    eyebrow: 'Syarat & ketentuan',
    title: 'Syarat & Ketentuan Kaswise',
    intro: 'Dengan menggunakan Kaswise, Anda menyetujui ketentuan penggunaan berikut.',
    ctaLabel: 'Tanya ketentuan',
    ctaHref: `${supportMailto}?subject=Syarat%20dan%20Ketentuan%20Kaswise`,
    sections: [
      {
        title: 'Penggunaan layanan',
        body: 'Kaswise disediakan sebagai alat bantu pencatatan dan pengelolaan keuangan pribadi. Anda bertanggung jawab atas data yang Anda masukkan dan keputusan finansial yang Anda ambil.',
      },
      {
        title: 'Bukan nasihat keuangan',
        body: 'Informasi, laporan, dan insight di Kaswise tidak dimaksudkan sebagai nasihat keuangan, investasi, pajak, atau hukum.',
      },
      {
        title: 'Akurasi data',
        body: 'Kaswise membantu merapikan dan menampilkan data berdasarkan input pengguna. Pastikan setiap transaksi, kategori, dompet, dan budget sudah sesuai sebelum digunakan sebagai dasar keputusan.',
      },
      {
        title: 'Akun dan keamanan',
        body: 'Anda bertanggung jawab menjaga akses ke akun Anda. Jangan membagikan kredensial login kepada pihak lain.',
      },
      {
        title: 'Penggunaan yang dilarang',
        body: 'Anda tidak boleh menggunakan Kaswise untuk aktivitas ilegal, merusak layanan, mencoba mengakses data pengguna lain, atau menyalahgunakan sistem.',
      },
      {
        title: 'Perubahan layanan',
        body: 'Kaswise dapat memperbarui fitur, tampilan, atau ketentuan layanan dari waktu ke waktu untuk meningkatkan kualitas produk.',
      },
      {
        title: 'Batasan tanggung jawab',
        body: 'Kaswise berupaya menyediakan layanan yang aman dan berguna, namun tidak menjamin bahwa layanan selalu bebas gangguan atau sepenuhnya bebas kesalahan.',
      },
    ],
  },
  privacy: {
    eyebrow: 'Kebijakan privasi',
    title: 'Kebijakan Privasi Kaswise',
    intro: 'Kami memahami bahwa data finansial bersifat sensitif. Kebijakan ini menjelaskan bagaimana Kaswise memperlakukan data pengguna.',
    ctaLabel: 'Tanya privasi',
    ctaHref: `${supportMailto}?subject=Kebijakan%20Privasi%20Kaswise`,
    sections: [
      {
        title: 'Data yang Anda berikan',
        body: 'Kaswise menyimpan data yang Anda masukkan, seperti transaksi, kategori, dompet, budget, periode laporan, dan preferensi aplikasi.',
      },
      {
        title: 'Data akun',
        body: 'Kaswise dapat menggunakan informasi akun seperti email atau identitas autentikasi untuk mengamankan akses pengguna.',
      },
      {
        title: 'Penggunaan data',
        body: 'Data digunakan untuk menjalankan fitur aplikasi, seperti menampilkan saldo dompet, laporan periode, budget kategori, dan riwayat transaksi.',
      },
      {
        title: 'Perlindungan data',
        body: 'Kaswise menggunakan autentikasi dan pembatasan akses data per akun. Setiap pengguna hanya seharusnya dapat mengakses data yang terkait dengan akunnya.',
      },
      {
        title: 'Penyimpanan pihak ketiga',
        body: 'Kaswise dapat menggunakan penyedia infrastruktur seperti Supabase untuk autentikasi, database, dan penyimpanan data aplikasi.',
      },
      {
        title: 'Data yang tidak dijual',
        body: 'Kaswise tidak dirancang untuk menjual data finansial pribadi pengguna kepada pihak ketiga.',
      },
      {
        title: 'Tanggung jawab pengguna',
        body: 'Anda bertanggung jawab menjaga perangkat, browser, email, dan kredensial login agar tidak digunakan oleh pihak yang tidak berwenang.',
      },
      {
        title: 'Perubahan kebijakan',
        body: 'Kebijakan privasi dapat diperbarui seiring perkembangan fitur dan kebutuhan keamanan.',
      },
    ],
  },
  contact: {
    eyebrow: 'Kontak support',
    title: 'Kontak Support Kaswise',
    intro: 'Untuk bantuan, pertanyaan produk, atau laporan masalah, hubungi tim Kaswise melalui email.',
    ctaLabel: supportEmail,
    ctaHref: `${supportMailto}?subject=Support%20Kaswise`,
    sections: [
      {
        title: 'Email support',
        body: supportEmail,
      },
      {
        title: 'Informasi yang membantu saat menghubungi support',
        body: 'Sertakan perangkat yang digunakan, browser atau sistem operasi, fitur yang bermasalah, langkah sebelum masalah muncul, dan screenshot jika diperlukan.',
      },
      {
        title: 'Pertanyaan privasi atau ketentuan',
        body: 'Gunakan email yang sama untuk pertanyaan terkait kebijakan privasi, syarat penggunaan, atau permintaan klarifikasi produk.',
      },
    ],
  },
}

export default function LegalInfoPage({ page }: { page: LegalPageKind }) {
  const item = content[page]

  return (
    <main className="legal-page" data-testid={`legal-page-${page}`}>
      <header className="legal-header" aria-label="Navigasi informasi Kaswise">
        <a className="landing-brand" href="/" aria-label="Kaswise">
          <span className="landing-logo-shell" aria-hidden="true">
            <img src="/brand/logo-kaswise-mark.svg" alt="" />
          </span>
          <span>
            <strong>Kaswise</strong>
            <small>Premium Finance Tracker</small>
          </span>
        </a>
        <div className="landing-header-actions legal-header-actions">
          <ThemeToggle className="landing-theme-toggle" />
          <LanguageToggle className="landing-language-toggle" />
          <nav className="landing-footer-links" aria-label="Menu informasi">
            <a href="/help">Bantuan</a>
            <a href="/terms">Syarat & ketentuan</a>
            <a href="/privacy">Kebijakan privasi</a>
            <a href="/contact">Kontak</a>
          </nav>
        </div>
      </header>

      <section className="legal-hero">
        <span className="landing-eyebrow">{item.eyebrow}</span>
        <h1>{item.title}</h1>
        <p>{item.intro}</p>
        <div className="landing-actions">
          <a className="landing-primary" href={item.ctaHref}>{item.ctaLabel}</a>
          <a className="landing-secondary" href="/">Kembali ke landing</a>
        </div>
      </section>

      <section className="legal-card-list" aria-label={item.title}>
        {item.sections.map((section, index) => (
          <article className="legal-card" key={section.title}>
            <span>{String(index + 1).padStart(2, '0')}</span>
            <div>
              <h2>{section.title}</h2>
              <p>{section.body}</p>
            </div>
          </article>
        ))}
      </section>
    </main>
  )
}
