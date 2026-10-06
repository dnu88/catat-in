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
    title: "Panduan singkat Kaswise",
    intro: "Catat transaksi, kelola dompet, dan pahami keuangan Anda dari laporan.",
    ctaLabel: "Email bantuan",
    ctaHref: `${supportMailto}?subject=Bantuan%20Kaswise`,
    sections: [
      { title: "Catat dengan teks", body: "Buka Catat dan tulis transaksi, misalnya ‘makan siang 35 ribu’. Periksa hasil pencatatan dan pastikan nominal, kategori, tanggal, serta dompet sudah sesuai." },
      { title: "Catat dari struk", body: "Di Catat, pilih foto struk yang jelas. Periksa rincian dan total yang terbaca, lalu perbaiki jika ada yang keliru sebelum menyimpan." },
      { title: "Kelola dompet", body: "Buka Dompet untuk memisahkan uang tunai, rekening bank, dan dompet digital. Pilih dompet yang sesuai saat mencatat transaksi agar saldo tetap rapi." },
      { title: "Baca laporan", body: "Buka Laporan dan pilih periode untuk melihat pemasukan, pengeluaran, serta ringkasan per kategori. Laporan mengikuti transaksi yang Anda simpan." },
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
          "Pengguna dapat melihat jalur penghapusan akun dari Settings atau melalui halaman publik account deletion. Pengguna yang login dapat mengirim request penghapusan terautentikasi dari aplikasi.",
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
      "Kaswise menyediakan jalur yang jelas untuk meminta penghapusan akun dan data dari sistem aktif. Pengguna yang login dapat mengirim request langsung dari Settings aplikasi.",
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

const englishLegalPages: Record<MobileLegalPage, MobileLegalContent> = {
  help: {
    eyebrow: "Kaswise help",
    title: "Quick guide to Kaswise",
    intro: "Record transactions, manage wallets, and understand your finances through reports.",
    ctaLabel: "Email support",
    ctaHref: mobileLegalPages.help.ctaHref,
    sections: [
      { title: "Record with text", body: "Open Add transaction and describe a transaction, such as ‘lunch 35 thousand’. Check the recorded result and make sure the amount, category, date, and wallet are correct." },
      { title: "Record from receipts", body: "In Add transaction, choose a clear receipt photo. Review the details and total, then correct any mistakes before saving." },
      { title: "Manage wallets", body: "Open Wallets to separate cash, bank accounts, and digital wallets. Choose the matching wallet when recording a transaction to keep balances organized." },
      { title: "Read reports", body: "Open Reports and choose a period to see income, expenses, and category summaries. Reports reflect the transactions you save." },
    ],
  },
  terms: {
    eyebrow: "Terms of service",
    title: "Kaswise Terms of Service",
    intro:
      "By using Kaswise, you agree to the following terms for this personal finance tracking application.",
    ctaLabel: "Ask about terms",
    ctaHref: `${supportMailto}?subject=Kaswise%20Terms%20of%20Service`,
    sections: [
      {
        title: "Scope of service",
        body:
          "Kaswise is provided as a tool for personal finance tracking and insights. You remain responsible for the data you enter and the financial decisions you make.",
      },
      {
        title: "Not professional advice",
        body:
          "Kaswise does not provide legal, tax, accounting, investment, or professional financial advice. Reports and insights are informational only.",
      },
      {
        title: "Account, use, and premium",
        body:
          "You are responsible for keeping your account access secure and not misusing the service. Premium availability may differ between web/PWA and native while Kaswise follows a platform-compliant release strategy.",
      },
    ],
  },
  privacy: {
    eyebrow: "Privacy policy",
    title: "Kaswise Privacy Policy",
    intro:
      "Financial data is sensitive. This page summarizes how Kaswise collects, uses, and protects user data.",
    ctaLabel: "Ask about privacy",
    ctaHref: `${supportMailto}?subject=Kaswise%20Privacy%20Policy`,
    sections: [
      {
        title: "Data we collect",
        body:
          "Kaswise may process account data, transactions, wallets, budgets, bill reminders, app preferences, and scan/import or AI results when you use those features.",
      },
      {
        title: "How we use data",
        body:
          "Data is used for authentication, showing your financial records and reports, running reminders and entitlements, and processing OCR, import, or AI workflows you request.",
      },
      {
        title: "Infrastructure providers and retention",
        body:
          "Kaswise may use providers such as Supabase, a backend/API, and web/PWA payment processors. Data is kept as long as needed for service operation, security, backup, and lawful obligations.",
      },
      {
        title: "User controls and account deletion",
        body:
          "You can find the account deletion path in Settings or through the public account deletion page. Logged-in users can submit an authenticated deletion request from the app.",
      },
    ],
  },
  contact: {
    eyebrow: "Support contact",
    title: "Contact Kaswise Support",
    intro:
      "For product help, policy questions, or issue reports, contact the Kaswise team by email.",
    ctaLabel: supportEmail,
    ctaHref: `${supportMailto}?subject=Kaswise%20Support`,
    sections: [
      {
        title: "Support email",
        body: supportEmail,
      },
      {
        title: "What to include",
        body:
          "Include your account email, the device you use, the feature with the problem, the steps before the issue appeared, and a screenshot if it helps.",
      },
      {
        title: "Privacy, terms, and account deletion",
        body:
          "Use the same contact for privacy questions, terms of service, or help with account deletion requests.",
      },
    ],
  },
  accountDeletion: {
    eyebrow: "Account deletion",
    title: "Kaswise Account Deletion",
    intro:
      "Kaswise provides a clear path to request deletion of your account and data from the active system. Logged-in users can submit a request directly from Settings.",
    ctaLabel: "Account deletion email",
    ctaHref: `${supportMailto}?subject=Kaswise%20Account%20Deletion`,
    sections: [
      {
        title: "How to request deletion",
        body:
          "If you can still log in, open Settings and submit a deletion request from your active account. If you cannot log in, email support using the relevant Kaswise account address.",
      },
      {
        title: "What we may ask for",
        body:
          "Kaswise may ask for your account email and confirmation as needed to verify that the requester controls the account. Kaswise should avoid asking for unnecessary identity information.",
      },
      {
        title: "What is deleted and what may be kept temporarily",
        body:
          "Kaswise will disable account access and delete or anonymize relevant active data. Some limited data may be kept temporarily for security, backup, anti-fraud, or lawful obligations.",
      },
      {
        title: "Processing time estimate",
        body:
          "Kaswise targets processing account deletion requests within up to 30 days, depending on verification and lawful retention needs.",
      },
    ],
  },
};

/** All legal pages are localized; Indonesian remains the fallback for any future page. */
export function getMobileLegalContent(page: MobileLegalPage, language: "id" | "en"): MobileLegalContent {
  return language === "en" ? englishLegalPages[page] : mobileLegalPages[page];
}
