import {
  buildEnvelopeProgress,
  getEnvelopeStatus,
  getHomeEnvelopeAlerts,
  createEnvelopeAllocation,
  listBudgetEnvelopes,
  listEnvelopeAllocations,
  matchEnvelopeForTransaction,
  type BudgetEnvelope,
  type EnvelopeAllocation,
  type EnvelopeTransactionCandidate,
} from './budget-envelopes'

const envelope = (overrides: Partial<BudgetEnvelope> = {}): BudgetEnvelope => ({
  id: 'env-1',
  user_id: 'user-1',
  name: 'Kopi',
  parent_category_id: 'cat-food',
  parent_category_name: 'Makan & Minum',
  limit_amount: 250_000,
  start_date: '2026-05-10',
  end_date: '2026-05-25',
  icon: 'coffee',
  color: '#4A80F0',
  notes: 'Starbucks, Kopi Kenangan, Fore, kopi kampus',
  status: 'active',
  created_at: '2026-05-01T00:00:00Z',
  updated_at: '2026-05-01T00:00:00Z',
  ...overrides,
})

const allocation = (overrides: Partial<EnvelopeAllocation> = {}): EnvelopeAllocation => ({
  id: 'alloc-1',
  transaction_id: 'tx-1',
  envelope_id: 'env-1',
  amount: 100_000,
  confidence: 0.92,
  needs_review: false,
  transaction_date: '2026-05-15',
  transaction_description: 'Kopi Kenangan',
  created_at: '2026-05-15T00:00:00Z',
  updated_at: '2026-05-15T00:00:00Z',
  ...overrides,
})

describe('budget envelope helpers', () => {
  it('marks active envelopes as archived after end_date', () => {
    expect(getEnvelopeStatus(envelope(), '2026-05-25')).toBe('active')
    expect(getEnvelopeStatus(envelope(), '2026-05-26')).toBe('archived')
  })

  it('calculates progress only from allocations inside the envelope period', () => {
    const progress = buildEnvelopeProgress(envelope(), [
      allocation({ amount: 90_000, transaction_date: '2026-05-09' }),
      allocation({ amount: 100_000, transaction_date: '2026-05-12' }),
      allocation({ amount: 120_000, transaction_date: '2026-05-20' }),
      allocation({ amount: 80_000, transaction_date: '2026-05-26' }),
    ])

    expect(progress.spent_amount).toBe(220_000)
    expect(progress.remaining_amount).toBe(30_000)
    expect(progress.used_percentage).toBe(88)
    expect(progress.is_near_limit).toBe(true)
    expect(progress.is_over_budget).toBe(false)
  })

  it('calculates over-budget state without blocking transactions', () => {
    const progress = buildEnvelopeProgress(envelope(), [allocation({ amount: 258_000 })])

    expect(progress.remaining_amount).toBe(-8_000)
    expect(progress.is_over_budget).toBe(true)
    expect(progress.over_budget_amount).toBe(8_000)
  })

  it('selects only actionable Home alerts and excludes review-only noise', () => {
    const alerts = getHomeEnvelopeAlerts([
      { envelope: envelope({ id: 'safe', name: 'Ojol' }), progress: buildEnvelopeProgress(envelope({ id: 'safe' }), [allocation({ envelope_id: 'safe', amount: 50_000 })]), reviewCount: 2 },
      { envelope: envelope({ id: 'near', name: 'Kopi' }), progress: buildEnvelopeProgress(envelope({ id: 'near' }), [allocation({ envelope_id: 'near', amount: 220_000 })]), reviewCount: 0 },
      { envelope: envelope({ id: 'over', name: 'Nongkrong' }), progress: buildEnvelopeProgress(envelope({ id: 'over' }), [allocation({ envelope_id: 'over', amount: 280_000 })]), reviewCount: 1 },
    ])

    expect(alerts.map((item) => item.envelope.name)).toEqual(['Nongkrong', 'Kopi'])
  })

  it('matches transaction to envelope using category and notes with confidence', () => {
    const tx: EnvelopeTransactionCandidate = {
      description: 'Kopi Kenangan kampus',
      merchant: 'Kopi Kenangan',
      categoryName: 'Makan & Minum',
      amount: 25_000,
    }

    const match = matchEnvelopeForTransaction(tx, [envelope()])

    expect(match?.envelope.id).toBe('env-1')
    expect(match?.confidence).toBeGreaterThanOrEqual(0.85)
    expect(match?.needs_review).toBe(false)
  })

  it('keeps low-confidence guesses reviewable', () => {
    const tx: EnvelopeTransactionCandidate = {
      description: 'Cafe dekat kampus',
      merchant: 'Cafe',
      categoryName: 'Makan & Minum',
      amount: 48_000,
    }

    const match = matchEnvelopeForTransaction(tx, [envelope()])

    expect(match?.envelope.id).toBe('env-1')
    expect(match?.confidence).toBeLessThan(0.85)
    expect(match?.needs_review).toBe(true)
  })
})

