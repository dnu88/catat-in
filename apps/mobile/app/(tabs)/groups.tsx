import { useMemo } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'

import { Card, IconBubble, SectionHeader } from '../../src/components/ui'
import { useTheme } from '../../src/theme/theme-context'

const groups = [
  { id: '1', name: 'Keluarga Besar', members: 8, balance: 4250000, role: 'admin' },
  { id: '2', name: 'Kost Jl. Merdeka', members: 5, balance: 1850000, role: 'member' },
]

export default function GroupsScreen() {
  const { theme } = useTheme()
  const styles = useMemo(() => createStyles(theme), [theme])

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <SectionHeader
          title="Grup Keuangan"
          subtitle="Kelola keuangan bersama keluarga atau teman."
          action={<Pressable style={styles.addButton}><Text style={styles.addButtonText}>Buat</Text></Pressable>}
        />

        <Card variant="muted" style={styles.infoCard}>
          <IconBubble name="groups" tone="info" size={48} />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Fitur grup keuangan</Text>
            <Text style={styles.infoSub}>
              Catat pengeluaran bersama, pantau kontribusi, dan siapkan split bill dalam satu ruang.
            </Text>
          </View>
        </Card>

        {groups.map((group) => (
          <Card key={group.id} variant="default" style={styles.groupCard}>
            <View style={styles.groupTop}>
              <View style={styles.groupLeft}>
                <IconBubble name="groups" tone={group.role === 'admin' ? 'primary' : 'accent'} size={46} />
                <View>
                  <Text style={styles.groupName}>{group.name}</Text>
                  <Text style={styles.groupMeta}>{group.members} anggota</Text>
                </View>
              </View>
              <View style={[styles.roleBadge, group.role === 'admin' && styles.roleBadgeActive]}>
                <Text style={[styles.roleBadgeText, group.role === 'admin' && styles.roleBadgeTextActive]}>
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
          </Card>
        ))}

        <Pressable style={styles.joinCard}>
          <IconBubble name="imports" tone="accent" size={46} />
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
    content: { padding: 20, gap: 16, paddingBottom: 26 },
    addButton: {
      backgroundColor: theme.colors.brandPrimary,
      borderRadius: theme.radius.pill,
      paddingHorizontal: 14,
      paddingVertical: 8,
    },
    addButtonText: { color: theme.colors.textInverse, fontSize: 12, fontWeight: '800' },
    infoCard: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    infoContent: { flex: 1 },
    infoTitle: { color: theme.colors.textPrimary, fontSize: 14, fontWeight: '800' },
    infoSub: { color: theme.colors.textSecondary, fontSize: 12, marginTop: 4, lineHeight: 18 },
    groupCard: { gap: 12 },
    groupTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    groupLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
    groupName: { color: theme.colors.textPrimary, fontSize: 15, fontWeight: '800' },
    groupMeta: { color: theme.colors.textMuted, fontSize: 12, marginTop: 2 },
    roleBadge: {
      backgroundColor: theme.colors.mutedSurface,
      borderRadius: theme.radius.pill,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    roleBadgeActive: { backgroundColor: theme.iconBubbles.primary.background },
    roleBadgeText: { color: theme.colors.textSecondary, fontSize: 11, fontWeight: '700' },
    roleBadgeTextActive: { color: theme.colors.brandPrimary },
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
      backgroundColor: theme.iconBubbles.primary.background,
      borderRadius: theme.radius.pill,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    detailButtonText: { color: theme.colors.brandPrimary, fontSize: 11, fontWeight: '800' },
    joinCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.colors.borderSoft,
      borderStyle: 'dashed',
      padding: 14,
      flexDirection: 'row',
      gap: 12,
      alignItems: 'center',
    },
    joinContent: { flex: 1 },
    joinTitle: { color: theme.colors.textPrimary, fontSize: 14, fontWeight: '800' },
    joinSub: { color: theme.colors.textMuted, fontSize: 12, marginTop: 2, lineHeight: 18 },
  })
}
