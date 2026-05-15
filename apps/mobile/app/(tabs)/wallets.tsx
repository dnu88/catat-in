import { useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'

import type { KaswiseIconName } from '../../src/components/icons/kaswise-icons'
import { IconBubble } from '../../src/components/ui'
import { useTheme } from '../../src/theme/theme-context'
import { listWallets, type Wallet } from '../../src/services/wallets'

type WalletType = 'bank' | 'cash'

const typeLabels: Record<WalletType, string> = {
  bank: 'Bank',
  cash: 'Tunai',
}

const typeColors: Record<WalletType, string> = {
  bank: '#2563EB',
  cash: '#10B981',
}

const typeIcons: Record<WalletType, KaswiseIconName> = {
  bank: 'card',
  cash: 'wallets',
}

type FilterType = 'all' | WalletType

export default function WalletsScreen() {
  const { theme } = useTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const [filter, setFilter] = useState<FilterType>('all')
  const [wallets, setWallets] = useState<Wallet[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadWallets()
  }, [])

  const loadWallets = async () => {
    try {
      const data = await listWallets()
      setWallets(data.filter(w => w.is_active))
    } catch (error) {
      console.error('Error loading wallets:', error)
    } finally {
      setLoading(false)
    }
  }

  const filtered = filter === 'all' ? wallets : wallets.filter((w) => w.type === filter)
  const totalBalance = wallets.reduce((a, b) => a + (b.balance || 0), 0)

  if (loading) {
    return (
      <View style={[styles.screen, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={theme.colors.brandPrimary} />
      </View>
    )
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Dompet</Text>
            <Text style={styles.subtitle}>Kelola semua saldo akunmu.</Text>
          </View>
          <Pressable style={styles.addButton}>
            <Text style={styles.addButtonText}>+ Baru</Text>
          </Pressable>
        </View>

        {/* Total Balance Card */}
        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>Total Saldo Semua Akun</Text>
          <Text style={styles.totalValue}>Rp {totalBalance.toLocaleString('id-ID')}</Text>
          <View style={styles.totalRow}>
            <View style={styles.totalChip}>
              <Text style={styles.totalChipText}>{wallets.length} akun aktif</Text>
            </View>
          </View>
        </View>

        {/* Filter Row */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {(['all', 'bank', 'cash'] as FilterType[]).map((f) => (
            <Pressable
              key={f}
              onPress={() => setFilter(f)}
              style={[
                styles.filterChip,
                filter === f && { backgroundColor: theme.colors.brandPrimary, borderColor: theme.colors.brandPrimary },
              ]}
            >
              <Text
                style={[
                  styles.filterChipText,
                  filter === f && { color: theme.colors.textInverse },
                ]}
              >
                {f === 'all' ? 'Semua' : typeLabels[f]}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Wallet Cards */}
        {filtered.length === 0 ? (
          <View style={styles.emptyCard}>
            <IconBubble name="wallets" tone="accent" size={56} />
            <Text style={styles.emptyTitle}>Belum ada dompet</Text>
            <Text style={styles.emptySub}>Tambahkan dompet baru untuk mulai mencatat transaksi.</Text>
          </View>
        ) : (
          filtered.map((wallet) => (
            <Pressable key={wallet.id} style={styles.walletCard}>
              <View style={styles.walletTop}>
                <View style={styles.walletIcon}>
                  <IconBubble
                    name={typeIcons[wallet.type as WalletType]}
                    tone={wallet.type === 'bank' ? 'info' : 'success'}
                    size={46}
                  />
                </View>
                <View style={styles.walletInfo}>
                  <Text style={styles.walletName}>{wallet.name}</Text>
                  <View style={styles.walletMeta}>
                    <View style={[styles.typeBadge, { backgroundColor: `${typeColors[wallet.type as WalletType]}15` }]}>
                      <Text style={[styles.typeBadgeText, { color: typeColors[wallet.type as WalletType] }]}>
                        {typeLabels[wallet.type as WalletType]}
                      </Text>
                    </View>
                    {wallet.account_number ? <Text style={styles.walletHint}>••• {wallet.account_number.slice(-4)}</Text> : null}
                  </View>
                </View>
              </View>
              <View style={styles.walletBottom}>
                <Text style={styles.walletBalance}>Rp {(wallet.balance || 0).toLocaleString('id-ID')}</Text>
              </View>
            </Pressable>
          ))
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  )
}

function createStyles(theme: ReturnType<typeof useTheme>['theme']) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.colors.background },
    content: { padding: 20, gap: 14, paddingBottom: 26 },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    title: { color: theme.colors.textPrimary, fontSize: 28, fontWeight: '800', letterSpacing: -0.4 },
    subtitle: { color: theme.colors.textSecondary, fontSize: 13, marginTop: 2 },
    addButton: {
      backgroundColor: theme.colors.brandPrimary,
      borderRadius: 999,
      paddingHorizontal: 14,
      paddingVertical: 8,
    },
    addButtonText: { color: theme.colors.textInverse, fontSize: 12, fontWeight: '700' },
    totalCard: {
      backgroundColor: theme.colors.brandPrimary,
      borderRadius: 20,
      padding: 18,
      gap: 6,
    },
    totalLabel: { color: 'rgba(255,255,255,0.72)', fontSize: 13, fontWeight: '600' },
    totalValue: { color: '#FFFFFF', fontSize: 30, fontWeight: '800', letterSpacing: -0.5 },
    totalRow: { marginTop: 6 },
    totalChip: {
      backgroundColor: 'rgba(255,255,255,0.18)',
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 5,
      alignSelf: 'flex-start',
    },
    totalChipText: { color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: '600' },
    filterRow: { gap: 8, paddingVertical: 2 },
    filterChip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: theme.colors.borderSoft,
      backgroundColor: theme.colors.surface,
    },
    filterChipText: { color: theme.colors.textSecondary, fontSize: 12, fontWeight: '700' },
    walletCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: theme.colors.borderSoft,
      padding: 14,
      gap: 12,
    },
    walletTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    walletIcon: {
      width: 46,
      height: 46,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    walletInfo: { flex: 1, gap: 4 },
    walletName: { color: theme.colors.textPrimary, fontSize: 15, fontWeight: '700' },
    walletMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    typeBadge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
    typeBadgeText: { fontSize: 11, fontWeight: '700' },
    walletHint: { color: theme.colors.textMuted, fontSize: 11, fontWeight: '600' },
    walletBottom: {
      borderTopWidth: 1,
      borderTopColor: theme.colors.borderSoft,
      paddingTop: 10,
    },
    walletBalance: { color: theme.colors.textPrimary, fontSize: 18, fontWeight: '800' },
  emptyCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.borderSoft,
    borderStyle: 'dashed',
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: { color: theme.colors.textPrimary, fontSize: 15, fontWeight: '800' },
  emptySub: { color: theme.colors.textMuted, fontSize: 13, textAlign: 'center', lineHeight: 20 },
  })
}
