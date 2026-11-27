import { useEffect, useRef, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getNotificationPreferences, updateNotificationPreferences, type NotificationPreferences } from '../../services/notifications'

export type NotificationToggleKey = 'enabled' | 'daily_reminder_enabled' | 'bill_reminder_enabled' | 'budget_alert_enabled'

/** Serialize writes because the API returns a complete preference snapshot. */
export function useNotificationSettings(supabase: SupabaseClient) {
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<NotificationToggleKey | null>(null)
  const [error, setError] = useState<'load' | 'save' | null>(null)
  const epoch = useRef(0)
  const locked = useRef(false)
  const current = useRef<NotificationPreferences | null>(null)
  const reloadRef = useRef<() => void>(() => {})

  useEffect(() => {
    let userId: string | null | undefined
    const load = async () => {
      const request = ++epoch.current
      locked.current = true
      current.current = null
      setPrefs(null)
      setSaving(null)
      setLoading(true)
      setError(null)
      try {
        const next = await getNotificationPreferences(supabase)
        if (request !== epoch.current) return
        current.current = next
        setPrefs(next)
      } catch {
        if (request === epoch.current) setError('load')
      } finally {
        if (request === epoch.current) {
          locked.current = false
          setLoading(false)
        }
      }
    }
    reloadRef.current = () => { void load() }
    void load()
    const subscription = supabase.auth.onAuthStateChange?.((_event, session) => {
      const nextId = session?.user.id ?? null
      if (userId === nextId) return
      userId = nextId
      // Invalidate old-account reads/writes synchronously; defer API calls outside auth callback.
      ++epoch.current
      locked.current = true
      current.current = null
      setPrefs(null)
      setSaving(null)
      setLoading(true)
      const generation = epoch.current
      void Promise.resolve().then(() => {
        if (generation === epoch.current) void load()
      })
    }).data.subscription
    return () => {
      ++epoch.current
      locked.current = true
      subscription?.unsubscribe()
    }
  }, [supabase])

  const toggle = async (key: NotificationToggleKey) => {
    const previous = current.current
    if (locked.current || !previous) return
    locked.current = true
    const request = epoch.current
    setSaving(key)
    setError(null)
    setPrefs({ ...previous, [key]: !previous[key] })
    try {
      const saved = await updateNotificationPreferences(supabase, { [key]: !previous[key] })
      if (request !== epoch.current) return
      // Merge also supports servers returning only changed fields.
      const next = { ...previous, ...saved }
      current.current = next
      setPrefs(next)
    } catch {
      if (request !== epoch.current) return
      // A lost response does not prove the server rejected an idempotent PUT.
      try {
        const verified = await getNotificationPreferences(supabase)
        if (request !== epoch.current) return
        current.current = verified
        setPrefs(verified)
        setError(verified[key] === !previous[key] ? null : 'save')
      } catch {
        if (request !== epoch.current) return
        current.current = null
        setPrefs(null)
        setError('load')
      }
    } finally {
      if (request === epoch.current) {
        locked.current = false
        setSaving(null)
      }
    }
  }
  return { prefs, loading, saving, error, toggle, reload: () => reloadRef.current() }
}
