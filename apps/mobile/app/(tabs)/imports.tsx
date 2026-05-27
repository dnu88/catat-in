import { useCallback, useMemo, useState } from 'react'
import { FlatList, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { PageEntrance, StaggeredStack } from '../../src/components/motion'

import { KaswiseIcon } from '../../src/components/icons/kaswise-icons'
import { Card, IconBubble, SectionHeader } from '../../src/components/ui'
import { useTheme } from '../../src/theme/theme-context'

const importHistory: Array<{ id: string; source: string; date: string; count: number; icon: 'wallets' | 'card' }> = []

export default function ImportsScreen() {
  const { theme } = useTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const [refreshing, setRefreshing] = useState(false)
  const onRefresh = useCallback(() => {
    setRefreshing(true)
    setTimeout(() => setRefreshing(false), 250)
  }, [])

  const renderHistoryItem = ({ item, index }: { item: (typeof importHistory)[number]; index: number }) => (
    <View style={[styles.historyRow, index < importHistory.length - 1 && styles.historyRowBorder]}>
      <View style={styles.historyLeft}>
        <IconBubble name={item.icon} tone="info" size={42} />
        <View>
          <Text style={styles.historySource}>{item.source}</Text>
          <Text style={styles.historyMeta}>
            {item.count} transaksi • {item.date}
          </Text>
        </View>
      </View>
      <View style={styles.statusBadge}>
        <KaswiseIcon name="chart" size={14} color={theme.colors.success} weight="bold" />
        <Text style={styles.statusBadgeText}>Berhasil</Text>
      </View>
    </View>
  )

  return (
    <PageEntrance testID="imports-page-entrance" style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.brandPrimary} />}
      >
        <StaggeredStack testIDPrefix="imports-entrance">
          <SectionHeader
            key="import-header"
            title="Import Mutasi"
            subtitle="Import otomatis dari bank, e-wallet, dan struk."
            action={<View style={styles.badge}><Text style={styles.badgeText}>Beta</Text></View>}
          />

          <Card key="import-hero" variant="elevated" style={styles.heroCard}>
            <View style={styles.heroRow}>
              <IconBubble name="imports" tone="info" size={54} />
              <View style={styles.heroCopy}>
                <Text style={styles.heroTitle}>Import otomatis lebih cepat</Text>
                <Text style={styles.heroSub}>
                  Upload file CSV atau Excel, lalu lanjutkan review hasil parsing sebelum transaksi disimpan.
                </Text>
              </View>
            </View>
          </Card>

          <View key="import-methods" style={styles.methodGrid}>
            <Card variant="default" style={styles.methodCard}>
              <IconBubble name="file" tone="primary" size={48} />
              <Text style={styles.methodLabel}>CSV / Excel</Text>
              <Text style={styles.methodSub}>Upload mutasi bank</Text>
            </Card>

            <Card variant="default" style={styles.methodCard}>
              <IconBubble name="capture" tone="accent" size={48} />
              <Text style={styles.methodLabel}>Scan Struk</Text>
              <Text style={styles.methodSub}>OCR struk belanja</Text>
            </Card>
          </View>

          <SectionHeader
            key="import-history-header"
            title="Riwayat Import"
            subtitle="Sumber terakhir yang berhasil diproses."
          />
          <Card key="import-history-list" variant="default" style={styles.listCard}>
            {importHistory.length > 0 ? (
              <FlatList
                data={importHistory}
                renderItem={renderHistoryItem}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                initialNumToRender={10}
              />
            ) : (
              <Text style={styles.emptyHistoryText}>Belum ada riwayat import.</Text>
            )}
          </Card>

          <Card key="import-placeholder" variant="muted" style={styles.placeholderCard}>
            <IconBubble name="ai" tone="warning" size={56} />
            <Text style={styles.placeholderTitle}>Flow import penuh segera hadir</Text>
            <Text style={styles.placeholderSub}>
              Untuk saat ini, gunakan Capture AI atau catat manual jika ingin input lebih cepat.
            </Text>
          </Card>
        </StaggeredStack>
        <View style={{ height: 100 }} />
      </ScrollView>
    </PageEntrance>
  )

}

function createStyles(theme: ReturnType<typeof useTheme>['theme']) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.colors.background },
    content: { padding: 20, gap: 12, paddingBottom: 26 },
    badge: {
      backgroundColor: `${theme.colors.brandPrimary}1A`,
      borderRadius: theme.radius.pill,
      borderWidth: 1,
      borderColor: theme.colors.brandPrimary,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    badgeText: { color: theme.colors.brandPrimary, fontSize: 12, fontWeight: '800' },
    heroCard: { gap: 0 },
    heroRow: { flexDirection: 'row', gap: 14, alignItems: 'center' },
    heroCopy: { flex: 1, gap: 4 },
    heroTitle: { color: theme.colors.textPrimary, fontSize: 16, fontWeight: '800' },
    heroSub: { color: theme.colors.textSecondary, fontSize: 12, lineHeight: 18 },
    methodGrid: { flexDirection: 'row', gap: 10 },
    methodCard: { flex: 1, alignItems: 'center', gap: 10 },
    methodLabel: { color: theme.colors.textPrimary, fontSize: 13, fontWeight: '800' },
    methodSub: { color: theme.colors.textMuted, fontSize: 11, textAlign: 'center' },
    listCard: { gap: 0, paddingVertical: 0 },
    historyRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 14,
    },
    historyRowBorder: { borderBottomWidth: 1, borderBottomColor: theme.colors.borderSoft },
    historyLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
    historySource: { color: theme.colors.textPrimary, fontSize: 14, fontWeight: '700' },
    historyMeta: { color: theme.colors.textMuted, fontSize: 11, marginTop: 2 },
    statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      borderRadius: theme.radius.pill,
      paddingHorizontal: 10,
      paddingVertical: 5,
      backgroundColor: theme.iconBubbles.success.background,
    },
    statusBadgeText: { color: theme.colors.success, fontSize: 11, fontWeight: '700' },
    emptyHistoryText: { color: theme.colors.textMuted, fontSize: 12, textAlign: 'center', paddingVertical: 16 },
    placeholderCard: { alignItems: 'center', gap: 10 },
    placeholderTitle: { color: theme.colors.textPrimary, fontSize: 15, fontWeight: '800' },
    placeholderSub: { color: theme.colors.textMuted, fontSize: 12, textAlign: 'center', lineHeight: 18 },
  })
}
