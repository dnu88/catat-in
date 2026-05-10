import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Transaction } from '../types'

export function useTransactionRealtime(transactionId: string | null) {
  const [transaction, setTransaction] = useState<Transaction | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!transactionId) {
      setTransaction(null)
      return
    }

    setLoading(true)

    // Fetch initial state
    supabase
      .from('transactions')
      .select('*')
      .eq('id', transactionId)
      .single()
      .then(({ data }) => {
        if (data) {
          setTransaction(data as Transaction)
        }
        setLoading(false)
      })

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`transaction:${transactionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'transactions',
          filter: `id=eq.${transactionId}`,
        },
        (payload: { new: Transaction }) => {
          setTransaction(payload.new)
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [transactionId])

  return { transaction, loading }
}
