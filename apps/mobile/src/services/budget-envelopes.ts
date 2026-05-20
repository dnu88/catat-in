export type BudgetEnvelopeStatus = 'active' | 'archived'

export type BudgetEnvelope = {
  id: string
  user_id: string
  name: string
  parent_category_id: string | null
  parent_category_name: string | null
  limit_amount: number
  start_date: string
  end_date: string
  icon: string | null
  color: string | null
  notes: string | null
  status: BudgetEnvelopeStatus
  created_at: string
  updated_at: string
}

export type EnvelopeAllocation = {
  id: string
  transaction_id: string
  envelope_id: string
  amount: number
  confidence: number | null
  needs_review: boolean
  transaction_date: string | null
  transaction_description: string | null
  created_at: string
  updated_at: string
}

export type EnvelopeProgress = {
  spent_amount: number
  remaining_amount: number
  used_percentage: number
  is_near_limit: boolean
  is_over_budget: boolean
  over_budget_amount: number
}

export type EnvelopeSummary = {
  envelope: BudgetEnvelope
  progress: EnvelopeProgress
  reviewCount: number
}

export type EnvelopeTransactionCandidate = {
  description: string | null
  merchant: string | null
  categoryName: string | null
  amount: number
}

export type EnvelopeMatch = {
  envelope: BudgetEnvelope
  confidence: number
  needs_review: boolean
}

const NEAR_LIMIT_THRESHOLD = 80
const HIGH_CONFIDENCE_THRESHOLD = 0.85

function toDateKey(value: string | null | undefined) {
  return value ? value.slice(0, 10) : ''
}

function normalize(value: string | null | undefined) {
  return (value ?? '').trim().toLowerCase()
}

function tokenize(value: string | null | undefined) {
  return normalize(value)
    .replace(/[^a-z0-9\s&]/gi, ' ')
    .split(/\s+/)
    .filter((token) => token.length >= 3)
}

export function getEnvelopeStatus(
  envelope: Pick<BudgetEnvelope, 'end_date' | 'status'>,
  todayKey = new Date().toISOString().slice(0, 10),
): BudgetEnvelopeStatus {
  if (envelope.status === 'archived') return 'archived'
  return toDateKey(envelope.end_date) < todayKey ? 'archived' : 'active'
}

export function buildEnvelopeProgress(
  envelope: Pick<BudgetEnvelope, 'id' | 'limit_amount' | 'start_date' | 'end_date'>,
  allocations: EnvelopeAllocation[],
): EnvelopeProgress {
  const start = toDateKey(envelope.start_date)
  const end = toDateKey(envelope.end_date)
  const spent = allocations
    .filter((allocation) => allocation.envelope_id === envelope.id)
    .filter((allocation) => {
      const transactionDate = toDateKey(allocation.transaction_date)
      return transactionDate >= start && transactionDate <= end
    })
    .reduce((sum, allocation) => sum + Number(allocation.amount ?? 0), 0)

  const limit = Number(envelope.limit_amount ?? 0)
  const usedPercentage = limit > 0 ? Math.round((spent / limit) * 100) : 0
  const remaining = limit - spent
  const isOverBudget = spent > limit

  return {
    spent_amount: spent,
    remaining_amount: remaining,
    used_percentage: usedPercentage,
    is_near_limit: usedPercentage >= NEAR_LIMIT_THRESHOLD && !isOverBudget,
    is_over_budget: isOverBudget,
    over_budget_amount: Math.max(spent - limit, 0),
  }
}

export function getHomeEnvelopeAlerts(items: EnvelopeSummary[], maxItems = 3) {
  return items
    .filter((item) => item.progress.is_over_budget || item.progress.is_near_limit)
    .sort((a, b) => {
      if (a.progress.is_over_budget !== b.progress.is_over_budget) {
        return a.progress.is_over_budget ? -1 : 1
      }
      return b.progress.used_percentage - a.progress.used_percentage
    })
    .slice(0, maxItems)
}

export function matchEnvelopeForTransaction(
  candidate: EnvelopeTransactionCandidate,
  envelopes: BudgetEnvelope[],
): EnvelopeMatch | null {
  const sourceText = `${candidate.description ?? ''} ${candidate.merchant ?? ''}`
  const sourceTokens = new Set(tokenize(sourceText))
  const sourceNormalized = normalize(sourceText)
  let best: { envelope: BudgetEnvelope; score: number } | null = null

  for (const envelope of envelopes) {
    let score = 0
    const envelopeName = normalize(envelope.name)
    const noteTokens = tokenize(envelope.notes)

    if (envelopeName && sourceTokens.has(envelopeName)) score += 4
    if (envelopeName && sourceNormalized.includes(envelopeName)) score += 2

    for (const token of noteTokens) {
      if (sourceTokens.has(token)) score += 2
    }

    if (
      candidate.categoryName &&
      envelope.parent_category_name &&
      normalize(candidate.categoryName) === normalize(envelope.parent_category_name)
    ) {
      score += 2
    }

    if (!best || score > best.score) best = { envelope, score }
  }

  if (!best || best.score <= 0) return null

  const confidence = Math.min(0.98, 0.45 + best.score * 0.08)

  return {
    envelope: best.envelope,
    confidence,
    needs_review: confidence < HIGH_CONFIDENCE_THRESHOLD,
  }
}
