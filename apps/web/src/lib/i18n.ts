import { useI18nStore } from '@store/i18n.store'

export const messages = {
  id: {
    common: {
      settings: 'Pengaturan',
      transactions: 'Transaksi',
      budgets: 'Anggaran',
      reports: 'Laporan',
      bills: 'Tagihan',
      wallets: 'Dompet',
      groups: 'Grup',
      imports: 'Import',
      dashboard: 'Dashboard',
      activity: 'Aktivitas',
      savedViews: 'Tampilan Tersimpan',
      goals: 'Target',
      loading: 'Memuat...',
      retry: 'Coba lagi',
      save: 'Simpan',
      cancel: 'Batal',
      delete: 'Hapus',
      add: 'Tambah',
      addTransaction: 'Tambah transaksi',
      notifications: 'Notifikasi',
    },
    page: {
      dashboard: {
        title: 'Dashboard',
      },
      reports: {
        title: 'Laporan & Grafik',
      },
      groups: {
        title: 'Grup Keuangan Bersama',
      },
    },
  },
  en: {
    common: {
      settings: 'Settings',
      transactions: 'Transactions',
      budgets: 'Budgets',
      reports: 'Reports',
      bills: 'Bills',
      wallets: 'Wallets',
      groups: 'Groups',
      imports: 'Import',
      dashboard: 'Dashboard',
      activity: 'Activity',
      savedViews: 'Saved Views',
      goals: 'Goals',
      loading: 'Loading...',
      retry: 'Retry',
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      add: 'Add',
      addTransaction: 'Add transaction',
      notifications: 'Notifications',
    },
    page: {
      dashboard: {
        title: 'Dashboard',
      },
      reports: {
        title: 'Reports & Charts',
      },
      groups: {
        title: 'Shared Finance Groups',
      },
    },
  },
} as const

type CommonKey = keyof typeof messages.id.common
type PageKey = keyof typeof messages.id.page

type NestedKey<T> = T extends Record<string, infer V>
  ? V extends Record<string, unknown>
    ? keyof V
    : never
  : never

export function useI18n() {
  const { language } = useI18nStore()

  const t = (key: CommonKey) => messages[language].common[key] || key

  const tp = <P extends PageKey, K extends NestedKey<(typeof messages.id.page)[P]>>(
    page: P,
    key: K,
  ) => {
    const dict = messages[language].page[page] as Record<string, string>
    return dict[String(key)] || `${String(page)}.${String(key)}`
  }

  return { language, t, tp }
}

// Backward compatibility helper
export function useT() {
  const { t } = useI18n()
  return t
}
