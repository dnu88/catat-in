import type { CategoryCreate } from './categories';

export type AppLanguage = 'id' | 'en';
export type CategoryCanonicalId =
  | 'food_beverage'
  | 'groceries'
  | 'personal_shopping'
  | 'transport'
  | 'bills'
  | 'health'
  | 'entertainment'
  | 'education'
  | 'sport'
  | 'gifts_donations'
  | 'other_expenses'
  | 'salary'
  | 'bonus'
  | 'freelance';

export type CategoryDefinition = {
  id: CategoryCanonicalId;
  labels: Record<AppLanguage, string>;
  helper: Record<AppLanguage, string>;
  icon: string;
  type: 'income' | 'expense';
  aliases: string[];
};

export const categoryDefinitions: CategoryDefinition[] = [
  {
    id: 'food_beverage',
    labels: { id: 'Makan & Minum', en: 'Food & Beverage' },
    helper: {
      id: 'Siap makan/minum, restoran, kopi, delivery.',
      en: 'Ready-to-eat/drink, restaurants, coffee, delivery.',
    },
    icon: 'food',
    type: 'expense',
    aliases: ['food', 'food beverage', 'food and beverage', 'fnb', 'f&b', 'makanan', 'makanan minuman', 'makanan & minuman', 'makan', 'makan minum', 'makan & minum', 'makan dan minum', 'kuliner'],
  },
  {
    id: 'groceries',
    labels: { id: 'Belanja Bulanan', en: 'Groceries' },
    helper: {
      id: 'Bahan dapur, stok rumah, minimarket.',
      en: 'Kitchen supplies, household stock, minimarket.',
    },
    icon: 'groceries',
    type: 'expense',
    aliases: ['groceries', 'grocery', 'belanja bulanan', 'kebutuhan harian', 'kebutuhan rumah', 'stok rumah', 'sembako', 'bahan pokok', 'supermarket', 'minimarket'],
  },
  {
    id: 'personal_shopping',
    labels: { id: 'Belanja Pribadi', en: 'Personal Shopping' },
    helper: {
      id: 'Baju, skincare, gadget kecil, marketplace.',
      en: 'Clothes, skincare, small gadgets, marketplace.',
    },
    icon: 'groceries',
    type: 'expense',
    aliases: ['belanja pribadi', 'personal shopping', 'shopping', 'belanja', 'marketplace', 'pakaian', 'baju', 'sepatu', 'tas', 'skincare', 'kosmetik', 'parfum', 'aksesoris', 'gadget', 'tokopedia', 'shopee', 'lazada', 'zalora'],
  },
  {
    id: 'transport',
    labels: { id: 'Transportasi', en: 'Transport' },
    helper: { id: 'Ojol, bensin, parkir, tol, kendaraan umum.', en: 'Ride-hailing, fuel, parking, tolls, public transport.' },
    icon: 'transport',
    type: 'expense',
    aliases: ['transport', 'transportasi', 'transportation'],
  },
  {
    id: 'bills',
    labels: { id: 'Tagihan', en: 'Bills' },
    helper: { id: 'Listrik, internet, pulsa, paket data, BPJS.', en: 'Electricity, internet, phone credit, data, insurance.' },
    icon: 'bills',
    type: 'expense',
    aliases: ['tagihan', 'bills', 'bill', 'utilities'],
  },
  {
    id: 'health',
    labels: { id: 'Kesehatan', en: 'Health' },
    helper: { id: 'Obat, dokter, apotek, vitamin.', en: 'Medicine, doctor, pharmacy, vitamins.' },
    icon: 'sport',
    type: 'expense',
    aliases: ['kesehatan', 'health', 'medical'],
  },
  {
    id: 'entertainment',
    labels: { id: 'Hiburan', en: 'Entertainment' },
    helper: { id: 'Streaming, bioskop, game, rekreasi.', en: 'Streaming, cinema, games, recreation.' },
    icon: 'recreation',
    type: 'expense',
    aliases: ['hiburan', 'entertainment', 'recreation', 'rekreasi'],
  },
  {
    id: 'education',
    labels: { id: 'Pendidikan', en: 'Education' },
    helper: { id: 'Buku, kursus, sekolah, kuliah.', en: 'Books, courses, school, college.' },
    icon: 'file',
    type: 'expense',
    aliases: ['pendidikan', 'education', 'school'],
  },
  {
    id: 'sport',
    labels: { id: 'Olahraga', en: 'Sport' },
    helper: { id: 'Gym, futsal, perlengkapan olahraga.', en: 'Gym, sports, sport equipment.' },
    icon: 'sport',
    type: 'expense',
    aliases: ['olahraga', 'sport', 'sports', 'gym', 'fitness', 'futsal'],
  },
  {
    id: 'gifts_donations',
    labels: { id: 'Hadiah & Donasi', en: 'Gifts & Donations' },
    helper: { id: 'Kado, donasi, sedekah, bantuan.', en: 'Gifts, donations, charity, support.' },
    icon: 'gift',
    type: 'expense',
    aliases: ['hadiah', 'donasi', 'gift', 'gifts', 'donation', 'donations', 'kado', 'sedekah', 'amal', 'bantuan'],
  },
  {
    id: 'other_expenses',
    labels: { id: 'Lainnya', en: 'Other expenses' },
    helper: { id: 'Fallback sementara jika belum ada kategori pas.', en: 'Temporary fallback when no category fits.' },
    icon: 'otherExpenses',
    type: 'expense',
    aliases: ['lainnya', 'other', 'other expenses', 'uncategorized', 'misc', 'miscellaneous'],
  },
  {
    id: 'salary',
    labels: { id: 'Gaji', en: 'Salary' },
    helper: { id: 'Gaji dan pendapatan utama.', en: 'Salary and primary income.' },
    icon: 'card',
    type: 'income',
    aliases: ['gaji', 'salary', 'income', 'pendapatan', 'penghasilan'],
  },
  {
    id: 'bonus',
    labels: { id: 'Bonus', en: 'Bonus' },
    helper: { id: 'Bonus, THR, insentif.', en: 'Bonus, holiday allowance, incentives.' },
    icon: 'gift',
    type: 'income',
    aliases: ['bonus', 'thr', 'incentive', 'insentif'],
  },
  {
    id: 'freelance',
    labels: { id: 'Freelance', en: 'Freelance' },
    helper: { id: 'Proyek, klien, kerja sampingan.', en: 'Projects, clients, side work.' },
    icon: 'investment',
    type: 'income',
    aliases: ['freelance', 'proyek', 'project', 'klien', 'client'],
  },
];

