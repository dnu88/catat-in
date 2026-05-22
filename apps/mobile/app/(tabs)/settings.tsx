import { router } from 'expo-router'
import { useMemo, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'

import { useSupabase } from '../../src/lib/supabase'
import type { KaswiseIconName } from '../../src/components/icons/kaswise-icons'
import { KaswiseLogoMark } from '../../src/components/brand/KaswiseLogoMark'
import { IconBubble } from '../../src/components/ui'
import { useTheme } from '../../src/theme/theme-context'
import { useI18n } from '../../src/i18n/i18n-context'

export default function SettingsScreen() {
  const { supabase } = useSupabase()
  const { theme, preference, setPreference } = useTheme()
  const { language, setLanguage, t } = useI18n()
  const styles = useMemo(() => createStyles(theme), [theme])
  const [dailyReminder, setDailyReminder] = useState(true)
  const [billReminder, setBillReminder] = useState(true)
  const [budgetAlert, setBudgetAlert] = useState(true)

  const onLogout = async () => {
    await supabase.auth.signOut()
    router.replace('/(auth)/login')
  }

  const themeLabels = {
    system: language === 'id' ? 'Sistem' : 'System',
    light: language === 'id' ? 'Terang' : 'Light',
    dark: language === 'id' ? 'Gelap' : 'Dark',
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.headerRow}>
          <View style={styles.headerCopy}>
            <Text style={styles.title}>{t('settingsTitle')}</Text>
            <Text style={styles.subtitle}>{t('settingsSubtitle')}</Text>
          </View>
          <KaswiseLogoMark testID="settings-kaswise-logo-mark" size={42} />
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
        </View>

        {/* Family Section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>{language === 'id' ? 'Keluarga' : 'Family'}</Text>
          <Text style={styles.sectionSub}>
            {language === 'id'
              ? 'Kelola akses keluarga, undangan, dan mode keuangan bersama.'
              : 'Manage household access, invites, and shared finance mode.'}
          </Text>
          <Pressable
            testID="settings-family-center"
            accessibilityRole="button"
            accessibilityLabel={language === 'id' ? 'Buka pusat keluarga' : 'Open family center'}
            style={styles.navigationRow}
            onPress={() => router.push('/(tabs)/groups')}
          >
            <View style={styles.navigationCopy}>
              <IconBubble name="groups" tone="primary" size={32} />
              <View style={styles.navigationTextBlock}>
                <Text style={styles.navigationTitle}>{language === 'id' ? 'Pusat Keluarga' : 'Family Center'}</Text>
                <Text style={styles.navigationHelper}>
                  {language === 'id' ? 'Buat keluarga atau gabung dengan kode undangan.' : 'Create a family or join with an invite code.'}
                </Text>
              </View>
            </View>
            <Text style={styles.navigationChevron}>›</Text>
          </Pressable>
        </View>

        {/* Theme Section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>{language === 'id' ? 'Tampilan' : 'Appearance'}</Text>
          <Text style={styles.sectionSub}>{language === 'id' ? 'Pilih tema yang nyaman di mata.' : 'Choose a comfortable theme.'}</Text>

          <View style={styles.themeGrid}>
            {(['system', 'light', 'dark'] as const).map((mode) => (
              <Pressable
                key={mode}
                testID={`settings-theme-${mode}`}
                onPress={() => setPreference(mode)}
                style={[
                  styles.themeChip,
                  preference === mode && {
                    backgroundColor: theme.mode === 'light' ? theme.colors.brandPrimaryDeep : theme.colors.brandPrimary,
                    borderColor: theme.mode === 'light' ? theme.colors.brandPrimaryDeep : theme.colors.brandPrimary,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.themeChipText,
                    preference === mode && { color: theme.colors.textInverse },
                  ]}
                >
                  {themeLabels[mode]}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Language Section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>{t('languageSection')}</Text>
          <Text style={styles.sectionSub}>{t('languageSectionHelper')}</Text>

          <View style={styles.themeGrid}>
            {(['id', 'en'] as const).map((lang) => (
              <Pressable
                key={lang}
                testID={`settings-language-${lang}`}
                onPress={() => setLanguage(lang)}
                style={[
                  styles.themeChip,
                  language === lang && {
                    backgroundColor: theme.mode === 'light' ? theme.colors.brandPrimaryDeep : theme.colors.brandPrimary,
                    borderColor: theme.mode === 'light' ? theme.colors.brandPrimaryDeep : theme.colors.brandPrimary,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.themeChipText,
                    language === lang && { color: theme.colors.textInverse },
                  ]}
                >
                  {lang === 'id' ? t('indonesian') : t('english')}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Notifications Section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>{language === 'id' ? 'Notifikasi' : 'Notifications'}</Text>
          <Text style={styles.sectionSub}>{language === 'id' ? 'Kelola pengingat penting.' : 'Manage important reminders.'}</Text>

          <ToggleRow
            icon="chart"
            tone="info"
            title={language === 'id' ? 'Ringkasan Harian' : 'Daily Summary'}
            helper={language === 'id' ? 'Notifikasi kondisi keuangan setiap malam' : 'Nightly financial condition notification'}
            value={dailyReminder}
            onToggle={() => setDailyReminder((v) => !v)}
            theme={theme}
          />
          <ToggleRow
            icon="bills"
            tone="warning"
            title={language === 'id' ? 'Pengingat Tagihan' : 'Bill Reminder'}
            helper={language === 'id' ? 'Notifikasi sebelum jatuh tempo' : 'Notification before due date'}
            value={billReminder}
            onToggle={() => setBillReminder((v) => !v)}
            theme={theme}
          />
          <ToggleRow
            icon="budgets"
            tone="primary"
            title={language === 'id' ? 'Alert Anggaran' : 'Budget Alert'}
            helper={language === 'id' ? 'Notifikasi saat budget hampir habis' : 'Notification when budget is nearly depleted'}
            value={budgetAlert}
            onToggle={() => setBudgetAlert((v) => !v)}
            theme={theme}
          />
        </View>


        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={styles.appName}>kaswise v1.0.0</Text>
          <Text style={styles.appTagline}>{language === 'id' ? 'Catat Keuangan, Bijak Setiap Hari' : 'Track Finances, Wise Every Day'}</Text>
        </View>

        {/* Logout */}
        <Pressable style={styles.logoutBtn} onPress={onLogout}>
          <Text style={styles.logoutText}>{language === 'id' ? 'Keluar dari Akun' : 'Sign Out'}</Text>
        </Pressable>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  )
}

