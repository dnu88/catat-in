import { useMemo, useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'

import { useTransactionRealtime } from '../../src/hooks/useTransactionRealtime'
import { useSupabase } from '../../src/lib/supabase'
import { useTheme } from '../../src/theme/theme-context'

const modes = ['Teks', 'Foto', 'Rekam', 'Import'] as const

export default function CaptureScreen() {
  const { supabase } = useSupabase()
  const { theme } = useTheme()
  const styles = useMemo(() => createStyles(theme), [theme])

  const [selectedMode, setSelectedMode] = useState<(typeof modes)[number]>('Teks')
  const [textInput, setTextInput] = useState('')
  const [transactionId, setTransactionId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { transaction, loading } = useTransactionRealtime(transactionId)

  const submitText = async () => {
    const value = textInput.trim()
    if (!value || submitting) return

    setSubmitting(true)
    setError(null)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setError('Sesi login tidak ditemukan. Silakan login ulang.')
      setSubmitting(false)
      return
    }

    const { data, error: insertError } = await supabase
      .from('transactions')
      .insert({
        user_id: user.id,
        input_type: 'text',
        status: 'processing',
        raw_input: value,
        review_required: false,
      })
      .select('id')
      .single()

    if (insertError || !data?.id) {
      setError('Gagal membuat transaksi sementara. Coba lagi.')
      setSubmitting(false)
      return
    }

    setTransactionId(data.id)

    await supabase.functions.invoke('process-text', {
      body: {
        transaction_id: data.id,
        user_id: user.id,
        raw_text: value,
      },
    })

    setTextInput('')
    setSubmitting(false)
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>Capture AI</Text>
          <Text style={styles.subtitle}>Catat transaksi dengan teks, foto, rekam, atau import.</Text>
        </View>
      </View>

      <View style={styles.modeRow}>
        {modes.map((mode) => (
          <Pressable
            key={mode}
            onPress={() => setSelectedMode(mode)}
            style={[
              styles.modeChip,
              selectedMode === mode
                ? { backgroundColor: `${theme.colors.brandPrimary}1A`, borderColor: theme.colors.brandPrimary }
                : null,
            ]}
          >
            <Text style={[styles.modeChipText, selectedMode === mode ? { color: theme.colors.brandPrimary } : null]}>{mode}</Text>
          </Pressable>
        ))}
      </View>

      {selectedMode === 'Teks' ? (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Input Teks AI</Text>
          <Text style={styles.sectionSub}>Contoh: “beli makan 35rb di warteg pakai BCA”.</Text>

          <TextInput
            style={styles.textArea}
            value={textInput}
            onChangeText={setTextInput}
            multiline
            placeholder="Tulis transaksi dengan bahasa natural"
            placeholderTextColor={theme.colors.textMuted}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable style={styles.primaryButton} onPress={submitText} disabled={submitting}>
            {submitting ? <ActivityIndicator color={theme.colors.textInverse} /> : <Text style={styles.primaryButtonText}>Proses AI</Text>}
          </Pressable>
        </View>
      ) : (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Mode {selectedMode}</Text>
          <Text style={styles.sectionSub}>Flow lengkap mode ini akan disambungkan pada wave berikutnya (UI sudah disiapkan).</Text>
        </View>
      )}

      {transactionId ? (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Status Proses</Text>
          <Text style={styles.sectionSub}>ID: {transactionId}</Text>

          {loading ? <Text style={styles.statusText}>Memuat status terbaru...</Text> : null}

          {transaction ? (
            <>
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>Status</Text>
                <Text style={styles.statusValue}>{transaction.status}</Text>
              </View>
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>Confidence</Text>
                <Text style={styles.statusValue}>{transaction.confidence ?? 0}</Text>
              </View>
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>Perlu Review</Text>
                <Text style={styles.statusValue}>{transaction.review_required ? 'Ya' : 'Tidak'}</Text>
              </View>
            </>
          ) : null}
        </View>
      ) : null}
    </ScrollView>
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
    modeRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    modeChip: {
      borderRadius: 999,
      borderWidth: 1,
      borderColor: theme.colors.borderSoft,
      backgroundColor: theme.colors.surface,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    modeChipText: { color: theme.colors.textSecondary, fontSize: 12, fontWeight: '700' },
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
    textArea: {
      minHeight: 110,
      borderWidth: 1,
      borderColor: theme.colors.borderStrong,
      borderRadius: 12,
      color: theme.colors.textPrimary,
      backgroundColor: theme.colors.mutedSurface,
      paddingHorizontal: 12,
      paddingVertical: 10,
      textAlignVertical: 'top',
    },
    error: {
      color: theme.colors.danger,
      fontSize: 12,
      fontWeight: '600',
      backgroundColor: `${theme.colors.danger}1A`,
      borderWidth: 1,
      borderColor: `${theme.colors.danger}4D`,
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 8,
    },
    primaryButton: {
      backgroundColor: theme.colors.brandPrimary,
      borderRadius: 999,
      paddingVertical: 13,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 46,
    },
    primaryButtonText: {
      color: theme.colors.textInverse,
      fontSize: 15,
      fontWeight: '700',
    },
    statusText: {
      color: theme.colors.textMuted,
      fontSize: 12,
    },
    statusRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderTopWidth: 1,
      borderTopColor: theme.colors.borderSoft,
      paddingTop: 8,
    },
    statusLabel: {
      color: theme.colors.textSecondary,
      fontSize: 12,
      fontWeight: '600',
    },
    statusValue: {
      color: theme.colors.textPrimary,
      fontSize: 12,
      fontWeight: '700',
    },
  })
}
