import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'

export type Language = 'id' | 'en'
type TranslationKey = keyof typeof translations.id

type I18nContextValue = {
  language: Language
  setLanguage: (language: Language) => void
  t: (key: TranslationKey) => string
}

const translations = {
  id: {
    back: 'Kembali',
    language: 'Bahasa',
    languageHelper: 'Bahasa Indonesia',
    languageSection: 'Bahasa aplikasi',
    languageSectionHelper: 'Pilih bahasa untuk label, pesan, dan aksi utama.',
    indonesian: 'Indonesia',
    english: 'English',
    settingsTitle: 'Pengaturan',
    settingsSubtitle: 'Sesuaikan pengalaman aplikasi.',
    tabDashboard: 'Beranda',
    tabTransactions: 'Transaksi',
    tabBills: 'Tagihan',
    tabCapture: '',
    tabReports: 'Laporan',
    tabSettings: 'Setelan',
    headerKaswise: 'Kaswise',
    headerWallets: 'Dompet',
    headerBudgets: 'Anggaran',
    headerBills: 'Tagihan',
    headerGroups: 'Grup',
    headerImports: 'Impor',
    headerManualTransaction: 'Transaksi Manual',
    loginFailed: 'Login gagal. Periksa email dan password kamu.',
    registerFailed: 'Registrasi gagal. Coba lagi beberapa saat.',
    registerCheckEmail: 'Akun dibuat. Cek email untuk konfirmasi sebelum masuk.',
    passwordTooShort: 'Password minimal 8 karakter.',
    resetFailed: 'Gagal mengirim email reset. Coba lagi.',
    resetSuccess: 'Email reset password berhasil dikirim. Cek inbox kamu.',
    resetPasswordTitle: 'Buat password baru',
    resetPasswordSubtitle: 'Masukkan password baru untuk akun Kaswise-mu.',
    resetPasswordHeroTitle: 'Amankan kembali akunmu.',
    resetPasswordPreparing: 'Memeriksa link reset password...',
    resetPasswordReady: 'Link valid. Silakan buat password baru.',
    resetPasswordLinkInvalid: 'Link reset tidak valid atau sudah kedaluwarsa. Minta email reset baru.',
    resetPasswordUpdateFailed: 'Gagal memperbarui password. Coba lagi.',
    resetPasswordUpdateSuccess: 'Password berhasil diperbarui. Silakan login kembali.',
    resetPasswordButton: 'Simpan password baru',
    newPasswordLabel: 'Password baru',
    confirmPasswordLabel: 'Konfirmasi password',
    passwordsDoNotMatch: 'Konfirmasi password tidak sama.',
    appCrashedTitle: 'Aplikasi bermasalah',
    appCrashedDescription: 'Tutup lalu buka ulang Kaswise. Jika masih gagal, hubungi dukungan.',
    loginTitle: 'Masuk ke akunmu',
    loginSubtitle: 'Lanjutkan ke dashboard Kaswise kamu.',
    loginButton: 'Masuk',
    googleLoginButton: 'Masuk dengan Google',
    googleLoginFailed: 'Login Google gagal. Coba lagi.',
    authCallbackTitle: 'Menyelesaikan login',
    authCallbackSubtitle: 'Tunggu sebentar, Kaswise sedang menghubungkan akunmu.',
    authCallbackLoading: 'Memproses login...',
    authCallbackFailed: 'Login tidak dapat diselesaikan. Coba ulangi dari halaman login.',
    loginHeroTitle: 'Catat keuangan, tetap tenang, tetap rapi.',
    loginHeroDescription: 'Scan struk & catat chat dengan AI. Sinkron dompet, lacak budget dalam satu kopilot finansial.',
    registerTitle: 'Akun baru',
    registerSubtitle: 'Data kamu tetap privat dan aman.',
    registerButton: 'Daftar sekarang',
    registerHeroTitle: 'Buat akun untuk mulai mencatat dalam hitungan menit.',
    registerHeroDescription: 'Dompet, anggaran, dan tagihan tergabung dalam satu shell finansial yang sama di semua perangkat.',
    forgotPasswordTitle: 'Lupa password?',
    forgotPasswordSubtitle: 'Masukkan email akunmu, link reset akan dikirim ke inbox.',
    forgotPasswordButton: 'Kirim email reset',
    forgotPasswordHeroTitle: 'Kirim ulang akses ke akun Kaswise-mu.',
    forgotPasswordLink: 'Kembali ke login',
    alreadyHaveAccount: 'Sudah punya akun?',
    noAccount: 'Belum punya akun?',
    forgotPasswordPrompt: 'Lupa password?',
    nameLabel: 'Nama lengkap',
    emailLabel: 'Email',
    passwordLabel: 'Password',
    namePlaceholder: 'Andika Putra',
    emailPlaceholder: 'email@contoh.com',
    passwordPlaceholder: '••••••••',
    passwordHint: 'Minimal 8 karakter',
    statWalletNeat: 'Wallet rapi',
    statInsightFast: 'Insight cepat',
    statMultiWallet: 'Multi wallet',
    statInsightAI: 'Insight AI',
    trialEyebrow: 'Uji Coba Gratis',
    trialDaysLeft: 'hari tersisa',
    trialDayOf: 'Hari {day} dari {total}',
    trialUpgrade: 'Upgrade',
    trialDismiss: 'Tutup',
    aiUsage: 'Penggunaan AI',
    freePlanLimits: 'Batas paket gratis',
    unlockPremium: 'Buka',
    upsellChat: 'Obrolan',
    upsellPhoto: 'Foto',
    viewPlanDetails: 'Lihat detail paket →',
    planTitle: 'Paket',
    planFree: 'Gratis',
    planPremium: 'Premium',
    planFreeDesc: 'Akses dasar dengan batasan.',
    planValidUntil: 'Berlaku sampai ',
    planUpgrade: 'Upgrade ke Premium',
    planExtend: 'Perpanjang',
  },
  en: {
    back: 'Back',
    language: 'Language',
    languageHelper: 'English',
    languageSection: 'App language',
    languageSectionHelper: 'Choose language for labels, messages, and primary actions.',
    indonesian: 'Indonesian',
    english: 'English',
    settingsTitle: 'Settings',
    settingsSubtitle: 'Adjust your app experience.',
    tabDashboard: 'Home',
    tabTransactions: 'Transactions',
    tabBills: 'Bills',
    tabCapture: '',
    tabReports: 'Reports',
    tabSettings: 'Settings',
    headerKaswise: 'Kaswise',
    headerWallets: 'Wallets',
    headerBudgets: 'Budgets',
    headerBills: 'Bills',
    headerGroups: 'Groups',
    headerImports: 'Imports',
    headerManualTransaction: 'Manual Transaction',
    loginFailed: 'Login failed. Check your email and password.',
    registerFailed: 'Registration failed. Try again later.',
    registerCheckEmail: 'Account created. Check your email to confirm before signing in.',
    passwordTooShort: 'Password must be at least 8 characters.',
    resetFailed: 'Failed to send reset email. Try again.',
    resetSuccess: 'Password reset email sent. Check your inbox.',
    resetPasswordTitle: 'Create a new password',
    resetPasswordSubtitle: 'Enter a new password for your Kaswise account.',
    resetPasswordHeroTitle: 'Secure your account again.',
    resetPasswordPreparing: 'Checking password reset link...',
    resetPasswordReady: 'Link is valid. Create a new password.',
    resetPasswordLinkInvalid: 'Reset link is invalid or expired. Request a new reset email.',
    resetPasswordUpdateFailed: 'Failed to update password. Try again.',
    resetPasswordUpdateSuccess: 'Password updated. Please sign in again.',
    resetPasswordButton: 'Save new password',
    newPasswordLabel: 'New password',
    confirmPasswordLabel: 'Confirm password',
    passwordsDoNotMatch: 'Password confirmation does not match.',
    appCrashedTitle: 'App needs attention',
    appCrashedDescription: 'Close and reopen Kaswise. If it still fails, contact support.',
    loginTitle: 'Sign in to your account',
    loginSubtitle: 'Continue to your Kaswise dashboard.',
    loginButton: 'Sign in',
    googleLoginButton: 'Sign in with Google',
    googleLoginFailed: 'Google login failed. Try again.',
    authCallbackTitle: 'Completing login',
    authCallbackSubtitle: 'Please wait while Kaswise connects your account.',
    authCallbackLoading: 'Processing login...',
    authCallbackFailed: 'Login could not be completed. Try again from the login screen.',
    loginHeroTitle: 'Track finances, stay calm, stay organized.',
    loginHeroDescription: 'Capture receipts & chat transactions with AI. Sync wallets, track budgets in one financial copilot.',
    registerTitle: 'New account',
    registerSubtitle: 'Your data stays private and secure.',
    registerButton: 'Sign up now',
    registerHeroTitle: 'Create account to start tracking in minutes.',
    registerHeroDescription: 'Wallets, budgets, and bills unified in one financial shell across all devices.',
    forgotPasswordTitle: 'Forgot password?',
    forgotPasswordSubtitle: 'Enter your account email, reset link will be sent to inbox.',
    forgotPasswordButton: 'Send reset email',
    forgotPasswordHeroTitle: 'Regain access to your Kaswise account.',
    forgotPasswordLink: 'Back to login',
    alreadyHaveAccount: 'Already have an account?',
    noAccount: "Don't have an account?",
    forgotPasswordPrompt: 'Forgot password?',
    nameLabel: 'Full name',
    emailLabel: 'Email',
    passwordLabel: 'Password',
    namePlaceholder: 'John Doe',
    emailPlaceholder: 'email@example.com',
    passwordPlaceholder: '••••••••',
    passwordHint: 'At least 8 characters',
    statWalletNeat: 'Neat wallets',
    statInsightFast: 'Fast insights',
    statMultiWallet: 'Multi wallet',
    statInsightAI: 'AI insights',
    trialEyebrow: 'Free Trial',
    trialDaysLeft: 'days left',
    trialDayOf: 'Day {day} of {total}',
    trialUpgrade: 'Upgrade',
    trialDismiss: 'Dismiss',
    aiUsage: 'AI Usage',
    freePlanLimits: 'Free plan limits',
    unlockPremium: 'Unlock',
    upsellChat: 'Chat',
    upsellPhoto: 'Photo',
    viewPlanDetails: 'View plan details →',
    planTitle: 'Plan',
    planFree: 'Free',
    planPremium: 'Premium',
    planFreeDesc: 'Basic access with limits.',
    planValidUntil: 'Valid until ',
    planUpgrade: 'Upgrade to Premium',
    planExtend: 'Extend',
  },
} as const

const I18N_STORAGE_KEY = 'kaswise:language-preference'

function isLanguage(value: unknown): value is Language {
  return value === 'id' || value === 'en'
}

const I18nContext = createContext<I18nContextValue | null>(null)

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('id')

  useEffect(() => {
    let active = true

    AsyncStorage.getItem(I18N_STORAGE_KEY)
      .then((stored) => {
        if (active && isLanguage(stored)) {
          setLanguageState(stored)
        }
      })
      .catch(() => {})

    return () => {
      active = false
    }
  }, [])

  const value = useMemo<I18nContextValue>(
    () => ({
      language,
      setLanguage: (nextLanguage) => {
        setLanguageState(nextLanguage)
        AsyncStorage.setItem(I18N_STORAGE_KEY, nextLanguage).catch(() => {})
      },
      t: (key) => translations[language][key],
    }),
    [language],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const context = useContext(I18nContext)
  if (!context) {
    throw new Error('useI18n must be used within I18nProvider')
  }

  return context
}
