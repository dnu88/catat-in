import { useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native'

import { EmptyState, IconBubble, ScreenHeader, StateMessage } from '../../src/components/ui'
import { useSupabase } from '../../src/lib/supabase'
import {
  buildEnvelopeProgress,
  getEnvelopeStatus,
  listBudgetEnvelopes,
  listEnvelopeAllocations,
  type BudgetEnvelope,
  type EnvelopeAllocation,
  type EnvelopeProgress,
} from '../../src/services/budget-envelopes'
import { useTheme } from '../../src/theme/theme-context'

type EnvelopeSummary = {
  envelope: BudgetEnvelope
  progress: EnvelopeProgress
}

type EnvelopeRowProps = {
  item: EnvelopeSummary
  theme: ReturnType<typeof useTheme>['theme']
  styles: ReturnType<typeof createStyles>
}

function formatRupiah(value: number) {
  return `Rp ${Math.abs(value).toLocaleString('id-ID', { maximumFractionDigits: 0 })}`
}

function EnvelopeRow({ item, theme, styles }: EnvelopeRowProps) {
  const { envelope, progress } = item
  const toneColor = progress.is_over_budget ? theme.colors.danger : progress.is_near_limit ? theme.colors.warning : theme.colors.brandPrimary

  return (
    <Pressable testID={`envelope-card-${envelope.id}`} style={styles.budgetCard}>
      <View style={styles.budgetTop}>
        <View style={styles.budgetLeft}>
          <IconBubble
            name="budgets"
            tone={progress.is_over_budget ? 'danger' : progress.is_near_limit ? 'warning' : 'primary'}
            size={44}
          />
          <View style={styles.budgetTextWrap}>
            <Text style={styles.budgetCategory} numberOfLines={1} ellipsizeMode="tail">{envelope.name}</Text>
            <Text style={styles.budgetMeta}>
              {envelope.parent_category_name ?? 'Tanpa kategori'} · {envelope.start_date}–{envelope.end_date}
            </Text>
          </View>
        </View>
        <View style={[styles.budgetBadge, { backgroundColor: `${toneColor}15`, borderColor: `${toneColor}40` }]}>
          <Text style={[styles.budgetBadgeText, { color: toneColor }]}>{progress.used_percentage}%</Text>
        </View>
      </View>

      <View style={styles.budgetBar}>
        <View style={[styles.budgetBarFill, { width: `${Math.min(progress.used_percentage, 100)}%`, backgroundColor: toneColor }]} />
      </View>

      <Text style={styles.budgetFooter}>
        {progress.is_over_budget
          ? `Lewat ${formatRupiah(progress.over_budget_amount)}`
          : `Sisa ${formatRupiah(Math.max(progress.remaining_amount, 0))}`}
      </Text>
    </Pressable>
  )
}

export default function BudgetsScreen() {
  const { supabase } = useSupabase()
  const { theme } = useTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const [activeSummaries, setActiveSummaries] = useState<EnvelopeSummary[]>([])
  const [archivedSummaries, setArchivedSummaries] = useState<EnvelopeSummary[]>([])
  const [reviewAllocations, setReviewAllocations] = useState<EnvelopeAllocation[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    loadEnvelopes()
  }, [])

  const loadEnvelopes = async () => {
    try {
      setLoading(true)
      setLoadError(null)
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setLoadError('Sesi login tidak ditemukan. Silakan login ulang.')
        setActiveSummaries([])
        setArchivedSummaries([])
        setReviewAllocations([])
        return
      }

      const envelopes = await listBudgetEnvelopes(supabase, user.id)
      const allocations = await listEnvelopeAllocations(supabase, envelopes.map((envelope) => envelope.id))
      const summaries = envelopes.map((envelope) => ({
        envelope,
        progress: buildEnvelopeProgress(envelope, allocations),
      }))

      setActiveSummaries(summaries.filter((item) => getEnvelopeStatus(item.envelope) === 'active'))
      setArchivedSummaries(summaries.filter((item) => getEnvelopeStatus(item.envelope) === 'archived'))
      setReviewAllocations(allocations.filter((allocation) => allocation.needs_review))
    } catch (error) {
      console.error('Error loading budget envelopes:', error)
      setLoadError('Gagal memuat data amplop. Coba lagi sebentar.')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <View style={[styles.screen, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={theme.colors.brandPrimary} />
      </View>
    )
  }

  const renderEnvelope = ({ item }: { item: EnvelopeSummary }) => (
    <EnvelopeRow item={item} theme={theme} styles={styles} />
  )

  const ListHeader = () => (
    <>
      <ScreenHeader
        title="Anggaran"
        subtitle="Kelola amplop budget personal di bawah kategori laporan."
        action={(
          <Pressable style={styles.addButton}>
            <Text style={styles.addButtonText}>+ Baru</Text>
          </Pressable>
        )}
      />

      {loadError ? <StateMessage message={loadError} tone="error" /> : null}

      <View style={styles.overviewCard}>
        <View style={styles.overviewTop}>
          <View>
            <Text style={styles.overviewLabel}>Amplop aktif</Text>
            <Text style={styles.overviewPct}>{activeSummaries.length}</Text>
          </View>
          <View style={styles.overviewRight}>
            <Text style={styles.overviewSpent}>{reviewAllocations.length} perlu cek</Text>
            <Text style={styles.overviewLimit}>Review hanya di Reports/Amplop</Text>
          </View>
        </View>
        <Text style={styles.overviewHelper}>
          Budget tidak memblokir transaksi. Amplop membantu melihat sisa dan over budget.
        </Text>
      </View>

      <Text style={styles.sectionTitle}>Amplop Aktif</Text>
    </>
  )

  const ListEmpty = () => (
    <EmptyState
      icon="budgets"
      tone="primary"
      title="Belum ada amplop aktif"
      description="Buat amplop seperti Kopi, Ojol, atau Nongkrong untuk memantau budget personal."
    />
  )

  const ListFooter = () => (
    <View style={styles.footerSections}>
      <Text style={styles.sectionTitle}>Perlu cek</Text>
      {reviewAllocations.length > 0 ? reviewAllocations.map((allocation) => (
        <View key={allocation.id} style={styles.reviewCard}>
          <Text style={styles.reviewTitle}>{allocation.transaction_description ?? 'Transaksi'}</Text>
          <Text style={styles.budgetMeta}>Confidence rendah · cek amplop transaksi ini</Text>
        </View>
      )) : (
        <Text style={styles.emptyInlineText}>Tidak ada transaksi yang perlu dicek.</Text>
      )}

      <Text style={styles.sectionTitle}>Arsip</Text>
      {archivedSummaries.length > 0 ? archivedSummaries.map((item) => (
        <View key={item.envelope.id} style={styles.archiveCard}>
          <Text style={styles.reviewTitle}>{item.envelope.name}</Text>
          <Text style={styles.budgetMeta}>{item.envelope.start_date}–{item.envelope.end_date}</Text>
        </View>
      )) : (
        <Text style={styles.emptyInlineText}>Belum ada amplop yang selesai.</Text>
      )}

      <View style={{ height: 100 }} />
    </View>
  )

  return (
    <View style={styles.screen}>
      <FlatList
        data={activeSummaries}
        renderItem={renderEnvelope}
        keyExtractor={(item) => item.envelope.id}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={ListEmpty}
        ListFooterComponent={ListFooter}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews
      />
    </View>
  )
}

function createStyles(theme: ReturnType<typeof useTheme>['theme']) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.colors.background },
    content: { padding: 20, gap: 8, paddingBottom: 26 },
    addButton: {
      backgroundColor: theme.colors.brandPrimary,
      borderRadius: 999,
      paddingHorizontal: 14,
      paddingVertical: 8,
    },
    addButtonText: { color: theme.colors.textInverse, fontSize: 12, fontWeight: '700' },
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
    overviewHelper: { color: theme.colors.textMuted, fontSize: 11, lineHeight: 16 },
    sectionTitle: {
      color: theme.colors.textPrimary,
      fontSize: 16,
      fontWeight: '800',
      marginTop: 14,
      marginBottom: 4,
    },
    budgetCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: theme.colors.borderSoft,
      padding: 14,
      gap: 10,
    },
    budgetTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
    budgetLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
    budgetTextWrap: { flex: 1 },
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
    footerSections: { gap: 8 },
    reviewCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.colors.borderSoft,
      padding: 12,
    },
    archiveCard: {
      backgroundColor: theme.colors.mutedSurface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.colors.borderSoft,
      padding: 12,
    },
    reviewTitle: { color: theme.colors.textPrimary, fontSize: 14, fontWeight: '700' },
    emptyInlineText: { color: theme.colors.textMuted, fontSize: 12, lineHeight: 18 },
  })
}
