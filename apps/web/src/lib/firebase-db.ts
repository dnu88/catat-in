import { enableIndexedDbPersistence, getFirestore } from 'firebase/firestore'
import { app } from './firebase'

export const db = getFirestore(app)

if (typeof window !== 'undefined') {
  void enableIndexedDbPersistence(db).catch(() => {
    // fallback online-only
  })
}
