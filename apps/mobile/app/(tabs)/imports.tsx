import { useMemo } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'

import { useTheme } from '../../src/theme/theme-context'

const importHistory = [
  { id: '1', source: 'BCA Mobile', date: '5 Mei 2026', count: 24, status: 'success', emoji: '🏦' },
  { id: '2', source: 'GoPay CSV', date: '1 Mei 2026', count: 18, status: 'success', emoji: '💳' },
]

export default function ImportsScreen() {
  const { theme } = useTheme()
  const styles = useMemo(() => createStyles(theme), [theme])

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Import Mutasi</Text>
            <Text style={styles.subtitle}>Import otomatis dari bank & e-wallet.</Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoIcon}>
            <Text style={styles.infoIconText}>📥</Text>
          </View>
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Import Otomatis</Text>
            <Text style={styles.infoSub}>
              Upload file CSV/Excel mutasi bank atau e-wallet. AI akan parsing dan kategorisasi otomatis.
            </Text>
          </View>
        </View>

        <View style={styles.methodGrid}>
          <Pressable style={styles.methodCard}>
            <View style={styles.methodIcon}>
              <Text style={styles.methodIconText}>📄</Text>
            </View>
            <Text style={styles.methodLabel}>CSV / Excel</Text>
            <Text style={styles.methodSub}>Upload mutasi bank</Text>
          </Pressable>

          <Pressable style={styles.methodCard}>
            <View style={styles.methodIcon}>
              <Text style={styles.methodIconText}>📷</Text>
            </View>
            <Text style={styles.methodLabel}>Scan Struk</Text>
            <Text style={styles.methodSub}>OCR struk belanja</Text>
          </Pressable>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Riwayat Import</Text>
        </View>

        {importHistory.map((item) => (
          <View key={item.id} style={styles.historyCard}>
            <View style={styles.historyLeft}>
              <View style={styles.historyEmoji}>
                <Text style={styles.historyEmojiText}>{item.emoji}</Text>
              </View>
              <View>
                <Text style={styles.historySource}>{item.source}</Text>
                <Text style={styles.historyMeta}>
                  {item.count} transaksi • {item.date}
                </Text>
              </View>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: `${theme.colors.success}15` }]}>
              <Text style={[styles.statusBadgeText, { color: theme.colors.success }]}>Berhasil</Text>
            </View>
          </View>
        ))}

        <View style={styles.placeholderCard}>
          <View style={styles.placeholderIcon}>
            <Text style={styles.placeholderIconText}>🚀</Text>
          </View>
          <Text style={styles.placeholderTitle}>Fitur Import Segera Hadir</Text>
          <Text style={styles.placeholderSub}>
            Kami sedang menyempurnakan flow upload dan parsing untuk memberikan pengalaman terbaik. Sementara ini, gunakan mode Capture AI untuk input manual.
          </Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  )
}

function createStyles(theme: ReturnType<typeof useTheme>['theme']) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.colors.background },
    content: { padding: 20, gap: 14, paddingBottom: 26 },
    headerRow: { marginBottom: 4 },
    title: { color: theme.colors.textPrimary, fontSize: 28, fontWeight: '800', letterSpacing: -0.4 },
    subtitle: { color: theme.colors.textSecondary, fontSize: 13, marginTop: 2 },
    infoCard: {
      backgroundColor: `${theme.colors.info}10`,
      borderWidth: 1,
      borderColor: `${theme.colors.info}40`,
      borderRadius: 16,
      padding: 14,
      flexDirection: 'row',
      gap: 12,
    },
    infoIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: `${theme.colors.info}20`,
      alignItems: 'center',
      justifyContent: 'center',
    },
    infoIconText: { fontSize: 20 },
    infoContent: { flex: 1 },
    infoTitle: { color: theme.colors.textPrimary, fontSize: 14, fontWeight: '800' },
    infoSub: { color: theme.colors.textSecondary, fontSize: 12, marginTop: 4, lineHeight: 18 },
    methodGrid: {
      flexDirection: 'row',
      gap: 10,
    },
    methodCard: {
      flex: 1,
      backgroundColor: theme.colors.surface,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: theme.colors.borderSoft,
      padding: 14,
      alignItems: 'center',
      gap: 8,
    },
    methodIcon: {
      width: 50,
      height: 50,
      borderRadius: 16,
      backgroundColor: theme.colors.mutedSurface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    methodIconText: { fontSize: 24 },
    methodLabel: { color: theme.colors.textPrimary, fontSize: 13, fontWeight: '700' },
    methodSub: { color: theme.colors.textMuted, fontSize: 11 },
    sectionHeader: { marginTop: 6 },
    sectionTitle: { color: theme.colors.textPrimary, fontSize: 16, fontWeight: '800' },
    historyCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.colors.borderSoft,
      padding: 14,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    historyLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
    historyEmoji: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: theme.colors.mutedSurface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    historyEmojiText: { fontSize: 18 },
    historySource: { color: theme.colors.textPrimary, fontSize: 14, fontWeight: '700' },
    historyMeta: { color: theme.colors.textMuted, fontSize: 11, marginTop: 2 },
    statusBadge: {
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    statusBadgeText: { fontSize: 11, fontWeight: '700' },
    placeholderCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: theme.colors.borderSoft,
      borderStyle: 'dashed',
      padding: 20,
      alignItems: 'center',
      gap: 10,
    },
    placeholderIcon: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: theme.colors.mutedSurface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    placeholderIconText: { fontSize: 30 },
    placeholderTitle: { color: theme.colors.textPrimary, fontSize: 15, fontWeight: '800' },
    placeholderSub: { color: theme.colors.textMuted, fontSize: 12, textAlign: 'center', lineHeight: 18 },
  })
}
