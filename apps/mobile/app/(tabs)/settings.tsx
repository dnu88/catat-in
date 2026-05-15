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
  const [budgetAlert, setBudgetAlert] = useState(true)

  const onLogout = async () => {
    await supabase.auth.signOut()
    router.replace('/(auth)/login')
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Pengaturan</Text>
            <Text style={styles.subtitle}>Sesuaikan pengalaman aplikasi.</Text>
          </View>
        </View>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.profileAvatar}>
            <Text style={styles.profileAvatarText}>DB</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>Danu Baskara</Text>
            <Text style={styles.profileEmail}>danu@example.com</Text>
          </View>
          <Pressable style={styles.profileEdit}>
            <Text style={styles.profileEditText}>Edit</Text>
          </Pressable>
        </View>

        {/* Theme Section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Tampilan</Text>
          <Text style={styles.sectionSub}>Pilih tema yang nyaman di mata.</Text>

          <View style={styles.themeGrid}>
            {(['system', 'light', 'dark'] as const).map((mode) => (
              <Pressable
                key={mode}
                onPress={() => setPreference(mode)}
                style={[
                  styles.themeChip,
                  preference === mode && {
                    backgroundColor: theme.colors.brandPrimary,
                    borderColor: theme.colors.brandPrimary,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.themeChipText,
                    preference === mode && { color: theme.colors.textInverse },
                  ]}
                >
                  {mode === 'system' ? 'Sistem' : mode === 'light' ? 'Terang' : 'Gelap'}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Notifications Section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Notifikasi</Text>
          <Text style={styles.sectionSub}>Kelola pengingat penting.</Text>

          <ToggleRow
            icon="📊"
            title="Ringkasan Harian"
            helper="Notifikasi kondisi keuangan setiap malam"
            value={dailyReminder}
            onToggle={() => setDailyReminder((v) => !v)}
          />
          <ToggleRow
            icon="📄"
            title="Pengingat Tagihan"
            helper="Notifikasi sebelum jatuh tempo"
            value={billReminder}
            onToggle={() => setBillReminder((v) => !v)}
          />
          <ToggleRow
            icon="🎯"
            title="Alert Anggaran"
            helper="Notifikasi saat budget hampir habis"
            value={budgetAlert}
            onToggle={() => setBudgetAlert((v) => !v)}
          />
        </View>

        {/* Quick Links */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Akses Cepat</Text>
          <Text style={styles.sectionSub}>Navigasi ke halaman lain.</Text>

          <NavRow icon="💳" title="Dompet" helper="Kelola saldo akun" onPress={() => router.push('/(tabs)/wallets')} />
          <NavRow icon="🎯" title="Anggaran" helper="Batas pengeluaran" onPress={() => router.push('/(tabs)/budgets')} />
          <NavRow icon="📄" title="Tagihan" helper="Pengingat rutin" onPress={() => router.push('/(tabs)/bills')} />
          <NavRow icon="👥" title="Grup" helper="Keuangan bersama" onPress={() => router.push('/(tabs)/groups')} />
          <NavRow icon="📥" title="Import" helper="Mutasi & struk" onPress={() => router.push('/(tabs)/imports')} />
        </View>

        {/* Account Section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Akun & Keamanan</Text>

          <NavRow icon="🔐" title="Ubah Password" helper="Perbarui password akun" onPress={() => {}} />
          <NavRow icon="🌐" title="Bahasa" helper="Bahasa Indonesia" onPress={() => {}} />
          <NavRow icon="📋" title="Kebijakan Privasi" helper="Baca syarat & ketentuan" onPress={() => {}} />
        </View>

        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={styles.appName}>kaswise v1.0.0</Text>
          <Text style={styles.appTagline}>Catat Keuangan, Bijak Setiap Hari</Text>
        </View>

        {/* Logout */}
        <Pressable style={styles.logoutBtn} onPress={onLogout}>
          <Text style={styles.logoutText}>Keluar dari Akun</Text>
        </Pressable>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  )
}