describe('budget envelope service query builders', () => {
  it('lists envelopes with parent category and allocations', async () => {
    const calls: string[] = []
    const chain = {
      select: jest.fn((value: string) => { calls.push(`select:${value}`); return chain }),
      eq: jest.fn((key: string, value: string) => { calls.push(`eq:${key}:${value}`); return chain }),
      order: jest.fn((key: string) => { calls.push(`order:${key}`); return Promise.resolve({ data: [], error: null }) }),
    }
    const supabase = { from: jest.fn(() => chain) }

    await listBudgetEnvelopes(supabase as never, 'user-1')

    expect(supabase.from).toHaveBeenCalledWith('budget_envelopes')
    expect(calls.some((call) => call.startsWith('select:'))).toBe(true)
    expect(calls).toContain('eq:user_id:user-1')
    expect(calls).toContain('order:end_date')
  })

  it('returns no allocations without querying when envelope id list is empty', async () => {
    const supabase = { from: jest.fn() }

    await expect(listEnvelopeAllocations(supabase as never, [])).resolves.toEqual([])

    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('maps allocation transaction fields from existing tanggal and catatan columns', async () => {
    const calls: string[] = []
    const chain = {
      select: jest.fn((value: string) => { calls.push(`select:${value}`); return chain }),
      in: jest.fn((key: string, values: string[]) => {
        calls.push(`in:${key}:${values.join(',')}`)
        return Promise.resolve({
          data: [
            {
              id: 'alloc-1',
              transaction_id: 'tx-1',
              envelope_id: 'env-1',
              amount: '25000',
              confidence: '0.920',
              needs_review: false,
              created_at: '2026-05-15T00:00:00Z',
              updated_at: '2026-05-15T00:00:00Z',
              transaction: {
                tanggal: '2026-05-15',
                catatan: 'Kopi Kenangan kampus',
                merchant: 'Kopi Kenangan',
              },
            },
          ],
          error: null,
        })
      }),
    }
    const supabase = { from: jest.fn(() => chain) }

    const result = await listEnvelopeAllocations(supabase as never, ['env-1'])

    expect(supabase.from).toHaveBeenCalledWith('transaction_envelope_allocations')
    expect(calls).toContain('select:*, transaction:transactions(id,tanggal,catatan,merchant)')
    expect(calls).toContain('in:envelope_id:env-1')
    expect(result).toEqual([
      {
        id: 'alloc-1',
        transaction_id: 'tx-1',
        envelope_id: 'env-1',
        amount: 25000,
        confidence: 0.92,
        needs_review: false,
        transaction_date: '2026-05-15',
        transaction_description: 'Kopi Kenangan kampus',
        created_at: '2026-05-15T00:00:00Z',
        updated_at: '2026-05-15T00:00:00Z',
      },
    ])
  })

  it('falls back to merchant when allocation transaction catatan is empty', async () => {
    const chain = {
      select: jest.fn(() => chain),
      in: jest.fn(() => Promise.resolve({
        data: [
          {
            id: 'alloc-2',
            transaction_id: 'tx-2',
            envelope_id: 'env-1',
            amount: 48000,
            confidence: null,
            needs_review: true,
            created_at: '2026-05-16T00:00:00Z',
            updated_at: '2026-05-16T00:00:00Z',
            transaction: { tanggal: '2026-05-16', catatan: null, merchant: 'Fore Coffee' },
          },
        ],
        error: null,
      })),
    }
    const supabase = { from: jest.fn(() => chain) }

    const result = await listEnvelopeAllocations(supabase as never, ['env-1'])

    expect(result[0].transaction_date).toBe('2026-05-16')
    expect(result[0].transaction_description).toBe('Fore Coffee')
  })

  it('creates an envelope allocation for a suggested envelope', async () => {
    const calls: string[] = []
    const chain = {
      insert: jest.fn((value) => { calls.push(`insert:${JSON.stringify(value)}`); return chain }),
      select: jest.fn((value: string) => { calls.push(`select:${value}`); return chain }),
      single: jest.fn(() => Promise.resolve({
        data: {
          id: 'alloc-3',
          transaction_id: 'tx-3',
          envelope_id: 'env-1',
          amount: '25000',
          confidence: '0.910',
          needs_review: false,
          created_at: '2026-05-17T00:00:00Z',
          updated_at: '2026-05-17T00:00:00Z',
          transaction: { tanggal: '2026-05-17', catatan: 'Kopi Kenangan', merchant: 'Kopi Kenangan' },
        },
        error: null,
      })),
    }
    const supabase = { from: jest.fn(() => chain) }

    const result = await createEnvelopeAllocation(supabase as never, {
      transaction_id: 'tx-3',
      envelope_id: 'env-1',
      amount: 25000,
      confidence: 0.91,
      needs_review: false,
    })

    expect(supabase.from).toHaveBeenCalledWith('transaction_envelope_allocations')
    expect(calls[0]).toContain('"transaction_id":"tx-3"')
    expect(calls[0]).toContain('"envelope_id":"env-1"')
    expect(calls[0]).toContain('"amount":25000')
    expect(calls).toContain('select:*, transaction:transactions(id,tanggal,catatan,merchant)')
    expect(result.envelope_id).toBe('env-1')
    expect(result.amount).toBe(25000)
  })
})