function ToggleRow({
  icon,
  tone,
  title,
  helper,
  value,
  onToggle,
  theme,
}: {
  icon: KaswiseIconName
  tone: 'primary' | 'success' | 'warning' | 'danger' | 'accent' | 'info'
  title: string
  helper: string
  value: boolean
  onToggle: () => void
  theme: ReturnType<typeof useTheme>['theme']
}) {
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
        <IconBubble name={icon} tone={tone} size={32} />
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
          backgroundColor: value ? (theme.mode === 'light' ? theme.colors.brandPrimaryDeep : theme.colors.brandPrimary) : theme.colors.borderStrong,
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
  const lightBrand = theme.mode === 'light' ? theme.colors.brandPrimaryDeep : theme.colors.brandPrimary

  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.colors.background },
    content: { padding: 20, gap: 10, paddingBottom: 26 },
    headerRow: { marginBottom: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 14 },
    headerCopy: { flex: 1 },
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
      backgroundColor: lightBrand,
      alignItems: 'center',
      justifyContent: 'center',
    },
    profileAvatarText: { color: theme.colors.textInverse, fontSize: 16, fontWeight: '800' },
    profileInfo: { flex: 1 },
    profileName: { color: theme.colors.textPrimary, fontSize: theme.typography.fontSize.lg, fontWeight: theme.typography.fontWeight.extrabold },
    profileEmail: { color: theme.colors.textMuted, fontSize: theme.typography.fontSize.sm, marginTop: 2 },
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
    navigationRow: {
      minHeight: 56,
      borderTopWidth: 1,
      borderTopColor: theme.colors.borderSoft,
      paddingTop: 10,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    navigationCopy: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
    navigationTextBlock: { flex: 1 },
    navigationTitle: { color: theme.colors.textPrimary, fontSize: 13, fontWeight: '800' },
    navigationHelper: { color: theme.colors.textMuted, fontSize: 11, marginTop: 1 },
    navigationChevron: { color: theme.colors.textMuted, fontSize: 24, fontWeight: '700' },
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
