import { useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'

import type { KaswiseIconName } from '../../src/components/icons/kaswise-icons'
import { EmptyState, FilterChip, IconBubble, ScreenHeader, StatusBadge } from '../../src/components/ui'
import { useTheme } from '../../src/theme/theme-context'
import { listBills, updateBill, type Bill } from '../../src/services/bills'

type BillStatus = 'paid' | 'upcoming' | 'overdue'

const billIcons: Record<string, KaswiseIconName> = {
  'Internet': 'insight',
  'Listrik': 'budgets',
  'Netflix': 'insight',
  'Spotify': 'insight',
  'Asuransi': 'budgets',
  'Air': 'budgets',
  'Telepon': 'notification',
}

type FilterStatus = 'all' | BillStatus

export default function BillsScreen() {
  const { theme } = useTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const [filter, setFilter] = useState<FilterStatus>('all')
  const [bills, setBills] = useState<Bill[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadBills()
  }, [])

  const loadBills = async () => {
    try {
      const data = await listBills()
      setBills(data)
    } catch (error) {
      console.error('Error loading bills:', error)
    } finally {
      setLoading(false)
    }
  }

  const markAsPaid = async (id: string) => {
    try {
      await updateBill(id, { is_paid: true })
      loadBills() // Reload data
    } catch (error) {
      console.error('Error marking bill as paid:', error)
    }
  }

  // Determine status for each bill
  const billsWithStatus = bills.map(bill => {
    const dueDate = new Date(bill.next_due_date)
    const today = new Date()
    let status: BillStatus = 'upcoming'

    if (bill.is_paid) {
      status = 'paid'
    } else if (dueDate < today) {
      status = 'overdue'
    } else {
      status = 'upcoming'
    }

    return { ...bill, status }
  })

  const filtered = filter === 'all' ? billsWithStatus : billsWithStatus.filter((b) => b.status === filter)
  const totalUpcoming = billsWithStatus.filter((b) => b.status === 'upcoming').reduce((a, b) => a + b.amount, 0)
  const overdueCount = billsWithStatus.filter((b) => b.status === 'overdue').length

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
        <ScreenHeader
          title="Tagihan"
          subtitle="Kelola pengingat tagihan rutin."
          action={(
            <Pressable style={styles.addButton}>
              <Text style={styles.addButtonText}>+ Baru</Text>
            </Pressable>
          )}
        />

        {/* Alert Card */}
        {overdueCount > 0 && (
          <View style={styles.alertCard}>
            <IconBubble name="bills" tone="danger" size={44} />
            <View style={styles.alertContent}>
              <Text style={styles.alertTitle}>Ada {overdueCount} tagihan terlambat</Text>
              <Text style={styles.alertSub}>Segera bayar untuk menghindari denda.</Text>
            </View>
          </View>
        )}

        {/* Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Total Tagihan Bulan Ini</Text>
              <Text style={styles.summaryValue}>Rp {totalUpcoming.toLocaleString('id-ID')}</Text>
            </View>
          </View>
        </View>

        {/* Filter Row */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {(['all', 'upcoming', 'overdue', 'paid'] as FilterStatus[]).map((f) => (
            <FilterChip
              key={f}
              label={f === 'all' ? 'Semua' : f === 'upcoming' ? 'Akan Datang' : f === 'overdue' ? 'Terlambat' : 'Lunas'}
              selected={filter === f}
              onPress={() => setFilter(f)}
            />
          ))}
        </ScrollView>

        {/* Bill Cards */}
        {filtered.length === 0 ? (
          <EmptyState
            icon="bills"
            tone="accent"
            title="Belum ada tagihan"
            description="Tambahkan tagihan berulang untuk diingatkan."
          />
        ) : (
          filtered.map((bill) => {
            const statusColor =
              bill.status === 'paid'
                ? theme.colors.success
                : bill.status === 'overdue'
                  ? theme.colors.danger
                  : theme.colors.warning

            const statusLabel =
              bill.status === 'paid' ? 'Lunas' : bill.status === 'overdue' ? 'Terlambat' : 'Akan Datang'

            const dueDate = new Date(bill.next_due_date)
            const formattedDate = dueDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })

            // Find icon based on bill name
            const iconKey = Object.keys(billIcons).find(key => bill.name.includes(key)) || 'bills'
            const icon = billIcons[iconKey] || 'bills'

            return (
              <Pressable key={bill.id} style={styles.billCard}>
                <View style={styles.billTop}>
                  <View style={styles.billLeft}>
                    <IconBubble
                      name={icon as KaswiseIconName}
                      tone={bill.status === 'paid' ? 'success' : bill.status === 'overdue' ? 'danger' : 'warning'}
                      size={44}
                    />
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={styles.billName}>{bill.name}</Text>
                        <StatusBadge label={statusLabel} color={statusColor} />
                      </View>
                      <Text style={styles.billDue}>Jatuh tempo: {formattedDate}</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.billBottom}>
                  <Text style={styles.billAmount}>Rp {bill.amount.toLocaleString('id-ID')}</Text>
                  {bill.status === 'upcoming' && (
                    <Pressable style={styles.payButton} onPress={() => markAsPaid(bill.id)}>
                      <Text style={styles.payButtonText}>Tandai Lunas</Text>
                    </Pressable>
                  )}
                </View>
              </Pressable>
            )
          })
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
    alertCard: {
      backgroundColor: `${theme.colors.danger}10`,
      borderWidth: 1,
      borderColor: `${theme.colors.danger}40`,
      borderRadius: 16,
      padding: 14,
      flexDirection: 'row',
      gap: 12,
      alignItems: 'center',
    },
    alertContent: { flex: 1 },
    alertTitle: { color: theme.colors.danger, fontSize: 14, fontWeight: '800' },
    alertSub: { color: theme.colors.textSecondary, fontSize: 12, marginTop: 2 },
    summaryCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: theme.colors.borderSoft,
      padding: 16,
    },
    summaryRow: { gap: 8 },
    summaryItem: { gap: 4 },
    summaryLabel: { color: theme.colors.textSecondary, fontSize: 12, fontWeight: '600' },
    summaryValue: { color: theme.colors.textPrimary, fontSize: 22, fontWeight: '800' },
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
    billCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: theme.colors.borderSoft,
      padding: 14,
      gap: 12,
    },
    billTop: { flexDirection: 'row', alignItems: 'flex-start' },
    billLeft: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, flex: 1 },
    billName: { color: theme.colors.textPrimary, fontSize: 14, fontWeight: '700' },
    billDue: { color: theme.colors.textMuted, fontSize: 12, marginTop: 2 },
    statusBadge: {
      borderWidth: 1,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    statusBadgeText: { fontSize: 11, fontWeight: '700' },
    billBottom: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderTopWidth: 1,
      borderTopColor: theme.colors.borderSoft,
      paddingTop: 10,
    },
    billAmount: { color: theme.colors.textPrimary, fontSize: 16, fontWeight: '800' },
    payButton: {
      backgroundColor: theme.colors.brandPrimary,
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    payButtonText: { color: theme.colors.textInverse, fontSize: 11, fontWeight: '700' },
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
