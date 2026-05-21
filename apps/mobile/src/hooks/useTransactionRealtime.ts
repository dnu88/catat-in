import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { FinanceContext } from '../services/finance-context-query'
import { useFinanceContext } from '../state/finance-context'
import type { Transaction } from '../types'

export function transactionChannelName(context: FinanceContext) {
  return context.type === 'household'
    ? `transactions:household:${context.householdId}`
    : 'transactions:personal'
}

export function transactionRealtimeFilter(context: FinanceContext) {
  return context.type === 'household'
    ? `household_id=eq.${context.householdId}`
    : undefined
}

function transactionBelongsToContext(
  transaction: Pick<Transaction, 'id'> & { household_id?: string | null },
  transactionId: string,
  context: FinanceContext,
) {
  if (transaction.id !== transactionId) return false

  if (context.type === 'household') {
    return transaction.household_id === context.householdId
  }

  return transaction.household_id == null
}

export function useTransactionRealtime(transactionId: string | null) {
  const { activeContext } = useFinanceContext()
  const [transaction, setTransaction] = useState<Transaction | null>(null)
  const [loading, setLoading] = useState(false)

  const refetch = useCallback(() => {
    if (!transactionId) {
      setTransaction(null)
      setLoading(false)
      return
    }

    setLoading(true)

    const query = supabase
      .from('transactions')
      .select('*')
      .eq('id', transactionId)

    const contextQuery = activeContext.type === 'household'
      ? query.eq('household_id', activeContext.householdId)
      : query.is('household_id', null)

    contextQuery
      .maybeSingle()
      .then(({ data }) => {
        setTransaction(data ? (data as Transaction) : null)
        setLoading(false)
      })
  }, [activeContext, transactionId])

  useEffect(() => {
    refetch()

    if (!transactionId) {
      return
    }

    const filter = transactionRealtimeFilter(activeContext)
    const channel = (supabase
      .channel(transactionChannelName(activeContext)) as any)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions',
          ...(filter ? { filter } : {}),
        },
        (payload: { new?: Transaction; old?: Transaction }) => {
          const next = payload.new
          const previous = payload.old

          if (next && transactionBelongsToContext(next, transactionId, activeContext)) {
            setTransaction(next)
            return
          }

          if (previous?.id === transactionId) {
            refetch()
          }
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [activeContext, refetch, transactionId])

  return { transaction, loading }
}
