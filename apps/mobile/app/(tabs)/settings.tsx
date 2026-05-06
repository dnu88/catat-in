import { router } from 'expo-router'
import { useMemo, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'

import { useSupabase } from '../../src/lib/supabase'
import { useTheme } from '../../src/theme/theme-context'

export default function SettingsScreen() {
  const { supabase } = useSupabase()
  const { theme, preference, setPreference } = useTheme()
  const styles = useMemo(() => createStyles(theme), [theme])
  const [dailyReminder, setDailyReminder] = useState(true)
  const [billReminder, setBillReminder] = useState(true)

  const onLogout = async () => {
    await supabase.auth.signOut()
    router.replace('/(auth)/login')
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>Pengaturan</Text>
          <Text style={styles.subtitle}>Atur pengalaman aplikasi sesuai preferensimu.</Text>
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Tema</Text>
        <Text style={styles.sectionSub}>Pilih tampilan yang paling nyaman di mata.</Text>

        <View style={styles.modeRow}>
          <ModeChip label="Sistem" active={preference === 'system'} onPress={() => setPreference('system')} />
          <ModeChip label="Light" active={preference === 'light'} onPress={() => setPreference('light')} />
          <ModeChip label="Dark" active={preference === 'dark'} onPress={() => setPreference('dark')} />
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Notifikasi</Text>
        <Text style={styles.sectionSub}>Pilih pengingat penting agar cashflow tetap terkontrol.</Text>

        <ToggleRow
          title="Ringkasan harian"
          helper="Notifikasi cek kondisi pemasukan dan pengeluaran"
          value={dailyReminder}
          onToggle={() => setDailyReminder((prev) => !prev)}
        />
        <ToggleRow
          title="Pengingat tagihan"
          helper="Notifikasi sebelum tanggal jatuh tempo"
          value={billReminder}
          onToggle={() => setBillReminder((prev) => !prev)}
        />
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Akun</Text>
        <Text style={styles.sectionSub}>Kelola keamanan akun dan preferensi aplikasi.</Text>

        <SettingRow title="Ubah password" helper="Perbarui password akun Supabase" />
        <SettingRow title="Bahasa" helper="Bahasa Indonesia" />
      </View>

      <Pressable style={styles.logoutBtn} onPress={onLogout}>
        <Text style={styles.logoutText}>Keluar dari akun</Text>
      </Pressable>
    </ScrollView>
  )
}

function ModeChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const { theme } = useTheme()

  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: active ? theme.colors.brandPrimary : theme.colors.borderSoft,
        backgroundColor: active ? `${theme.colors.brandPrimary}1A` : theme.colors.surface,
      }}
    >
      <Text style={{ color: active ? theme.colors.brandPrimary : theme.colors.textSecondary, fontSize: 12, fontWeight: '700' }}>
        {label}
      </Text>
    </Pressable>
  )
}

function SettingRow({ title, helper }: { title: string; helper: string }) {
  const { theme } = useTheme()

  return (
    <View style={{ paddingVertical: 10, borderTopWidth: 1, borderTopColor: theme.colors.borderSoft }}>
      <Text style={{ color: theme.colors.textPrimary, fontSize: 13, fontWeight: '700' }}>{title}</Text>
      <Text style={{ color: theme.colors.textMuted, fontSize: 11, marginTop: 2 }}>{helper}</Text>
    </View>
  )
}

function ToggleRow({
  title,
  helper,
  value,
  onToggle,
}: {
  title: string
  helper: string
  value: boolean
  onToggle: () => void
}) {
  const { theme } = useTheme()

  return (
    <Pressable
      onPress={onToggle}
      style={{
        paddingVertical: 10,
        borderTopWidth: 1,
        borderTopColor: theme.colors.borderSoft,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 10,
      }}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ color: theme.colors.textPrimary, fontSize: 13, fontWeight: '700' }}>{title}</Text>
        <Text style={{ color: theme.colors.textMuted, fontSize: 11, marginTop: 2 }}>{helper}</Text>
      </View>
      <View
        style={{
          width: 44,
          height: 24,
          borderRadius: 999,
          backgroundColor: value ? theme.colors.brandPrimary : theme.colors.borderStrong,
          padding: 2,
          justifyContent: 'center',
        }}
      >
        <View
          style={{
            width: 20,
            height: 20,
            borderRadius: 10,
            backgroundColor: theme.colors.textInverse,
            alignSelf: value ? 'flex-end' : 'flex-start',
          }}
        />
      </View>
    </Pressable>
  )
}

function createStyles(theme: ReturnType<typeof useTheme>['theme']) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.colors.background },
    content: { padding: 16, gap: 12, paddingBottom: 26 },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 12,
    },
    title: { color: theme.colors.textPrimary, fontSize: 26, fontWeight: '800', letterSpacing: -0.4 },
    subtitle: { color: theme.colors.textSecondary, fontSize: 13, marginTop: 2 },
    sectionCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.colors.borderSoft,
      padding: 14,
      gap: 10,
    },
    sectionTitle: {
      color: theme.colors.textPrimary,
      fontSize: 16,
      fontWeight: '800',
    },
    sectionSub: {
      color: theme.colors.textSecondary,
      fontSize: 12,
      lineHeight: 18,
    },
    modeRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 2,
    },
    logoutBtn: {
      backgroundColor: `${theme.colors.danger}1A`,
      borderWidth: 1,
      borderColor: `${theme.colors.danger}4D`,
      borderRadius: 14,
      paddingVertical: 12,
      alignItems: 'center',
      marginTop: 4,
    },
    logoutText: {
      color: theme.colors.danger,
      fontSize: 13,
      fontWeight: '700',
    },
  })
}
