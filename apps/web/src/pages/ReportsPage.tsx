import { useEffect, useMemo, useState } from 'react'
import { BarChart, Bar, CartesianGrid, Cell, LineChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useWalletStore } from '@store/wallet.store'
import { buildMonthlyReport, requireAuthUid } from '@lib/firestore'

const CATEGORY_LABEL: Record<string, string> = {
  food: 'Makan & Minum',
  transport: 'Transportasi',
  shopping: 'Belanja',
  health: 'Kesehatan',
  entertainment: 'Hiburan',
  education: 'Pendidikan',
  housing: 'Rumah',
  salary: 'Gaji',
  freelance: 'Freelance',
  investment: 'Investasi',
  other: 'Lainnya',
}

const CATEGORY_COLORS = ['#2563EB', '#0EA5E9', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6']

interface SummaryResponse {
  period: {
    year: number
    month: number
    start: string
    end: string
  }
  total_income: number
  total_expense: number
  net: number
  transaction_count: number
  expense_by_category: Array<{
    category: string
    amount: number
    percentage: number
  }>
}

interface TrendPoint {
  year: number
  month: number
  income: number
  expense: number
  net: number
}

interface CategoryDetailResponse {
  category: string
  period: {
    year: number
    month: number
  }
  total: number
  transaction_count: number
  transactions: Array<{
    id: string
    type: 'income' | 'expense'
    amount: number
    merchant?: string | null
    note?: string | null
    date: string
    category: string
  }>
}

export default function ReportsPage() {
  const { wallets, fetchWallets } = useWalletStore()
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [walletFilter, setWalletFilter] = useState('')
  const [summary, setSummary] = useState<SummaryResponse | null>(null)
  const [trends, setTrends] = useState<TrendPoint[]>([])
  const [monthlyTransactions, setMonthlyTransactions] = useState<CategoryDetailResponse['transactions']>([])
  const [categoryDetail, setCategoryDetail] = useState<CategoryDetailResponse | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [year, month] = selectedMonth.split('-').map(Number)

  useEffect(() => {
    fetchWallets()
  }, [])

  useEffect(() => {
    void loadReports()
  }, [selectedMonth, walletFilter])

  useEffect(() => {
    if (summary?.expense_by_category?.[0]?.category) {
      setSelectedCategory((current) => current || summary.expense_by_category[0].category)
    } else {
      setSelectedCategory('')
    }
  }, [summary])

  useEffect(() => {
    if (!selectedCategory) {
      setCategoryDetail(null)
      return
    }

    const categoryTransactions = monthlyTransactions.filter((item) => item.category === selectedCategory)
    const total = categoryTransactions.reduce((sum, item) => sum + Number(item.amount), 0)

    setCategoryDetail({
      category: selectedCategory,
      period: { year, month },
      total,
      transaction_count: categoryTransactions.length,
      transactions: categoryTransactions,
    })
  }, [monthlyTransactions, month, selectedCategory, year])

  const loadReports = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const uid = requireAuthUid()
      const report = await buildMonthlyReport(uid, year, month, walletFilter || undefined)
      setSummary({
        period: report.period,
        total_income: report.total_income,
        total_expense: report.total_expense,
        net: report.net,
        transaction_count: report.transaction_count,
        expense_by_category: report.expense_by_category,
      })
      setTrends(report.trends || [])
      setMonthlyTransactions(
        report.transactions.map((item) => ({
          id: item.id,
          type: item.type,
          amount: item.amount,
          merchant: item.merchant || null,
          note: item.note || null,
          date: item.date,
          category: item.category,
        })),
      )
    } catch (err: any) {
      setError(err.message || 'Gagal memuat laporan.')
    } finally {
      setIsLoading(false)
    }
  }

  const savingsRate = useMemo(() => {
    if (!summary?.total_income) return 0
    return Math.round((summary.net / summary.total_income) * 100)
  }, [summary])

  const previousTrend = trends.length >= 2 ? trends[trends.length - 2] : null
  const currentTrend = trends.length ? trends[trends.length - 1] : null
  const expenseDelta = previousTrend && currentTrend ? currentTrend.expense - previousTrend.expense : 0

  const trendChartData = trends.map((item) => ({
    label: monthLabel(item.year, item.month, true),
    income: item.income,
    expense: item.expense,
    net: item.net,
  }))

  const categoryChartData = (summary?.expense_by_category || []).map((item, index) => ({
    ...item,
    label: CATEGORY_LABEL[item.category] || item.category,
    fill: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
  }))

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
            Laporan & Grafik
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', maxWidth: '720px' }}>
            Halaman ini menghitung laporan langsung dari data Firestore: ringkasan bulanan, tren 6 bulan, breakdown kategori, dan detail transaksi.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <input
            className="form-input"
            type="month"
            value={selectedMonth}
            onChange={(event) => setSelectedMonth(event.target.value)}
            style={{ minWidth: '180px' }}
          />
          <select
            className="form-input"
            value={walletFilter}
            onChange={(event) => setWalletFilter(event.target.value)}
            style={{ minWidth: '180px' }}
          >
            <option value="">Semua wallet</option>
            {wallets.map((wallet) => (
              <option key={wallet.id} value={wallet.id}>
                {wallet.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error ? <StatusBox tone="danger" message={error} /> : null}

      {isLoading || !summary ? (
        <EmptyBox message="Memuat data laporan..." />
      ) : (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '12px',
            }}
          >
            <ReportStatCard label="Pemasukan" value={formatRupiah(summary.total_income)} tone="success" />
            <ReportStatCard label="Pengeluaran" value={formatRupiah(summary.total_expense)} tone="danger" />
            <ReportStatCard label="Arus bersih" value={formatRupiah(summary.net)} tone={summary.net >= 0 ? 'success' : 'danger'} />
            <ReportStatCard label="Transaksi" value={String(summary.transaction_count)} tone="primary" />
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1.2fr) minmax(280px, 0.9fr)',
              gap: '16px',
            }}
          >
            <section className="card" style={{ padding: '18px' }}>
              <div style={{ marginBottom: '14px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                  Tren 6 Bulan
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Bandingkan pemasukan dan pengeluaran per bulan untuk melihat pola arus kas.
                </p>
              </div>

              {trendChartData.length === 0 ? (
                <EmptyCardMessage message="Belum ada data tren untuk ditampilkan." />
              ) : (
                <div style={{ width: '100%', height: '300px' }}>
                  <ResponsiveContainer>
                    <LineChart data={trendChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,120,220,0.15)" />
                      <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#64748B' }} />
                      <YAxis tickFormatter={shortCurrency} tick={{ fontSize: 12, fill: '#64748B' }} />
                      <Tooltip formatter={(value: number) => formatRupiah(Number(value))} />
                      <Line type="monotone" dataKey="income" stroke="#10B981" strokeWidth={3} dot={{ r: 4 }} />
                      <Line type="monotone" dataKey="expense" stroke="#EF4444" strokeWidth={3} dot={{ r: 4 }} />
                      <Line type="monotone" dataKey="net" stroke="#2563EB" strokeWidth={2} strokeDasharray="6 4" dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </section>

            <section className="card" style={{ padding: '18px' }}>
              <div style={{ marginBottom: '14px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                  Insight Bulan Ini
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Ringkasan cepat sesuai target laporan bulanan di PRD.
                </p>
              </div>

              <InsightCard
                title="Tingkat tabungan"
                description={`${savingsRate}% dari pemasukan bulan ini tersisa sebagai arus bersih.`}
              />
              <InsightCard
                title="Perbandingan bulan lalu"
                description={
                  previousTrend && currentTrend
                    ? `Pengeluaran ${expenseDelta >= 0 ? 'naik' : 'turun'} ${formatRupiah(Math.abs(expenseDelta))} dibanding ${monthLabel(previousTrend.year, previousTrend.month)}.`
                    : 'Belum cukup data untuk membandingkan dengan bulan sebelumnya.'
                }
              />
              <InsightCard
                title="Kategori teratas"
                description={
                  summary.expense_by_category[0]
                    ? `${CATEGORY_LABEL[summary.expense_by_category[0].category] || summary.expense_by_category[0].category} menyumbang ${summary.expense_by_category[0].percentage}% dari total pengeluaran.`
                    : 'Belum ada kategori pengeluaran pada periode ini.'
                }
              />
            </section>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1.1fr) minmax(320px, 0.9fr)',
              gap: '16px',
            }}
          >
            <section className="card" style={{ padding: '18px' }}>
              <div style={{ marginBottom: '14px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                  Breakdown Pengeluaran per Kategori
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Klik kategori di panel kanan untuk melihat transaksi detailnya.
                </p>
              </div>

              {categoryChartData.length === 0 ? (
                <EmptyCardMessage message="Belum ada pengeluaran di bulan yang dipilih." />
              ) : (
                <>
                  <div style={{ width: '100%', height: '300px', marginBottom: '12px' }}>
                    <ResponsiveContainer>
                      <BarChart data={categoryChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,120,220,0.15)" />
                        <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#64748B' }} />
                        <YAxis tickFormatter={shortCurrency} tick={{ fontSize: 12, fill: '#64748B' }} />
                        <Tooltip formatter={(value: number) => formatRupiah(Number(value))} />
                        <Bar dataKey="amount" radius={[8, 8, 0, 0]}>
                          {categoryChartData.map((entry, index) => (
                            <Cell key={entry.category} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div style={{ display: 'grid', gap: '10px' }}>
                    {categoryChartData.map((item, index) => (
                      <button
                        key={item.category}
                        type="button"
                        className="card"
                        onClick={() => setSelectedCategory(item.category)}
                        style={{
                          padding: '12px 14px',
                          textAlign: 'left',
                          cursor: 'pointer',
                          background: selectedCategory === item.category ? 'var(--accent-light)' : 'var(--bg-card2)',
                          border: selectedCategory === item.category ? '1px solid var(--accent)' : '1px solid var(--border)',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span
                              style={{
                                width: '10px',
                                height: '10px',
                                borderRadius: '50%',
                                background: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
                                display: 'inline-block',
                              }}
                            />
                            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                              {item.label}
                            </span>
                          </div>
                          <span className="badge badge-info">{item.percentage}%</span>
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '6px' }}>
                          {formatRupiah(item.amount)}
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </section>

            <section className="card" style={{ padding: '18px' }}>
              <div style={{ marginBottom: '14px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                  Detail Kategori
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Detail transaksi untuk kategori yang sedang dipilih.
                </p>
              </div>

              {detailLoading ? (
                <EmptyCardMessage message="Memuat detail kategori..." />
              ) : !categoryDetail ? (
                <EmptyCardMessage message="Pilih kategori untuk melihat transaksi detail." />
              ) : (
                <>
                  <div
                    style={{
                      border: '1px solid var(--border)',
                      borderRadius: '14px',
                      padding: '14px',
                      background: 'var(--bg-card2)',
                      marginBottom: '12px',
                    }}
                  >
                    <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                      {CATEGORY_LABEL[categoryDetail.category] || categoryDetail.category}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                      {categoryDetail.transaction_count} transaksi di {monthLabel(year, month)}
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {formatRupiah(categoryDetail.total)}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gap: '10px', maxHeight: '420px', overflowY: 'auto' }}>
                    {categoryDetail.transactions.length === 0 ? (
                      <EmptyCardMessage message="Belum ada transaksi untuk kategori ini." />
                    ) : (
                      categoryDetail.transactions.map((transaction) => (
                        <div
                          key={transaction.id}
                          style={{
                            border: '1px solid var(--border)',
                            borderRadius: '12px',
                            padding: '12px 14px',
                            background: 'var(--bg-card)',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start' }}>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                                {transaction.merchant || transaction.note || 'Tanpa deskripsi'}
                              </div>
                              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                {formatDisplayDate(transaction.date)}
                              </div>
                            </div>
                            <div
                              style={{
                                fontSize: '13px',
                                fontWeight: 700,
                                color: transaction.type === 'income' ? 'var(--green)' : 'var(--red)',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {transaction.type === 'income' ? '+' : '-'}
                              {formatRupiah(Number(transaction.amount))}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  )
}

function ReportStatCard({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone: 'primary' | 'success' | 'danger'
}) {
  const toneMap = {
    primary: 'var(--accent)',
    success: 'var(--green)',
    danger: 'var(--red)',
  }

  return (
    <div className="card" style={{ padding: '16px' }}>
      <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>{label}</p>
      <p style={{ fontSize: '20px', fontWeight: 700, color: toneMap[tone] }}>{value}</p>
    </div>
  )
}

function InsightCard({ title, description }: { title: string; description: string }) {
  return (
    <div
      style={{
        border: '1px solid var(--border)',
        borderRadius: '14px',
        padding: '14px',
        background: 'linear-gradient(180deg, var(--bg-card), var(--bg-card2))',
        marginBottom: '10px',
      }}
    >
      <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
        {title}
      </h4>
      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.7 }}>{description}</p>
    </div>
  )
}

function EmptyCardMessage({ message }: { message: string }) {
  return (
    <div
      style={{
        padding: '24px 16px',
        textAlign: 'center',
        border: '1px dashed var(--border-strong)',
        borderRadius: '12px',
        color: 'var(--text-muted)',
        fontSize: '13px',
      }}
    >
      {message}
    </div>
  )
}

function EmptyBox({ message }: { message: string }) {
  return (
    <div
      style={{
        border: '1px dashed var(--border-strong)',
        borderRadius: '14px',
        padding: '28px 18px',
        textAlign: 'center',
        color: 'var(--text-muted)',
        fontSize: '13px',
        lineHeight: 1.7,
      }}
    >
      {message}
    </div>
  )
}

function StatusBox({ tone, message }: { tone: 'danger'; message: string }) {
  return (
    <div
      style={{
        color: 'var(--red)',
        background: 'rgba(239,68,68,0.08)',
        border: '1px solid rgba(239,68,68,0.16)',
        borderRadius: '12px',
        padding: '10px 12px',
        fontSize: '12px',
        lineHeight: 1.7,
      }}
    >
      {message}
    </div>
  )
}

function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount)
}

function shortCurrency(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `${Math.round(value / 100_000) / 10}jt`
  if (Math.abs(value) >= 1_000) return `${Math.round(value / 1_000)}rb`
  return `${value}`
}

function monthLabel(year: number, month: number, short = false): string {
  return new Date(year, month - 1, 1).toLocaleDateString('id-ID', {
    month: short ? 'short' : 'long',
    year: short ? undefined : 'numeric',
  })
}

function formatDisplayDate(value: string): string {
  return new Date(value).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}