function ToggleRow({
  icon,
  title,
  helper,
  value,
  onToggle,
}: {
  icon: string
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
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 10,
        borderTopWidth: 1,
        borderTopColor: theme.colors.borderSoft,
        gap: 12,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
        <Text style={{ fontSize: 18 }}>{icon}</Text>
        <View style={{ flex: 1 }}>
          <Text style={{ color: theme.colors.textPrimary, fontSize: 13, fontWeight: '700' }}>{title}</Text>
          <Text style={{ color: theme.colors.textMuted, fontSize: 11, marginTop: 1 }}>{helper}</Text>
        </View>
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

function NavRow({
  icon,
  title,
  helper,
  onPress,
}: {
  icon: string
  title: string
  helper: string
  onPress: () => void
}) {
  const { theme } = useTheme()

  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 10,
        borderTopWidth: 1,
        borderTopColor: theme.colors.borderSoft,
        gap: 12,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
        <Text style={{ fontSize: 18 }}>{icon}</Text>
        <View>
          <Text style={{ color: theme.colors.textPrimary, fontSize: 13, fontWeight: '700' }}>{title}</Text>
          <Text style={{ color: theme.colors.textMuted, fontSize: 11, marginTop: 1 }}>{helper}</Text>
        </View>
      </View>
      <Text style={{ color: theme.colors.textMuted, fontSize: 16 }}>›</Text>
    </Pressable>
  )
}

function createStyles(theme: ReturnType<typeof useTheme>['theme']) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.colors.background },
    content: { padding: 20, gap: 14, paddingBottom: 26 },
    headerRow: { marginBottom: 4 },
    title: { color: theme.colors.textPrimary, fontSize: theme.typography.fontSize['4xl'], fontWeight: theme.typography.fontWeight.extrabold, letterSpacing: theme.typography.letterSpacing.tight },
    subtitle: { color: theme.colors.textSecondary, fontSize: theme.typography.fontSize.sm, marginTop: 2 },
    profileCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.colors.borderSoft,
      padding: 14,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    profileAvatar: {
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: theme.colors.brandPrimary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    profileAvatarText: { color: theme.colors.textInverse, fontSize: 16, fontWeight: '800' },
    profileInfo: { flex: 1 },
    profileName: { color: theme.colors.textPrimary, fontSize: theme.typography.fontSize.lg, fontWeight: theme.typography.fontWeight.extrabold },
    profileEmail: { color: theme.colors.textMuted, fontSize: theme.typography.fontSize.sm, marginTop: 2 },
    profileEdit: {
      backgroundColor: `${theme.colors.brandPrimary}15`,
      borderRadius: theme.radius.pill,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    profileEditText: { color: theme.colors.brandPrimary, fontSize: 12, fontWeight: '700' },
    sectionCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: theme.colors.borderSoft,
      padding: 14,
      gap: 10,
    },
    sectionTitle: { color: theme.colors.textPrimary, fontSize: 15, fontWeight: '800' },
    sectionSub: { color: theme.colors.textSecondary, fontSize: 12 },
    themeGrid: { flexDirection: 'row', gap: 8 },
    themeChip: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.borderSoft,
      backgroundColor: theme.colors.mutedSurface,
      alignItems: 'center',
    },
    themeChipText: { color: theme.colors.textSecondary, fontSize: 12, fontWeight: '700' },
    appInfo: { alignItems: 'center', paddingVertical: 10, gap: 4 },
    appName: { color: theme.colors.textMuted, fontSize: 13, fontWeight: '700' },
    appTagline: { color: theme.colors.textMuted, fontSize: 11 },
    logoutBtn: {
      backgroundColor: `${theme.colors.danger}12`,
      borderWidth: 1,
      borderColor: `${theme.colors.danger}40`,
      borderRadius: 14,
      paddingVertical: 14,
      alignItems: 'center',
    },
    logoutText: { color: theme.colors.danger, fontSize: 14, fontWeight: '700' },
  })
}
