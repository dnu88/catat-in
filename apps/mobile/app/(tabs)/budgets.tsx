import { useMemo, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'

import { useTheme } from '../../src/theme/theme-context'

type Period = 'current' | 'prev'

const budgets = [
  { id: '1', category: 'Makan & Minum', spent: 2050000, limit: 3000000, emoji: '🍽' },
  { id: '2', category: 'Transportasi', spent: 820000, limit: 1200000, emoji: '🚗' },
  { id: '3', category: 'Belanja', spent: 1700000, limit: 1500000, emoji: '🛒' },
  { id: '4', category: 'Hiburan', spent: 300000, limit: 500000, emoji: '🎮' },
  { id: '5', category: 'Tagihan', spent: 960000, limit: 1000000, emoji: '📄' },
]

export default function BudgetsScreen() {
  const { theme } = useTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const [period, setPeriod] = useState<Period>('current')

  const totalSpent = budgets.reduce((a, b) => a + b.spent, 0)
  const totalLimit = budgets.reduce((a, b) => a + b.limit, 0)
  const totalPct = Math.round((totalSpent / totalLimit) * 100)

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Anggaran</Text>
            <Text style={styles.subtitle}>Kelola batas pengeluaranmu per kategori.</Text>
          </View>
          <Pressable style={styles.addButton}>
            <Text style={styles.addButtonText}>+ Baru</Text>
          </Pressable>
        </View>

        <View style={styles.periodRow}>
          <Pressable
            style={[styles.periodChip, period === 'current' && styles.periodChipActive]}
            onPress={() => setPeriod('current')}
          >
            <Text style={[styles.periodText, period === 'current' && styles.periodTextActive]}>Mei 2026</Text>
          </Pressable>
          <Pressable
            style={[styles.periodChip, period === 'prev' && styles.periodChipActive]}
            onPress={() => setPeriod('prev')}
          >
            <Text style={[styles.periodText, period === 'prev' && styles.periodTextActive]}>Apr 2026</Text>
          </Pressable>
        </View>

        {/* Total Budget Overview */}
        <View style={styles.overviewCard}>
          <View style={styles.overviewTop}>
            <View>
              <Text style={styles.overviewLabel}>Total Anggaran Terpakai</Text>
              <Text style={styles.overviewPct}>{totalPct}%</Text>
            </View>
            <View style={styles.overviewRight}>
              <Text style={styles.overviewSpent}>Rp {(totalSpent / 1000000).toFixed(2)} Jt</Text>
              <Text style={styles.overviewLimit}>dari Rp {(totalLimit / 1000000).toFixed(1)} Jt</Text>
            </View>
          </View>
          <View style={styles.overviewBar}>
            <View
              style={[
                styles.overviewBarFill,
                {
                  width: `${Math.min(totalPct, 100)}%`,
                  backgroundColor: totalPct > 80 ? theme.colors.warning : theme.colors.brandPrimary,
                },
              ]}
            />
          </View>
          <Text style={styles.overviewHelper}>
            {totalPct < 50
              ? 'Kamu masih punya ruang anggaran yang baik.'
              : totalPct < 80
                ? 'Penggunaan anggaran masih terkontrol.'
                : 'Hati-hati, anggaranmu hampir habis bulan ini.'}
          </Text>
        </View>

        {/* Budget Cards */}
        {budgets.map((budget) => {
          const pct = Math.round((budget.spent / budget.limit) * 100)
          const over = budget.spent > budget.limit
          const warn = pct >= 80 && !over
          const remaining = budget.limit - budget.spent
          const toneColor = over ? theme.colors.danger : warn ? theme.colors.warning : theme.colors.brandPrimary

          return (
            <Pressable key={budget.id} style={styles.budgetCard}>
              <View style={styles.budgetTop}>
                <View style={styles.budgetLeft}>
                  <View style={styles.budgetEmoji}>
                    <Text style={styles.budgetEmojiText}>{budget.emoji}</Text>
                  </View>
                  <View>
                    <Text style={styles.budgetCategory}>{budget.category}</Text>
                    <Text style={styles.budgetMeta}>
                      Rp {(budget.spent / 1000).toFixed(0)}rb / Rp {(budget.limit / 1000).toFixed(0)}rb
                    </Text>
                  </View>
                </View>
                <View style={[styles.budgetBadge, { backgroundColor: `${toneColor}15`, borderColor: `${toneColor}40` }]}>
                  <Text style={[styles.budgetBadgeText, { color: toneColor }]}>{pct}%</Text>
                </View>
              </View>

              <View style={styles.budgetBar}>
                <View style={[styles.budgetBarFill, { width: `${Math.min(pct, 100)}%`, backgroundColor: toneColor }]} />
              </View>

              <Text style={styles.budgetFooter}>
                {over
                  ? `Melebihi anggaran Rp ${Math.abs(remaining / 1000).toFixed(0)}rb`
                  : `Sisa Rp ${(remaining / 1000).toFixed(0)}rb`}
              </Text>
            </Pressable>
          )
        })}

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
    periodRow: { flexDirection: 'row', gap: 8 },
    periodChip: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.borderSoft,
      backgroundColor: theme.colors.surface,
      alignItems: 'center',
    },
    periodChipActive: {
      backgroundColor: theme.colors.brandPrimary,
      borderColor: theme.colors.brandPrimary,
    },
    periodText: { color: theme.colors.textSecondary, fontSize: 13, fontWeight: '700' },
    periodTextActive: { color: theme.colors.textInverse },
    overviewCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.colors.borderSoft,
      padding: 16,
      gap: 12,
    },
    overviewTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    overviewLabel: { color: theme.colors.textSecondary, fontSize: 12, fontWeight: '600' },
    overviewPct: { color: theme.colors.textPrimary, fontSize: 32, fontWeight: '800', marginTop: 2 },
    overviewRight: { alignItems: 'flex-end' },
    overviewSpent: { color: theme.colors.textPrimary, fontSize: 15, fontWeight: '800' },
    overviewLimit: { color: theme.colors.textMuted, fontSize: 12, marginTop: 2 },
    overviewBar: {
      height: 8,
      backgroundColor: theme.colors.mutedSurface,
      borderRadius: 999,
      overflow: 'hidden',
    },
    overviewBarFill: { height: '100%', borderRadius: 999 },
    overviewHelper: { color: theme.colors.textMuted, fontSize: 11 },
    budgetCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: theme.colors.borderSoft,
      padding: 14,
      gap: 10,
    },
    budgetTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    budgetLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    budgetEmoji: {
      width: 42,
      height: 42,
      borderRadius: 14,
      backgroundColor: theme.colors.mutedSurface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    budgetEmojiText: { fontSize: 20 },
    budgetCategory: { color: theme.colors.textPrimary, fontSize: 14, fontWeight: '700' },
    budgetMeta: { color: theme.colors.textMuted, fontSize: 12, marginTop: 2 },
    budgetBadge: {
      borderWidth: 1,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    budgetBadgeText: { fontSize: 13, fontWeight: '800' },
    budgetBar: {
      height: 6,
      backgroundColor: theme.colors.mutedSurface,
      borderRadius: 999,
      overflow: 'hidden',
    },
    budgetBarFill: { height: '100%', borderRadius: 999 },
    budgetFooter: { color: theme.colors.textMuted, fontSize: 11, fontWeight: '600' },
  })
}
