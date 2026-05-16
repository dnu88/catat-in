import type { TabKey } from '../types/navigation'

export const WALLET_OPTIONS = [
  { id: 'bca', label: 'BCA', selected: true },
  { id: 'gopay', label: 'GoPay', selected: true },
  { id: 'mandiri', label: 'Mandiri', selected: false },
  { id: 'ovo', label: 'OVO', selected: false },
] as const

export const BOTTOM_TABS: Array<{ key: TabKey; icon: 'home' | 'transactions' | 'budgets' | 'reports' | 'settings'; label: string }> = [
  { key: 'home', icon: 'home', label: 'Beranda' },
  { key: 'transactions', icon: 'transactions', label: 'Transaksi' },
  { key: 'budgets', icon: 'budgets', label: 'Anggaran' },
  { key: 'reports', icon: 'reports', label: 'Laporan' },
  { key: 'more', icon: 'settings', label: 'Setelan' },
]
