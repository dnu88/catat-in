import { useMemo } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'

import { useTheme } from '../../src/theme/theme-context'

const groups = [
  { id: '1', name: 'Keluarga Besar', members: 8, balance: 4250000, emoji: '👨‍👩‍👧‍👦', role: 'admin' },
  { id: '2', name: 'Kost Jl. Merdeka', members: 5, balance: 1850000, emoji: '🏠', role: 'member' },
]

export default function GroupsScreen() {
  const { theme } = useTheme()
  const styles = useMemo(() => createStyles(theme), [theme])

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Grup Keuangan</Text>
            <Text style={styles.subtitle}>Kelola keuangan bersama keluarga atau teman.</Text>
          </View>
          <Pressable style={styles.addButton}>
            <Text style={styles.addButtonText}>+ Buat</Text>
          </Pressable>
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoIcon}>
            <Text style={styles.infoIconText}>ℹ️</Text>
          </View>
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Fitur Grup Keuangan</Text>
            <Text style={styles.infoSub}>
              Catat pengeluaran bersama, split bill otomatis, dan pantau kontribusi setiap anggota secara real-time.
            </Text>
          </View>
        </View>

        {groups.map((group) => (
          <Pressable key={group.id} style={styles.groupCard}>
            <View style={styles.groupTop}>
              <View style={styles.groupLeft}>
                <View style={styles.groupEmoji}>
                  <Text style={styles.groupEmojiText}>{group.emoji}</Text>
                </View>
                <View>
                  <Text style={styles.groupName}>{group.name}</Text>
                  <Text style={styles.groupMeta}>{group.members} anggota</Text>
                </View>
              </View>
              <View style={[styles.roleBadge, group.role === 'admin' && { backgroundColor: `${theme.colors.brandPrimary}15` }]}>
                <Text style={[styles.roleBadgeText, group.role === 'admin' && { color: theme.colors.brandPrimary }]}>
                  {group.role === 'admin' ? 'Admin' : 'Member'}
                </Text>
              </View>
            </View>

            <View style={styles.groupBottom}>
              <View>
                <Text style={styles.balanceLabel}>Saldo Grup</Text>
                <Text style={styles.balanceValue}>Rp {group.balance.toLocaleString('id-ID')}</Text>
              </View>
              <Pressable style={styles.detailButton}>
                <Text style={styles.detailButtonText}>Detail</Text>
              </Pressable>
            </View>
          </Pressable>
        ))}

        <Pressable style={styles.joinCard}>
          <View style={styles.joinIcon}>
            <Text style={styles.joinIconText}>🔗</Text>
          </View>
          <View style={styles.joinContent}>
            <Text style={styles.joinTitle}>Gabung ke Grup</Text>
            <Text style={styles.joinSub}>Masukkan kode undangan untuk bergabung ke grup yang sudah ada.</Text>
          </View>
        </Pressable>

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
    groupCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: theme.colors.borderSoft,
      padding: 14,
      gap: 12,
    },
    groupTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    groupLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    groupEmoji: {
      width: 46,
      height: 46,
      borderRadius: 14,
      backgroundColor: theme.colors.mutedSurface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    groupEmojiText: { fontSize: 22 },
    groupName: { color: theme.colors.textPrimary, fontSize: 15, fontWeight: '700' },
    groupMeta: { color: theme.colors.textMuted, fontSize: 12, marginTop: 2 },
    roleBadge: {
      backgroundColor: theme.colors.mutedSurface,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    roleBadgeText: { color: theme.colors.textSecondary, fontSize: 11, fontWeight: '700' },
    groupBottom: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderTopWidth: 1,
      borderTopColor: theme.colors.borderSoft,
      paddingTop: 10,
    },
    balanceLabel: { color: theme.colors.textSecondary, fontSize: 12, fontWeight: '600' },
    balanceValue: { color: theme.colors.textPrimary, fontSize: 16, fontWeight: '800', marginTop: 2 },
    detailButton: {
      backgroundColor: `${theme.colors.brandPrimary}15`,
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    detailButtonText: { color: theme.colors.brandPrimary, fontSize: 11, fontWeight: '700' },
    joinCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: theme.colors.borderSoft,
      borderStyle: 'dashed',
      padding: 14,
      flexDirection: 'row',
      gap: 12,
      alignItems: 'center',
    },
    joinIcon: {
      width: 46,
      height: 46,
      borderRadius: 14,
      backgroundColor: theme.colors.mutedSurface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    joinIconText: { fontSize: 22 },
    joinContent: { flex: 1 },
    joinTitle: { color: theme.colors.textPrimary, fontSize: 14, fontWeight: '800' },
    joinSub: { color: theme.colors.textMuted, fontSize: 12, marginTop: 2, lineHeight: 18 },
  })
}
