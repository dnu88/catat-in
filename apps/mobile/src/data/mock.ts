import type { TabKey } from '../types/navigation'

export const WALLET_OPTIONS = [
  { id: 'bca', label: 'BCA', selected: true },
  { id: 'gopay', label: 'GoPay', selected: true },
  { id: 'mandiri', label: 'Mandiri', selected: false },
  { id: 'ovo', label: 'OVO', selected: false },
] as const

export const BOTTOM_TABS: Array<{ key: TabKey; icon: string; label: string }> = [
  { key: 'home', icon: 'H', label: 'Home' },
  { key: 'transactions', icon: 'T', label: 'Transaksi' },
  { key: 'budgets', icon: 'A', label: 'Anggaran' },
  { key: 'reports', icon: 'L', label: 'Laporan' },
  { key: 'more', icon: 'M', label: 'Lainnya' },
]
