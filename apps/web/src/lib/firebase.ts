import { initializeApp } from 'firebase/app'
import {
  GoogleAuthProvider,
  getAuth,
  onAuthStateChanged,
  type User as FirebaseUser,
} from 'firebase/auth'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY?.trim(),
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN?.trim(),
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID?.trim(),
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET?.trim(),
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID?.trim(),
  appId: import.meta.env.VITE_FIREBASE_APP_ID?.trim(),
}

const hasMissingConfig = Object.values(firebaseConfig).some((value) => !value)

export const firebaseConfigError = hasMissingConfig
  ? 'Konfigurasi Firebase frontend belum valid. Isi VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN, VITE_FIREBASE_PROJECT_ID, VITE_FIREBASE_STORAGE_BUCKET, VITE_FIREBASE_MESSAGING_SENDER_ID, dan VITE_FIREBASE_APP_ID.'
  : null

const safeConfig = hasMissingConfig
  ? {
      apiKey: 'missing-api-key',
      authDomain: 'missing-auth-domain.firebaseapp.com',
      projectId: 'missing-project-id',
      storageBucket: 'missing-project-id.appspot.com',
      messagingSenderId: '0',
      appId: '1:0:web:0',
    }
  : (firebaseConfig as {
      apiKey: string
      authDomain: string
      projectId: string
      storageBucket: string
      messagingSenderId: string
      appId: string
    })

export const app = initializeApp(safeConfig)
export const auth = getAuth(app)
export const googleProvider = new GoogleAuthProvider()

export let currentAuthUser: FirebaseUser | null = auth.currentUser

let initialResolved = false
export const sessionReady = new Promise<FirebaseUser | null>((resolve) => {
  const unsubscribe = onAuthStateChanged(auth, (user) => {
    currentAuthUser = user
    if (!initialResolved) {
      initialResolved = true
      resolve(user)
      unsubscribe()
    }
  })
})

onAuthStateChanged(auth, (user) => {
  currentAuthUser = user
})

export function subscribeAuthState(listener: (user: FirebaseUser | null) => void) {
  return onAuthStateChanged(auth, listener)
}

export async function getCurrentIdToken(forceRefresh = false): Promise<string | null> {
  if (!auth.currentUser) return null
  return auth.currentUser.getIdToken(forceRefresh)
}
