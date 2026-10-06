import { useState } from 'react'
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import type { Language } from '../../i18n/i18n-context'
import { financeEditorial as fe } from '../../theme/finance-editorial'
import { useTheme } from '../../theme/theme-context'

export function SettingsLanguageRow({ language, onSelect }: { language: Language; onSelect: (language: Language) => void }) {
  const [open, setOpen] = useState(false)
  const { theme } = useTheme()
  const title = language === 'id' ? 'Bahasa aplikasi' : 'App language'
  const closeLabel = language === 'id' ? 'Tutup' : 'Close'
  return (
    <View testID="settings-language">
      <Pressable testID="settings-language-row" accessibilityRole="button" accessibilityLabel={`${title}, ${language === 'id' ? 'Indonesia' : 'English'}`} accessibilityHint={language === 'id' ? 'Buka pilihan bahasa' : 'Open language selector'} onPress={() => setOpen(true)} style={[styles.row, { borderColor: theme.colors.borderSoft }]}>
        <Text style={[theme.typography.cardTitle, { color: fe.ink, flex: 1 }]}>{title}</Text>
        <Text style={{ color: fe.blue, fontWeight: '600' }}>{language === 'id' ? 'Indonesia' : 'English'}</Text>
        <Text accessible={false} style={{ color: fe.slate, fontSize: 24 }}>›</Text>
      </Pressable>
      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={styles.overlay}>
          <Pressable accessibilityRole="button" accessibilityLabel={closeLabel} onPress={() => setOpen(false)} style={StyleSheet.absoluteFill} />
          <View testID="settings-language-sheet" accessibilityViewIsModal style={styles.sheet}>
            <Text accessibilityRole="header" style={[theme.typography.cardTitle, { color: fe.ink }]}>{language === 'id' ? 'Pilih bahasa' : 'Choose language'}</Text>
            {(['id', 'en'] as const).map(option => (
              <Pressable key={option} testID={`settings-language-${option}`} accessibilityRole="radio" accessibilityLabel={option === 'id' ? 'Indonesia' : 'English'} accessibilityState={{ selected: language === option, checked: language === option }} onPress={() => { onSelect(option); setOpen(false) }} style={styles.option}>
                <Text style={{ color: fe.ink, fontSize: 16 }}>{option === 'id' ? 'Indonesia' : 'English'}</Text>
                {language === option ? <Text accessible={false} style={{ color: fe.blue }}>✓</Text> : null}
              </Pressable>
            ))}
            <Pressable testID="settings-language-close" accessibilityRole="button" accessibilityLabel={closeLabel} onPress={() => setOpen(false)} style={styles.option}><Text style={{ color: fe.blue }}>{closeLabel}</Text></Pressable>
          </View>
        </View>
      </Modal>
    </View>
  )
}
const styles = StyleSheet.create({
  row: { minHeight: 56, padding: 16, gap: 12, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 16, backgroundColor: fe.white },
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(6,10,28,0.35)' },
  sheet: { backgroundColor: fe.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 36 },
  option: { minHeight: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
})
