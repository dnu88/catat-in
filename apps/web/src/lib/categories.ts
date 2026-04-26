import type { Category, TransactionType } from '@catat-in/shared/types'

export const CATEGORY_LABEL: Record<string, string> = {
  food: 'Makan & Minum',
  transport: 'Transportasi',
  shopping: 'Belanja',
  health: 'Kesehatan',
  entertainment: 'Hiburan',
  education: 'Pendidikan',
  housing: 'Rumah',
  salary: 'Gaji',
  freelance: 'Freelance',
  investment: 'Investasi',
  other: 'Lainnya',
}

export const CATEGORY_EMOJI: Record<string, string> = {
  food: '🍔',
  transport: '🚗',
  shopping: '🛒',
  health: '💊',
  entertainment: '🎬',
  education: '📚',
  housing: '🏠',
  salary: '💼',
  freelance: '💻',
  investment: '📈',
  other: '📦',
}

export function buildCategoryOptions(categories: Category[], type: TransactionType): Array<{ value: string; label: string }> {
  return categories
    .filter((item) => item.type === type)
    .sort((a, b) => a.label.localeCompare(b.label, 'id-ID'))
    .map((item) => ({
      value: item.name,
      label: item.is_default
        ? `${CATEGORY_EMOJI[item.name] || '📦'} ${item.label}`
        : `${item.icon || '🏷️'} ${item.label}`,
    }))
}
