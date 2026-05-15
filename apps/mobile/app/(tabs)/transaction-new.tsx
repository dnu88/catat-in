import { useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { useRouter } from 'expo-router'

import { KaswiseIcon } from '../../src/components/icons/kaswise-icons'
import type { KaswiseIconName } from '../../src/components/icons/kaswise-icons'
import { IconBubble } from '../../src/components/ui'
import { useTheme } from '../../src/theme/theme-context'
import { createTransaction, type TransactionType } from '../../src/services/transactions'
import { listWallets, type Wallet } from '../../src/services/wallets'
import { listCategories, type Category } from '../../src/services/categories'

type CategoryOption = { name: string; icon: KaswiseIconName }

const categoryIcons: Record<string, KaswiseIconName> = {
  'Makan': 'chart',
  'Transport': 'transactions',
  'Belanja': 'wallets',
  'Hiburan': 'insight',
  'Tagihan': 'bills',
  'Kesehatan': 'budgets',
  'Pendidikan': 'file',
  'Pendapatan': 'card',
  'Lainnya': 'card',
}

const fallbackCategories: CategoryOption[] = [
  { name: 'Makan', icon: 'chart' },
  { name: 'Transport', icon: 'transactions' },
  { name: 'Belanja', icon: 'wallets' },
  { name: 'Hiburan', icon: 'insight' },
  { name: 'Tagihan', icon: 'bills' },
  { name: 'Kesehatan', icon: 'budgets' },
  { name: 'Pendidikan', icon: 'file' },
  { name: 'Pendapatan', icon: 'card' },
  { name: 'Lainnya', icon: 'card' },
]

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

function parseAmount(raw: string): number {
  const cleaned = raw.replace(/[^\d]/g, '')
  if (!cleaned) return 0
  return Number(cleaned)
}

function formatAmount(value: number): string {
  if (!value) return ''
  return value.toLocaleString('id-ID')
}

export default function TransactionNewScreen() {
  const { theme } = useTheme()
  const router = useRouter()
  const styles = useMemo(() => createStyles(theme), [theme])

  const [wallets, setWallets] = useState<Wallet[]>([])
  const [categories, setCategories] = useState<CategoryOption[]>(fallbackCategories)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [txType, setTxType] = useState<TransactionType>('expense')
  const [amountInput, setAmountInput] = useState('')
  const [walletId, setWalletId] = useState<string | null>(null)
  const [category, setCategory] = useState<string>('')
  const [customCategory, setCustomCategory] = useState<string>('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(todayIso())
  const [merchant, setMerchant] = useState('')
  const [note, setNote] = useState('')

  useEffect(() => {
    loadInitialData()
  }, [])

  const loadInitialData = async () => {
    try {
      const [walletData, categoryData] = await Promise.all([
        listWallets(),
        listCategories().catch(() => [] as Category[]),
      ])
      const activeWallets = walletData.filter((w) => w.is_active)
      setWallets(activeWallets)
      if (activeWallets[0]) setWalletId(activeWallets[0].id)

      if (categoryData.length > 0) {
        const merged = categoryData.map((c) => ({ name: c.name, icon: categoryIcons[c.name] || 'card' }))
        const merger = [...merged]
        for (const fc of fallbackCategories) {
          if (!merger.some((m) => m.name.toLowerCase() === fc.name.toLowerCase())) {
            merger.push(fc)
          }
        }
        setCategories(merger)
      }
    } catch (e) {
      console.error('Failed to load form data:', e)
    } finally {
      setLoading(false)
    }
  }

  const amountValue = parseAmount(amountInput)
  const resolvedCategory = (category === '__custom__' ? customCategory : category).trim()
  const resolvedDescription = description.trim()
  const canSubmit =
    amountValue > 0 && resolvedCategory.length > 0 && resolvedDescription.length > 0 && !submitting

  const onSubmit = async () => {
    if (!canSubmit) {
      setError('Lengkapi nominal, kategori, dan deskripsi dulu')
      return
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setError('Format tanggal harus YYYY-MM-DD')
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      await createTransaction({
        wallet_id: walletId,
        transaction_type: txType,
        amount: amountValue,
        category: resolvedCategory,
        description: resolvedDescription,
        merchant: merchant.trim() || null,
        date,
        note: note.trim() || null,
      })
      Alert.alert('Berhasil', 'Transaksi tersimpan.', [
        { text: 'OK', onPress: () => router.replace('/(tabs)/transactions') },
      ])
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Gagal menyimpan transaksi'
      setError(message)
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <View style={[styles.screen, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={theme.colors.brandPrimary} />
      </View>
    )
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Catat Manual</Text>
            <Text style={styles.subtitle}>Input transaksi secara manual tanpa AI.</Text>
          </View>
          <Pressable onPress={() => router.back()} style={styles.closeBtn}>
            <KaswiseIcon name="back" color={theme.colors.textPrimary} size={16} weight="bold" />
          </Pressable>
        </View>

        {/* Type Toggle */}
        <View style={styles.typeRow}>
          {(['expense', 'income'] as TransactionType[]).map((t) => (
            <Pressable
              key={t}
              onPress={() => setTxType(t)}
              style={[
                styles.typeChip,
                txType === t && {
                  backgroundColor: t === 'income' ? theme.colors.success : theme.colors.danger,
                  borderColor: t === 'income' ? theme.colors.success : theme.colors.danger,
                },
              ]}
            >
              <Text
                style={[
                  styles.typeChipText,
                  txType === t && { color: theme.colors.textInverse },
                ]}
              >
                {t === 'expense' ? 'Pengeluaran' : 'Pemasukan'}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Amount */}
        <View style={styles.field}>
          <Text style={styles.label}>Nominal</Text>
          <View style={styles.amountRow}>
            <Text style={styles.amountPrefix}>Rp</Text>
            <TextInput
              style={styles.amountInput}
              value={formatAmount(amountValue)}
              onChangeText={(text) => setAmountInput(text)}
              placeholder="0"
              placeholderTextColor={theme.colors.textMuted}
              keyboardType="numeric"
            />
          </View>
        </View>

        {/* Description */}
        <View style={styles.field}>
          <Text style={styles.label}>Deskripsi</Text>
          <TextInput
            style={styles.textInput}
            value={description}
            onChangeText={setDescription}
            placeholder="contoh: Makan siang di warteg"
            placeholderTextColor={theme.colors.textMuted}
          />
        </View>

        {/* Wallet */}
        <View style={styles.field}>
          <Text style={styles.label}>Dompet</Text>
          {wallets.length === 0 ? (
            <View style={styles.warningCard}>
              <Text style={styles.warningText}>
                Belum ada dompet aktif. Saldo dompet tidak akan terupdate.
              </Text>
            </View>
          ) : (
            <View style={styles.chipRow}>
              {wallets.map((w) => (
                <Pressable
                  key={w.id}
                  onPress={() => setWalletId(w.id)}
                  style={[
                    styles.chip,
                    walletId === w.id && {
                      backgroundColor: theme.colors.brandPrimary,
                      borderColor: theme.colors.brandPrimary,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      walletId === w.id && { color: theme.colors.textInverse },
                    ]}
                  >
                    {w.name}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {/* Category */}
        <View style={styles.field}>
          <Text style={styles.label}>Kategori</Text>
          <View style={styles.chipRow}>
            {categories.map((c) => (
              <Pressable
                key={c.name}
                onPress={() => setCategory(c.name)}
                style={[
                  styles.chip,
                  category === c.name && {
                    backgroundColor: theme.colors.brandPrimary,
                    borderColor: theme.colors.brandPrimary,
                  },
                ]}
              >
                <View style={styles.categoryChipContent}>
                  <IconBubble name={c.icon} tone={category === c.name ? 'accent' : 'primary'} size={22} />
                  <Text
                    style={[
                      styles.chipText,
                      category === c.name && { color: theme.colors.textInverse },
                    ]}
                  >
                    {c.name}
                  </Text>
                </View>
              </Pressable>
            ))}
            <Pressable
              onPress={() => setCategory('__custom__')}
              style={[
                styles.chip,
                category === '__custom__' && {
                  backgroundColor: theme.colors.brandPrimary,
                  borderColor: theme.colors.brandPrimary,
                },
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  category === '__custom__' && { color: theme.colors.textInverse },
                ]}
              >
                + Kustom
              </Text>
            </Pressable>
          </View>
          {category === '__custom__' && (
            <TextInput
              style={styles.textInput}
              value={customCategory}
              onChangeText={setCustomCategory}
              placeholder="Nama kategori"
              placeholderTextColor={theme.colors.textMuted}
            />
          )}
        </View>

        {/* Date */}
        <View style={styles.field}>
          <Text style={styles.label}>Tanggal</Text>
          <TextInput
            style={styles.textInput}
            value={date}
            onChangeText={setDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={theme.colors.textMuted}
            autoCapitalize="none"
          />
        </View>

        {/* Merchant */}
        <View style={styles.field}>
          <Text style={styles.label}>Merchant (opsional)</Text>
          <TextInput
            style={styles.textInput}
            value={merchant}
            onChangeText={setMerchant}
            placeholder="contoh: Indomaret"
            placeholderTextColor={theme.colors.textMuted}
          />
        </View>

        {/* Note */}
        <View style={styles.field}>
          <Text style={styles.label}>Catatan (opsional)</Text>
          <TextInput
            style={[styles.textInput, { minHeight: 70, textAlignVertical: 'top' }]}
            value={note}
            onChangeText={setNote}
            placeholder="contoh: bayar grab dari kantor pulang"
            placeholderTextColor={theme.colors.textMuted}
            multiline
          />
        </View>

        {error && <Text style={styles.errorText}>{error}</Text>}

        <Pressable
          onPress={onSubmit}
          disabled={!canSubmit}
          style={[styles.submitButton, !canSubmit && { opacity: 0.4 }]}
        >
          {submitting ? (
            <ActivityIndicator color={theme.colors.textInverse} />
          ) : (
            <Text style={styles.submitText}>Simpan Transaksi</Text>
          )}
        </Pressable>

        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  )
}

function createStyles(theme: ReturnType<typeof useTheme>['theme']) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.colors.background },
    content: { padding: 20, gap: 16, paddingBottom: 30 },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 12,
    },
    title: { color: theme.colors.textPrimary, fontSize: 26, fontWeight: '800', letterSpacing: -0.4 },
    subtitle: { color: theme.colors.textSecondary, fontSize: 13, marginTop: 2 },
    closeBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.colors.mutedSurface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    typeRow: { flexDirection: 'row', gap: 10 },
    typeChip: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.borderSoft,
      backgroundColor: theme.colors.surface,
      alignItems: 'center',
    },
    typeChipText: { color: theme.colors.textPrimary, fontSize: 14, fontWeight: '700' },
    field: { gap: 8 },
    label: { color: theme.colors.textSecondary, fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
    amountRow: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.colors.borderStrong,
      borderRadius: 12,
      backgroundColor: theme.colors.surface,
      paddingHorizontal: 14,
      paddingVertical: 10,
      gap: 8,
    },
    amountPrefix: { color: theme.colors.textSecondary, fontSize: 16, fontWeight: '700' },
    amountInput: { flex: 1, color: theme.colors.textPrimary, fontSize: 20, fontWeight: '800' },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: theme.colors.borderSoft,
      backgroundColor: theme.colors.surface,
    },
    chipText: { color: theme.colors.textSecondary, fontSize: 12, fontWeight: '700' },
    categoryChipContent: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    textInput: {
      borderWidth: 1,
      borderColor: theme.colors.borderStrong,
      borderRadius: 12,
      backgroundColor: theme.colors.surface,
      color: theme.colors.textPrimary,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 14,
    },
    warningCard: {
      padding: 12,
      borderRadius: 10,
      backgroundColor: `${theme.colors.warning}15`,
      borderWidth: 1,
      borderColor: `${theme.colors.warning}40`,
    },
    warningText: { color: theme.colors.warning, fontSize: 12, fontWeight: '600' },
    errorText: {
      color: theme.colors.danger,
      fontSize: 12,
      fontWeight: '600',
      backgroundColor: `${theme.colors.danger}10`,
      padding: 10,
      borderRadius: 10,
    },
    submitButton: {
      backgroundColor: theme.colors.brandPrimary,
      borderRadius: 999,
      paddingVertical: 16,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 4,
    },
    submitText: { color: theme.colors.textInverse, fontSize: 15, fontWeight: '800' },
  })
}
