import { useMemo, useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { useRouter } from 'expo-router'

import { useTransactionRealtime } from '../../src/hooks/useTransactionRealtime'
import { useSupabase } from '../../src/lib/supabase'
import { useTheme } from '../../src/theme/theme-context'
import { IconBubble } from '../../src/components/ui'
import { KaswiseIcon, type KaswiseIconName } from '../../src/components/icons/kaswise-icons'

const modes = [
  { id: 'Teks', label: 'Teks', icon: 'file' as KaswiseIconName, helper: 'Ketik transaksi dengan bahasa natural' },
  { id: 'Foto', label: 'Foto', icon: 'upload' as KaswiseIconName, helper: 'Scan struk belanja dengan OCR' },
  { id: 'Rekam', label: 'Suara', icon: 'notification' as KaswiseIconName, helper: 'Rekam suara transaksi (Whisper)' },
  { id: 'Import', label: 'Import', icon: 'imports' as KaswiseIconName, helper: 'Import mutasi bank & e-wallet' },
] as const

type ModeId = (typeof modes)[number]['id']

export default function CaptureScreen() {
  const { supabase } = useSupabase()
  const { theme } = useTheme()
  const router = useRouter()
  const styles = useMemo(() => createStyles(theme), [theme])

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

  const isSuccess = transaction?.status === 'done' || (transaction?.confidence ?? 0) >= 0.85
  const isError = Boolean(error) || transaction?.status === 'error'
  const isProcessing = Boolean(transactionId) && !isSuccess && !isError
  const envelopeSuggestion = (transaction as any)?.envelope_suggestion as null | {
    name: string
    remaining_after_transaction?: number
    needs_review?: boolean
  }

  const resetCapture = (clearText = true) => {
    setTransactionId(null)
    setSubmitting(false)
    setError(null)
    if (clearText) setTextInput('')
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Capture AI</Text>
            <Text style={styles.subtitle}>Catat otomatis dengan kecerdasan buatan.</Text>
          </View>
        </View>

        <View style={styles.inputArea}>
          <View style={styles.inputHeader}>
            <Text style={styles.inputTitle}>Mode Teks</Text>
            <Text style={styles.inputHelper}>Ketik transaksi dengan bahasa natural</Text>
          </View>

          <View style={styles.textContainer}>
            <TextInput
              style={styles.textArea}
              value={textInput}
              onChangeText={setTextInput}
              multiline
              placeholder="Contoh: Beli kopi 35rb di Kopi Kenangan pakai QRIS"
              placeholderTextColor={theme.colors.textMuted}
            />

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

            <Text style={styles.comingSoonText}>Mode lain segera hadir: Foto · Suara · Import</Text>
          </View>
        </View>

        {isProcessing && (
          <View style={styles.feedbackCard}>
            <View style={styles.feedbackIconWrap}>
              <KaswiseIcon name="notification" color={theme.colors.textMuted} size={28} weight="bold" />
            </View>
            <Text style={styles.feedbackTitle}>Sedang memproses...</Text>
            <Text style={styles.feedbackSub}>AI Kaswise sedang membaca transaksimu</Text>
            {loading && <ActivityIndicator size="small" color={theme.colors.brandPrimary} />}
          </View>
        )}

        {isSuccess && (
          <View style={styles.feedbackCard}>
            <View style={styles.feedbackIconWrap}>
              <KaswiseIcon name="capture" color={theme.colors.success} size={30} weight="bold" />
            </View>
            <Text style={styles.feedbackTitle}>Transaksi tercatat!</Text>
            <Text style={styles.feedbackSub}>Mau cek dulu sebelum disimpan?</Text>
            {envelopeSuggestion ? (
              <View testID="capture-envelope-suggestion" style={styles.suggestionCard}>
                <Text style={styles.suggestionLabel}>Amplop</Text>
                <Text style={styles.suggestionTitle}>{envelopeSuggestion.name}</Text>
                {typeof envelopeSuggestion.remaining_after_transaction === 'number' ? (
                  <Text style={styles.suggestionMeta}>
                    Rp{Math.max(envelopeSuggestion.remaining_after_transaction, 0).toLocaleString('id-ID')} tersisa setelah transaksi ini
                  </Text>
                ) : null}
                {envelopeSuggestion.needs_review ? <Text style={styles.suggestionWarning}>Perlu cek di Reports</Text> : null}
              </View>
            ) : null}
            <Pressable style={styles.secondaryButton} onPress={() => router.push('/(tabs)/transactions')}>
              <Text style={styles.secondaryButtonText}>Lihat & Review</Text>
            </Pressable>
            <Pressable onPress={() => resetCapture(true)}>
              <Text style={styles.textLink}>Langsung simpan</Text>
            </Pressable>
          </View>
        )}

        {isError && (
          <View style={styles.feedbackCard}>
            <View style={styles.feedbackIconWrap}>
              <KaswiseIcon name="notification" color={theme.colors.danger} size={28} weight="bold" />
            </View>
            <Text style={styles.feedbackTitle}>Gagal memproses</Text>
            <Text style={styles.feedbackSub}>{error || 'Transaksi belum berhasil diproses. Coba lagi sebentar.'}</Text>
            <Pressable style={styles.secondaryButton} onPress={() => resetCapture(false)}>
              <Text style={styles.secondaryButtonText}>Coba Lagi</Text>
            </Pressable>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  )
}

function createStyles(theme: ReturnType<typeof useTheme>['theme']) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.colors.background },
    content: { padding: 20, gap: 12, paddingBottom: 26 },
    headerRow: { marginBottom: 4 },
    title: { color: theme.colors.textPrimary, fontSize: theme.typography.fontSize['4xl'], fontWeight: theme.typography.fontWeight.extrabold, letterSpacing: theme.typography.letterSpacing.tight },
    subtitle: { color: theme.colors.textSecondary, fontSize: theme.typography.fontSize.sm, marginTop: 2 },
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
    submitButton: {
      backgroundColor: theme.colors.brandPrimary,
      borderRadius: theme.radius.pill,
      paddingVertical: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    submitButtonText: { color: theme.colors.textInverse, fontSize: theme.typography.fontSize.lg, fontWeight: theme.typography.fontWeight.bold },
    comingSoonText: { color: '#6B7280', fontSize: 12, textAlign: 'center', marginTop: 8 },
    feedbackCard: {
      backgroundColor: '#1E1E1A',
      borderRadius: 14,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.06)',
      padding: 20,
      gap: 10,
      alignItems: 'center',
    },
    feedbackIconWrap: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: theme.colors.mutedSurface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    feedbackTitle: { color: theme.colors.textPrimary, fontSize: 16, fontWeight: '800', textAlign: 'center' },
    feedbackSub: { color: theme.colors.textSecondary, fontSize: 13, textAlign: 'center', lineHeight: 20 },
    suggestionCard: {
      alignSelf: 'stretch',
      backgroundColor: theme.colors.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.colors.borderSoft,
      padding: 12,
      gap: 4,
    },
    suggestionLabel: {
      color: theme.colors.textSecondary,
      fontSize: 11,
      fontWeight: theme.typography.fontWeight.bold,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    suggestionTitle: {
      color: theme.colors.brandPrimary,
      fontSize: 15,
      fontWeight: theme.typography.fontWeight.extrabold,
    },
    suggestionMeta: { color: theme.colors.textSecondary, fontSize: 12, lineHeight: 18 },
    suggestionWarning: { color: theme.colors.warning, fontSize: 12, fontWeight: theme.typography.fontWeight.bold },
    secondaryButton: {
      backgroundColor: `${theme.colors.brandPrimary}15`,
      borderRadius: 999,
      paddingVertical: 10,
      alignItems: 'center',
      marginTop: 4,
    },
    secondaryButtonText: { color: theme.colors.brandPrimary, fontSize: 13, fontWeight: '700' },
    textLink: { color: theme.colors.textMuted, fontSize: 13, fontWeight: '700', textAlign: 'center' },
  })
}
