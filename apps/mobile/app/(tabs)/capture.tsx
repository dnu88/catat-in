import { useMemo, useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'

import { useTransactionRealtime } from '../../src/hooks/useTransactionRealtime'
import { useSupabase } from '../../src/lib/supabase'
import { useTheme } from '../../src/theme/theme-context'

const modes = [
  { id: 'Teks', label: 'Teks', icon: '✏️', helper: 'Ketik transaksi dengan bahasa natural' },
  { id: 'Foto', label: 'Foto', icon: '📷', helper: 'Scan struk belanja dengan OCR' },
  { id: 'Rekam', label: 'Suara', icon: '🎙️', helper: 'Rekam suara transaksi (Whisper)' },
  { id: 'Import', label: 'Import', icon: '📥', helper: 'Import mutasi bank & e-wallet' },
] as const

type ModeId = (typeof modes)[number]['id']

export default function CaptureScreen() {
  const { supabase } = useSupabase()
  const { theme } = useTheme()
  const styles = useMemo(() => createStyles(theme), [theme])

  const [selectedMode, setSelectedMode] = useState<ModeId>('Teks')
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

    try {
      const { data: { user } } = await supabase.auth.getUser()

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
    } catch (e) {
      setError('Terjadi kesalahan sistem. Silakan coba lagi.')
      setSubmitting(false)
    }
  }

  const activeModeData = modes.find(m => m.id === selectedMode)

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Capture AI</Text>
            <Text style={styles.subtitle}>Catat otomatis dengan kecerdasan buatan.</Text>
          </View>
        </View>

        {/* Mode Grid */}
        <View style={styles.modeGrid}>
          {modes.map((mode) => (
            <Pressable
              key={mode.id}
              onPress={() => setSelectedMode(mode.id)}
              style={[
                styles.modeCard,
                selectedMode === mode.id && {
                  borderColor: theme.colors.brandPrimary,
                  backgroundColor: `${theme.colors.brandPrimary}08`,
                },
              ]}
            >
              <View style={[
                styles.modeIconWrap,
                selectedMode === mode.id && { backgroundColor: `${theme.colors.brandPrimary}1A` }
              ]}>
                <Text style={styles.modeIcon}>{mode.icon}</Text>
              </View>
              <Text style={[
                styles.modeLabel,
                selectedMode === mode.id && { color: theme.colors.brandPrimary }
              ]}>
                {mode.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.inputArea}>
          <View style={styles.inputHeader}>
            <Text style={styles.inputTitle}>Mode {activeModeData?.label}</Text>
            <Text style={styles.inputHelper}>{activeModeData?.helper}</Text>
          </View>

          {selectedMode === 'Teks' ? (
            <View style={styles.textContainer}>
              <TextInput
                style={styles.textArea}
                value={textInput}
                onChangeText={setTextInput}
                multiline
                placeholder="Contoh: Beli kopi 35rb di Kopi Kenangan pakai QRIS"
                placeholderTextColor={theme.colors.textMuted}
              />

              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              <Pressable
                style={[styles.submitButton, submitting && { opacity: 0.7 }]}
                onPress={submitText}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color={theme.colors.textInverse} />
                ) : (
                  <Text style={styles.submitButtonText}>Proses dengan AI</Text>
                )}
              </Pressable>
            </View>
          ) : (
            <View style={styles.placeholderCard}>
              <View style={styles.placeholderIconWrap}>
                <Text style={styles.placeholderIcon}>{activeModeData?.icon}</Text>
              </View>
              <Text style={styles.placeholderTitle}>Mode {activeModeData?.label} Segera Hadir</Text>
              <Text style={styles.placeholderSub}>
                Kami sedang menyiapkan flow terbaik untuk mode ini agar catatan keuanganmu makin mudah.
              </Text>
            </View>
          )}
        </View>

        {transactionId && (
          <View style={styles.statusCard}>
            <View style={styles.statusHeader}>
              <Text style={styles.statusTitle}>Status Pemrosesan AI</Text>
              {loading && <ActivityIndicator size="small" color={theme.colors.brandPrimary} />}
            </View>

            <View style={styles.statusContent}>
              <StatusRow
                label="ID Transaksi"
                value={transactionId.slice(0, 8)}
              />
              <StatusRow
                label="Status"
                value={transaction?.status || 'Processing...'}
                isStatus
                status={transaction?.status}
              />
              <StatusRow
                label="Akurasi (AI)"
                value={transaction?.confidence ? `${Math.round(transaction.confidence * 100)}%` : '-'}
              />
            </View>

            {transaction?.status === 'done' && (
              <Pressable style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonText}>Lihat Hasil & Review</Text>
              </Pressable>
            )}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  )
}

function StatusRow({ label, value, isStatus, status }: { label: string; value: string; isStatus?: boolean; status?: string }) {
  const { theme } = useTheme()
  return (
    <View style={styles.statusRow}>
      <Text style={styles.statusLabel}>{label}</Text>
      <Text style={[
        styles.statusValue,
        isStatus && status === 'done' && { color: theme.colors.success },
        isStatus && status === 'error' && { color: theme.colors.danger },
        isStatus && status === 'processing' && { color: theme.colors.warning },
      ]}>
        {value}
      </Text>
    </View>
  )
}

function createStyles(theme: ReturnType<typeof useTheme>['theme']) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.colors.background },
    content: { padding: 20, gap: 16, paddingBottom: 26 },
    headerRow: { marginBottom: 4 },
    title: { color: theme.colors.textPrimary, fontSize: 28, fontWeight: '800', letterSpacing: -0.4 },
    subtitle: { color: theme.colors.textSecondary, fontSize: 13, marginTop: 2 },
    modeGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    modeCard: {
      width: '48.3%',
      backgroundColor: theme.colors.surface,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: theme.colors.borderSoft,
      padding: 14,
      alignItems: 'center',
      gap: 8,
    },
    modeIconWrap: {
      width: 44,
      height: 44,
      borderRadius: 14,
      backgroundColor: theme.colors.mutedSurface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    modeIcon: { fontSize: 22 },
    modeLabel: { color: theme.colors.textSecondary, fontSize: 13, fontWeight: '700' },
    inputArea: {
      backgroundColor: theme.colors.surface,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.colors.borderSoft,
      padding: 16,
      gap: 16,
    },
    inputHeader: { gap: 2 },
    inputTitle: { color: theme.colors.textPrimary, fontSize: 16, fontWeight: '800' },
    inputHelper: { color: theme.colors.textSecondary, fontSize: 12 },
    textContainer: { gap: 12 },
    textArea: {
      minHeight: 120,
      borderWidth: 1,
      borderColor: theme.colors.borderStrong,
      borderRadius: 14,
      color: theme.colors.textPrimary,
      backgroundColor: theme.colors.mutedSurface,
      padding: 14,
      fontSize: 14,
      textAlignVertical: 'top',
    },
    errorText: {
      color: theme.colors.danger,
      fontSize: 12,
      fontWeight: '600',
      backgroundColor: `${theme.colors.danger}10`,
      padding: 10,
      borderRadius: 10,
    },
    submitButton: {
      backgroundColor: theme.colors.brandPrimary,
      borderRadius: 999,
      paddingVertical: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    submitButtonText: { color: theme.colors.textInverse, fontSize: 15, fontWeight: '700' },
    placeholderCard: {
      alignItems: 'center',
      paddingVertical: 10,
      gap: 10,
    },
    placeholderIconWrap: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: theme.colors.mutedSurface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    placeholderIcon: { fontSize: 30 },
    placeholderTitle: { color: theme.colors.textPrimary, fontSize: 15, fontWeight: '800' },
    placeholderSub: { color: theme.colors.textMuted, fontSize: 12, textAlign: 'center', lineHeight: 18 },
    statusCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.colors.borderSoft,
      padding: 16,
      gap: 12,
    },
    statusHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    statusTitle: { color: theme.colors.textPrimary, fontSize: 15, fontWeight: '800' },
    statusContent: { gap: 8 },
    statusRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 4,
    },
    statusLabel: { color: theme.colors.textSecondary, fontSize: 12, fontWeight: '600' },
    statusValue: { color: theme.colors.textPrimary, fontSize: 12, fontWeight: '700' },
    secondaryButton: {
      backgroundColor: `${theme.colors.brandPrimary}15`,
      borderRadius: 999,
      paddingVertical: 10,
      alignItems: 'center',
      marginTop: 4,
    },
    secondaryButtonText: { color: theme.colors.brandPrimary, fontSize: 13, fontWeight: '700' },
  })
}
