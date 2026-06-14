export type MobileLegalPage = "help" | "terms" | "privacy" | "contact" | "accountDeletion";

type LegalSection = {
  title: string;
  body: string;
};

export type MobileLegalContent = {
  eyebrow: string;
  title: string;
  intro: string;
  ctaLabel: string;
  ctaHref: string;
  sections: LegalSection[];
};

const supportEmail = "kaswise.id@gmail.com";
const supportMailto = `mailto:${supportEmail}`;

export const mobileLegalPages: Record<MobileLegalPage, MobileLegalContent> = {
  help: {
    eyebrow: "Bantuan Kaswise",
    title: "Bantuan menggunakan Kaswise",
    intro:
      "Kaswise membantu Anda mencatat transaksi, memantau dompet, mengatur budget, dan membaca laporan cashflow dengan cara yang tetap sederhana.",
    ctaLabel: "Email bantuan",
    ctaHref: `${supportMailto}?subject=Bantuan%20Kaswise`,
    sections: [
      {
        title: "Catat transaksi harian",
        body:
          "Tulis transaksi seperti kebiasaan sehari-hari. Kaswise membantu merapikan nominal, kategori, tanggal, dan dompet sebelum transaksi disimpan.",
      },
      {
        title: "Pantau dompet dan budget",
        body:
          "Pisahkan saldo per kas, rekening, atau e-wallet, lalu gunakan budget kategori untuk membaca arah pengeluaran tanpa membuat alur jadi rumit.",
      },
      {
        title: "Gunakan Capture AI seperlunya",
        body:
          "Track A saat ini menonjolkan alur yang benar-benar aktif: input teks dan foto struk OCR. Jika butuh bantuan, hubungi support Kaswise.",
      },
    ],
  },
  terms: {
    eyebrow: "Syarat layanan",
    title: "Syarat Layanan Kaswise",
    intro:
      "Dengan menggunakan Kaswise, Anda menyetujui ketentuan penggunaan berikut untuk aplikasi pencatatan keuangan pribadi ini.",
    ctaLabel: "Tanya ketentuan",
    ctaHref: `${supportMailto}?subject=Syarat%20Layanan%20Kaswise`,
    sections: [
      {
        title: "Ruang lingkup layanan",
        body:
          "Kaswise disediakan sebagai alat bantu pencatatan dan insight keuangan pribadi. Anda tetap bertanggung jawab atas data yang dimasukkan dan keputusan finansial yang diambil.",
      },
      {
        title: "Bukan nasihat profesional",
        body:
          "Kaswise tidak memberikan nasihat hukum, pajak, akuntansi, investasi, atau nasihat keuangan profesional. Laporan dan insight hanya bersifat informasional.",
      },
      {
        title: "Akun, penggunaan, dan premium",
        body:
          "Anda bertanggung jawab menjaga akses akun dan tidak menyalahgunakan layanan. Ketersediaan premium dapat berbeda antara web/PWA dan native selama Kaswise mengikuti strategi rilis yang patuh platform.",
      },
    ],
  },
  privacy: {
    eyebrow: "Kebijakan privasi",
    title: "Kebijakan Privasi Kaswise",
    intro:
      "Data finansial bersifat sensitif. Halaman ini merangkum bagaimana Kaswise mengumpulkan, menggunakan, dan menjaga data pengguna.",
    ctaLabel: "Tanya privasi",
    ctaHref: `${supportMailto}?subject=Kebijakan%20Privasi%20Kaswise`,
    sections: [
      {
        title: "Data yang dikumpulkan",
        body:
          "Kaswise dapat memproses data akun, transaksi, dompet, budget, pengingat tagihan, preferensi aplikasi, serta hasil scan/import atau AI ketika Anda menggunakan fitur tersebut.",
      },
      {
        title: "Penggunaan data",
        body:
          "Data digunakan untuk autentikasi, menampilkan catatan keuangan dan laporan, menjalankan reminder dan entitlement, serta memproses OCR, import, atau workflow AI yang memang diminta pengguna.",
      },
      {
        title: "Penyedia infrastruktur dan retensi",
        body:
          "Kaswise dapat memakai penyedia seperti Supabase, backend/API, dan pemroses pembayaran web/PWA. Data disimpan selama dibutuhkan untuk operasi layanan, keamanan, backup, dan kewajiban hukum yang sah.",
      },
      {
        title: "Kontrol pengguna dan penghapusan akun",
        body:
          "Pengguna dapat melihat jalur penghapusan akun dari Settings atau melalui halaman publik account deletion. Untuk Track A, pengguna login dapat mengirim request penghapusan terautentikasi dari aplikasi.",
      },
    ],
  },
  contact: {
    eyebrow: "Kontak support",
    title: "Kontak Support Kaswise",
    intro:
      "Untuk bantuan produk, pertanyaan kebijakan, atau laporan masalah, hubungi tim Kaswise melalui email.",
    ctaLabel: supportEmail,
    ctaHref: `${supportMailto}?subject=Support%20Kaswise`,
    sections: [
      {
        title: "Email support",
        body: supportEmail,
      },
      {
        title: "Apa yang sebaiknya disertakan",
        body:
          "Sertakan email akun, perangkat yang digunakan, fitur yang bermasalah, langkah sebelum masalah muncul, dan screenshot jika memang membantu.",
      },
      {
        title: "Privasi, ketentuan, dan penghapusan akun",
        body:
          "Gunakan kontak yang sama untuk pertanyaan privasi, syarat layanan, atau bantuan terkait request penghapusan akun.",
      },
    ],
  },
  accountDeletion: {
    eyebrow: "Penghapusan akun",
    title: "Penghapusan Akun Kaswise",
    intro:
      "Kaswise menyediakan jalur yang jelas untuk meminta penghapusan akun dan data dari sistem aktif. Untuk Track A, pengguna login dapat mengirim request langsung dari Settings aplikasi.",
    ctaLabel: "Email penghapusan akun",
    ctaHref: `${supportMailto}?subject=Permintaan%20Penghapusan%20Akun%20Kaswise`,
    sections: [
      {
        title: "Cara meminta penghapusan",
        body:
          "Jika Anda masih bisa login, buka Settings dan kirim request penghapusan akun dari akun aktif Anda. Jika tidak bisa login, gunakan email support dengan alamat akun Kaswise yang relevan.",
      },
      {
        title: "Apa yang diminta dari pengguna",
        body:
          "Kaswise dapat meminta email akun dan konfirmasi seperlunya untuk memastikan requester benar-benar menguasai akun. Kaswise harus menghindari meminta identitas yang tidak perlu.",
      },
      {
        title: "Apa yang dihapus dan apa yang mungkin disimpan sementara",
        body:
          "Kaswise akan menonaktifkan akses akun dan menghapus atau menganonimkan data aktif yang relevan. Sebagian data terbatas dapat dipertahankan sementara untuk keamanan, backup, anti-fraud, atau kewajiban hukum yang sah.",
      },
      {
        title: "Estimasi waktu proses",
        body:
          "Kaswise menargetkan pemrosesan request penghapusan akun dalam waktu hingga 30 hari, bergantung pada verifikasi dan kebutuhan retensi yang sah.",
      },
    ],
  },
};