export function normalizeCategoryName(value: string | null | undefined) {
  return (value ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

export function getCategoryDefinitionByName(value: string | null | undefined) {
  const normalized = normalizeCategoryName(value);
  if (!normalized) return null;

  return categoryDefinitions.find((definition) => {
    const names = [
      definition.labels.id,
      definition.labels.en,
      ...definition.aliases,
    ].map(normalizeCategoryName);
    return names.includes(normalized);
  }) ?? null;
}

export function getCategoryCanonicalId(value: string | null | undefined) {
  return getCategoryDefinitionByName(value)?.id ?? normalizeCategoryName(value);
}

export function areCategoryNamesEquivalent(
  left: string | null | undefined,
  right: string | null | undefined,
) {
  const leftKey = getCategoryCanonicalId(left);
  const rightKey = getCategoryCanonicalId(right);
  return Boolean(leftKey && rightKey && leftKey === rightKey);
}

export function getLocalizedCategoryName(
  value: string | null | undefined,
  language: AppLanguage,
) {
  return getCategoryDefinitionByName(value)?.labels[language] ?? value ?? '';
}

export function getLocalizedCategoryHelper(
  value: string | null | undefined,
  language: AppLanguage,
) {
  return getCategoryDefinitionByName(value)?.helper[language] ?? null;
}

export function getDefaultCategoryCreates(): Array<Required<Pick<CategoryCreate, 'name' | 'icon' | 'type'>>> {
  return categoryDefinitions.map((definition) => ({
    name: definition.labels.en,
    icon: definition.icon,
    type: definition.type,
  }));
}

export function getMissingDefaultCategoryCreates(existingNames: Array<string | null | undefined>) {
  const existingIds = new Set(existingNames.map(getCategoryCanonicalId).filter(Boolean));
  return getDefaultCategoryCreates().filter(
    (category) => !existingIds.has(getCategoryCanonicalId(category.name)),
  );
}
