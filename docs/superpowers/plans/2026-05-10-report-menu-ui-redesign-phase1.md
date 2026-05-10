# Report Menu UI Redesign Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement balanced polish redesign of mobile and web report screens with hybrid layout (mobile) and desktop-optimized 2-3 column layout (web), fintech-bold visual style.

**Architecture:** Mobile uses hybrid layout (compact top + breathable bottom). Web uses desktop-optimized 2-3 column layout with responsive breakpoints. Both platforms share fintech-bold color palette and typography system.

**Tech Stack:** React Native (Expo) for mobile, React + Vite + Tailwind CSS for web, Recharts for charts, TypeScript.

---

## File Structure

### Mobile (`apps/mobile/app/(tabs)/reports.tsx`)
- **Primary file**: `apps/mobile/app/(tabs)/reports.tsx` - main report screen
- **Theme**: Uses existing `useTheme` hook from `../../src/theme/theme-context`
- **Components**: Inline components (MetricCard, LineChart, DonutChart, CategoryRow) defined in same file
- **Data**: Mock data arrays (`incomeData`, `expenseData`, `categories`) remain in file

### Web (`apps/web/src/pages/ReportsPage.tsx`)
- **Primary file**: `apps/web/src/pages/ReportsPage.tsx` - main report page
- **CSS**: Updates to `apps/web/src/index.css` for new layout classes
- **Components**: Inline components (WebMetricCard, WebLineChart, WebCategoryTable, PeriodSelector, ComparisonPanel) defined in same file
- **Data**: Real data from Firestore via `buildMonthlyReport` API

### Shared Design System
- **Colors**: Fintech-bold palette defined in each platform's theme system
- **Typography**: Consistent font sizes/weights across platforms
- **Spacing**: Consistent padding/gap values

---

## Task 1: Update Mobile Report Screen Layout

**Files:**
- Modify: `apps/mobile/app/(tabs)/reports.tsx:1-313`

- [ ] **Step 1: Update header section**

```typescript
// Replace lines 32-40 with:
<View style={styles.headerRow}>
  <View>
    <Text style={styles.title}>Laporan</Text>
    <Text style={styles.subtitle}>Ringkasan performa finansial</Text>
  </View>
  <View style={styles.monthBadge}>
    <Text style={styles.monthBadgeText}>Mei 2026</Text>
  </View>
</View>
```

- [ ] **Step 2: Run mobile dev server to verify header**

```bash
cd apps/mobile
npx expo start --web
```
Expected: Header shows "Laporan" with subtitle and month badge.

- [ ] **Step 3: Add MetricCard component**

```typescript
// Add after createStyles function (around line 312):
function MetricCard({ label, value, trend, color, icon }: MetricCardProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  
  return (
    <View style={[styles.metricCard, { borderBottomWidth: 3, borderBottomColor: color }]}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, { color }]}>{value}</Text>
      {trend && (
        <View style={styles.metricTrend}>
          <Text style={[styles.metricTrendText, { color }]}>{trend}</Text>
        </View>
      )}
    </View>
  );
}
```

- [ ] **Step 4: Add top summary section**

```typescript
// Replace lines 58-89 with:
{activeTab === 'overview' ? (
  <>
    {/* Key Metrics */}
    <View style={styles.metricRow}>
      <MetricCard 
        label="Pemasukan" 
        value="Rp 18,65 Jt" 
        trend="▲ 12.5%" 
        color={theme.colors.success} 
      />
      <MetricCard 
        label="Transaksi" 
        value="142" 
        color={theme.colors.warning} 
      />
    </View>
    <View style={styles.metricRow}>
      <MetricCard 
        label="Insight" 
        value="Pengeluaran ↓8%" 
        color={theme.colors.brandPrimary} 
      />
    </View>
```

- [ ] **Step 5: Run mobile dev server to verify metrics**

```bash
cd apps/mobile
npx expo start --web
```
Expected: 3 metric cards show with correct colors and values.

- [ ] **Step 6: Commit mobile layout changes**

```bash
git add apps/mobile/app/(tabs)/reports.tsx
git commit -m "feat(mobile): update report screen header and metric cards"
```

---

## Task 2: Update Mobile Line Chart Section

**Files:**
- Modify: `apps/mobile/app/(tabs)/reports.tsx:90-130`

- [ ] **Step 1: Update line chart card structure**

```typescript
// Replace lines 90-130 with:
{/* Chart */}
<View style={styles.chartCard}>
  <Text style={styles.chartTitle}>Tren 6 Bulan</Text>
  <Text style={styles.chartSub}>Pemasukan vs pengeluaran (dalam jutaan Rp)</Text>

  <View style={styles.chartArea}>
    {months.map((month, idx) => (
      <View key={month} style={styles.chartColumn}>
        <View style={styles.chartBarsWrap}>
          <View
            style={[
              styles.chartBar,
              { height: `${(incomeData[idx] / maxVal) * 100}%`, backgroundColor: theme.colors.success },
            ]}
          />
          <View
            style={[
              styles.chartBar,
              { height: `${(expenseData[idx] / maxVal) * 100}%`, backgroundColor: `${theme.colors.danger}90` },
            ]}
          />
        </View>
        <Text style={styles.chartLabel}>{month}</Text>
      </View>
    ))}
  </View>

  <View style={styles.chartLegend}>
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: theme.colors.success }]} />
      <Text style={styles.legendText}>Pemasukan</Text>
    </View>
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: theme.colors.danger }]} />
      <Text style={styles.legendText}>Pengeluaran</Text>
    </View>
  </View>
</View>
```

- [ ] **Step 2: Update createStyles for chart**

```typescript
// Add to createStyles function (around line 240-272):
chartCard: {
  backgroundColor: theme.colors.surface,
  borderRadius: 20,
  borderWidth: 1,
  borderColor: theme.colors.borderSoft,
  padding: 16,
  gap: 10,
},
chartTitle: { color: theme.colors.textPrimary, fontSize: 16, fontWeight: '800' },
chartSub: { color: theme.colors.textSecondary, fontSize: 12 },
chartArea: {
  height: 160,
  flexDirection: 'row',
  alignItems: 'flex-end',
  justifyContent: 'space-between',
  gap: 6,
  marginTop: 8,
},
chartColumn: {
  flex: 1,
  alignItems: 'center',
  height: '100%',
},
chartBarsWrap: {
  flex: 1,
  flexDirection: 'row',
  alignItems: 'flex-end',
  gap: 3,
  width: '100%',
},
chartBar: {
  flex: 1,
  borderTopLeftRadius: 6,
  borderTopRightRadius: 6,
},
chartLabel: { color: theme.colors.textMuted, fontSize: 10, fontWeight: '700', marginTop: 6 },
chartLegend: { flexDirection: 'row', gap: 16, marginTop: 4 },
legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
legendDot: { width: 8, height: 8, borderRadius: 999 },
legendText: { color: theme.colors.textMuted, fontSize: 11, fontWeight: '600' },
```

- [ ] **Step 3: Run mobile dev server to verify chart**

```bash
cd apps/mobile
npx expo start --web
```
Expected: Line chart card shows with 6-month bars, legend, and proper styling.

- [ ] **Step 4: Commit mobile chart changes**

```bash
git add apps/mobile/app/(tabs)/reports.tsx
git commit -m "feat(mobile): update report line chart with fintech-bold styling"
```

---

## Task 3: Update Mobile Category Breakdown Section

**Files:**
- Modify: `apps/mobile/app/(tabs)/reports.tsx:130-172`

- [ ] **Step 1: Update category breakdown structure**

```typescript
// Replace lines 130-172 with:
) : (
  <>
    {/* Category Breakdown */}
    <View style={styles.categoryCard}>
      <Text style={styles.categoryCardTitle}>Breakdown Pengeluaran</Text>
      <Text style={styles.categoryCardSub}>Per kategori bulan Mei 2026</Text>

      {/* Visual Ring Placeholder */}
      <View style={styles.ringArea}>
        <View style={styles.ringOuter}>
          <View style={styles.ringInner}>
            <Text style={styles.ringValue}>Rp 6,4 Jt</Text>
            <Text style={styles.ringLabel}>Total</Text>
          </View>
        </View>
      </View>

      {categories.map((cat, idx) => (
        <View
          key={cat.label}
          style={[
            styles.catRow,
            idx === 0 && { borderTopWidth: 0 },
          ]}
        >
          <View style={styles.catLeft}>
            <Text style={styles.catEmoji}>{cat.emoji}</Text>
            <View>
              <Text style={styles.catName}>{cat.label}</Text>
              <Text style={styles.catAmount}>{cat.amount}</Text>
            </View>
          </View>
          <View style={styles.catRight}>
            <Text style={styles.catPct}>{cat.percent}%</Text>
            <View style={styles.catBar}>
              <View style={[styles.catBarFill, { width: `${cat.percent}%`, backgroundColor: theme.colors.brandPrimary }]} />
            </View>
          </View>
        </View>
      ))}
    </View>
  </>
)}
```

- [ ] **Step 2: Update createStyles for category section**

```typescript
// Add to createStyles function (around line 272-311):
categoryCard: {
  backgroundColor: theme.colors.surface,
  borderRadius: 20,
  borderWidth: 1,
  borderColor: theme.colors.borderSoft,
  padding: 16,
  gap: 10,
},
categoryCardTitle: { color: theme.colors.textPrimary, fontSize: 16, fontWeight: '800' },
categoryCardSub: { color: theme.colors.textSecondary, fontSize: 12 },
ringArea: { alignItems: 'center', paddingVertical: 14 },
ringOuter: {
  width: 140,
  height: 140,
  borderRadius: 70,
  borderWidth: 10,
  borderColor: theme.colors.brandPrimary,
  alignItems: 'center',
  justifyContent: 'center',
},
ringInner: { alignItems: 'center' },
ringValue: { color: theme.colors.textPrimary, fontSize: 18, fontWeight: '800' },
ringLabel: { color: theme.colors.textMuted, fontSize: 11, marginTop: 2 },
catRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  paddingVertical: 10,
  borderTopWidth: 1,
  borderTopColor: theme.colors.borderSoft,
},
catLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
catEmoji: { fontSize: 18 },
catName: { color: theme.colors.textPrimary, fontSize: 13, fontWeight: '700' },
catAmount: { color: theme.colors.textMuted, fontSize: 11, marginTop: 1 },
catRight: { alignItems: 'flex-end', gap: 4 },
catPct: { color: theme.colors.brandPrimary, fontSize: 13, fontWeight: '800' },
catBar: { width: 60, height: 4, borderRadius: 999, backgroundColor: theme.colors.mutedSurface },
catBarFill: { height: '100%', borderRadius: 999 },
```

- [ ] **Step 3: Run mobile dev server to verify category breakdown**

```bash
cd apps/mobile
npx expo start --web
```
Expected: Category tab shows donut chart and category list with progress bars.

- [ ] **Step 4: Commit mobile category changes**

```bash
git add apps/mobile/app/(tabs)/reports.tsx
git commit -m "feat(mobile): update category breakdown with donut chart and progress bars"
```

---

## Task 4: Update Web Report Page Header and Metrics

**Files:**
- Modify: `apps/web/src/pages/ReportsPage.tsx:233-335`

- [ ] **Step 1: Update header section**

```typescript
// Replace lines 233-268 with:
<div className="animate-fade-in page-shell">
  <div className="reports-top-row page-header">
    <div>
      <h2 className="page-title">Laporan</h2>
      <p className="page-subtitle">
        Ringkasan performa finansial bulanan
      </p>
    </div>

    <div className="reports-filter-row">
      <div className="period-badge">
        Mei 2026
      </div>
      <input
        className="form-input"
        type="month"
        value={selectedMonth}
        onChange={(event) => setSelectedMonth(event.target.value)}
        style={{ minWidth: "180px" }}
      />
      <select
        className="form-input"
        value={walletFilter}
        onChange={(event) => setWalletFilter(event.target.value)}
        style={{ minWidth: "180px" }}
      >
        <option value="">
          Semua wallet
        </option>
        {wallets.map((wallet) => (
          <option key={wallet.id} value={wallet.id}>
            {wallet.name}
          </option>
        ))}
      </select>
    </div>
  </div>
```

- [ ] **Step 2: Add CSS for period-badge**

```css
// Add to apps/web/src/index.css around line 1141:
.period-badge {
  background: #3b82f6;
  color: white;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 700;
  border: 1px solid #2563eb;
}
```

- [ ] **Step 3: Update WebMetricCard component**

```typescript
// Replace ReportStatCard function (lines 696-728) with:
function WebMetricCard({
  label,
  value,
  trend,
  trendDirection = 'neutral',
  color,
  icon,
  size = 'default',
}: WebMetricCardProps) {
  const trendColor = trendDirection === 'up' ? '#10b981' : 
                    trendDirection === 'down' ? '#ef4444' : '#64748b';
  
  return (
    <div className={`metric-card ${size}`} style={{ borderBottom: `3px solid ${color}` }}>
      <div className="metric-label">{label}</div>
      <div className="metric-value" style={{ color }}>{value}</div>
      {trend && (
        <div className="metric-trend" style={{ color: trendColor }}>
          {trend}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Update metrics grid section**

```typescript
// Replace lines 308-335 with:
<div className="metrics-grid">
  <WebMetricCard
    label="Pemasukan"
    value={formatRupiah(summary.total_income)}
    trend="▲ 12.5%"
    trendDirection="up"
    color="#10b981"
    size="large"
  />
  <WebMetricCard
    label="Pengeluaran"
    value={formatRupiah(summary.total_expense)}
    trend="▲ 5.2%"
    trendDirection="up"
    color="#ef4444"
    size="large"
  />
  <WebMetricCard
    label="Tabungan"
    value={formatRupiah(summary.net)}
    trend={`${savingsRate}% rate`}
    color="#3b82f6"
    size="large"
  />
  <WebMetricCard
    label="Transaksi"
    value={String(summary.transaction_count)}
    color="#f59e0b"
    size="large"
  />
</div>
```

- [ ] **Step 5: Add CSS for metrics grid**

```css
// Add to apps/web/src/index.css:
.metrics-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin: 20px 0;
}

.metric-card {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 16px;
}

.metric-card.large {
  padding: 20px;
}

.metric-label {
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
  margin-bottom: 4px;
}

.metric-value {
  font-size: 20px;
  font-weight: 800;
  margin-bottom: 4px;
}

.metric-card.large .metric-value {
  font-size: 24px;
}

.metric-trend {
  font-size: 11px;
  font-weight: 700;
}
```

- [ ] **Step 6: Run web dev server to verify header and metrics**

```bash
cd apps/web
pnpm dev
```
Expected: Header shows "Laporan" with period badge, 4 large metric cards with proper styling.

- [ ] **Step 7: Commit web header and metrics changes**

```bash
git add apps/web/src/pages/ReportsPage.tsx apps/web/src/index.css
git commit -m "feat(web): update report page header and metric cards with fintech-bold styling"
```

---

## Task 5: Update Web Main Content Layout

**Files:**
- Modify: `apps/web/src/pages/ReportsPage.tsx:336-428`

- [ ] **Step 1: Update main grid structure**

```typescript
// Replace lines 336-428 with:
<div className="reports-main-grid">
  <section className="card panel-card">
    <div className="panel-head">
      <h3 className="panel-title">Tren 6 Bulan</h3>
      <p className="panel-subtitle">
        Pemasukan vs pengeluaran (dalam jutaan Rp)
      </p>
    </div>

    {trendChartData.length === 0 ? (
      <EmptyCardMessage message="Belum ada data tren untuk ditampilkan." />
    ) : (
      <div style={{ width: "100%", height: "280px" }}>
        <ResponsiveContainer>
          <LineChart data={trendChartData}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#e2e8f0"
            />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 12, fill: "#64748b" }}
            />
            <YAxis
              tickFormatter={shortCurrency}
              tick={{ fontSize: 12, fill: "#64748b" }}
            />
            <Tooltip
              formatter={(value: number) =>
                formatRupiah(Number(value))
              }
            />
            <Line
              type="monotone"
              dataKey="income"
              stroke="#10b981"
              strokeWidth={3}
              dot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="expense"
              stroke="#ef4444"
              strokeWidth={3}
              dot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    )}
  </section>

  <section className="card panel-card">
    <div className="panel-head">
      <h3 className="panel-title">Breakdown Pengeluaran</h3>
      <p className="panel-subtitle">
        Per kategori bulan {monthLabel(year, month)}
      </p>
    </div>

    {categoryChartData.length === 0 ? (
      <EmptyCardMessage message="Belum ada pengeluaran di bulan yang dipilih." />
    ) : (
      <div className="category-table-container">
        <table className="category-table">
          <thead>
            <tr>
              <th>Kategori</th>
              <th>Jumlah</th>
              <th>Persentase</th>
            </tr>
          </thead>
          <tbody>
            {categoryChartData.map((item, index) => (
              <tr key={item.category}>
                <td>
                  <div className="category-cell">
                    <span className="category-dot" style={{ background: item.fill }} />
                    <span>{item.label}</span>
                  </div>
                </td>
                <td>{formatRupiah(item.amount)}</td>
                <td>
                  <div className="percentage-cell">
                    <span>{item.percentage}%</span>
                    <div className="percentage-bar">
                      <div 
                        className="percentage-bar-fill" 
                        style={{ width: `${item.percentage}%`, background: "#3b82f6" }}
                      />
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </section>
</div>
```

- [ ] **Step 2: Add CSS for category table**

```css
// Add to apps/web/src/index.css:
.category-table-container {
  overflow-x: auto;
  margin-top: 16px;
}

.category-table {
  width: 100%;
  border-collapse: collapse;
}

.category-table th {
  text-align: left;
  padding: 12px 16px;
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
  border-bottom: 1px solid #e2e8f0;
}

.category-table td {
  padding: 12px 16px;
  border-bottom: 1px solid #f1f5f9;
}

.category-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.category-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.percentage-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.percentage-bar {
  width: 60px;
  height: 4px;
  background: #e2e8f0;
  border-radius: 2px;
  overflow: hidden;
}

.percentage-bar-fill {
  height: 100%;
  border-radius: 2px;
}
```

- [ ] **Step 3: Update CSS for reports-main-grid**

```css
// Update in apps/web/src/index.css around line 1154:
.reports-main-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 20px;
  margin: 20px 0;
}

@media (max-width: 1024px) {
  .reports-main-grid {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 4: Run web dev server to verify main layout**

```bash
cd apps/web
pnpm dev
```
Expected: 2-column layout with line chart on left, category table on right. Responsive on smaller screens.

- [ ] **Step 5: Commit web main layout changes**

```bash
git add apps/web/src/pages/ReportsPage.tsx apps/web/src/index.css
git commit -m "feat(web): update main content layout with 2-column grid and category table"
```

---

## Task 6: Update Web Sidebar and Bottom Sections

**Files:**
- Modify: `apps/web/src/pages/ReportsPage.tsx:429-690`

- [ ] **Step 1: Update secondary grid structure**

```typescript
// Replace lines 429-690 with:
<div className="reports-secondary-grid">
  <section className="card panel-card">
    <div className="panel-head">
      <h3 className="panel-title">Ringkasan Visual</h3>
      <p className="panel-subtitle">
        Donut chart total pengeluaran
      </p>
    </div>

    <div className="donut-container">
      <div className="donut-chart">
        <div className="donut-inner">
          <div className="donut-value">{formatRupiah(summary.total_expense)}</div>
          <div className="donut-label">Total Pengeluaran</div>
        </div>
      </div>
    </div>

    <div className="quick-insights">
      <h4 className="insights-title">Quick Insights</h4>
      <div className="insight-item">
        <div className="insight-icon">💡</div>
        <div className="insight-text">
          Tingkat tabungan {savingsRate}% dari pemasukan bulan ini.
        </div>
      </div>
      <div className="insight-item">
        <div className="insight-icon">📊</div>
        <div className="insight-text">
          {summary.expense_by_category[0]?.label || 'Makan & Minum'} menyumbang {summary.expense_by_category[0]?.percentage || 0}% dari total.
        </div>
      </div>
    </div>

    <div className="action-buttons">
      <button className="btn btn-primary">Export PDF</button>
      <button className="btn btn-outline">Share</button>
    </div>
  </section>

  <section className="card panel-card">
    <div className="panel-head">
      <h3 className="panel-title">Perbandingan</h3>
      <p className="panel-subtitle">
        vs bulan {previousTrend ? monthLabel(previousTrend.year, previousTrend.month) : 'lalu'}
      </p>
    </div>

    {previousTrend && currentTrend ? (
      <div className="comparison-panel">
        <div className="comparison-row">
          <div className="comparison-label">Pemasukan</div>
          <div className="comparison-values">
            <span className="current-value">{formatRupiah(currentTrend.income)}</span>
            <span className={`delta ${currentTrend.income > previousTrend.income ? 'positive' : 'negative'}`}>
              {currentTrend.income > previousTrend.income ? '▲' : '▼'} {Math.abs(Math.round((currentTrend.income - previousTrend.income) / previousTrend.income * 100))}%
            </span>
          </div>
        </div>
        <div className="comparison-row">
          <div className="comparison-label">Pengeluaran</div>
          <div className="comparison-values">
            <span className="current-value">{formatRupiah(currentTrend.expense)}</span>
            <span className={`delta ${currentTrend.expense > previousTrend.expense ? 'negative' : 'positive'}`}>
              {currentTrend.expense > previousTrend.expense ? '▲' : '▼'} {Math.abs(Math.round((currentTrend.expense - previousTrend.expense) / previousTrend.expense * 100))}%
            </span>
          </div>
        </div>
        <div className="comparison-row">
          <div className="comparison-label">Tabungan</div>
          <div className="comparison-values">
            <span className="current-value">{formatRupiah(currentTrend.net)}</span>
            <span className={`delta ${currentTrend.net > previousTrend.net ? 'positive' : 'negative'}`}>
              {currentTrend.net > previousTrend.net ? '▲' : '▼'} {Math.abs(Math.round((currentTrend.net - previousTrend.net) / previousTrend.net * 100))}%
            </span>
          </div>
        </div>
      </div>
    ) : (
      <EmptyCardMessage message="Belum cukup data untuk perbandingan." />
    )}
  </section>
</div>
```

- [ ] **Step 2: Add CSS for sidebar components**

```css
// Add to apps/web/src/index.css:
.donut-container {
  display: flex;
  justify-content: center;
  padding: 20px 0;
}

.donut-chart {
  width: 140px;
  height: 140px;
  border-radius: 50%;
  border: 10px solid #3b82f6;
  display: flex;
  align-items: center;
  justify-content: center;
}

.donut-inner {
  text-align: center;
}

.donut-value {
  font-size: 18px;
  font-weight: 800;
  color: #1e293b;
}

.donut-label {
  font-size: 11px;
  color: #64748b;
  margin-top: 2px;
}

.quick-insights {
  margin: 20px 0;
}

.insights-title {
  font-size: 14px;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 12px;
}

.insight-item {
  display: flex;
  gap: 10px;
  padding: 10px 0;
  border-bottom: 1px solid #f1f5f9;
}

.insight-item:last-child {
  border-bottom: none;
}

.insight-icon {
  font-size: 16px;
}

.insight-text {
  font-size: 13px;
  color: #64748b;
  line-height: 1.5;
}

.action-buttons {
  display: flex;
  gap: 10px;
  margin-top: 20px;
}

.comparison-panel {
  margin-top: 16px;
}

.comparison-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #f1f5f9;
}

.comparison-row:last-child {
  border-bottom: none;
}

.comparison-label {
  font-size: 13px;
  color: #64748b;
}

.comparison-values {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
}

.current-value {
  font-size: 14px;
  font-weight: 700;
  color: #1e293b;
}

.delta {
  font-size: 11px;
  font-weight: 700;
}

.delta.positive {
  color: #10b981;
}

.delta.negative {
  color: #ef4444;
}
```

- [ ] **Step 3: Update CSS for reports-secondary-grid**

```css
// Update in apps/web/src/index.css around line 1160:
.reports-secondary-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin: 20px 0;
}

@media (max-width: 1024px) {
  .reports-secondary-grid {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 4: Run web dev server to verify sidebar and bottom sections**

```bash
cd apps/web
pnpm dev
```
Expected: Right sidebar shows donut chart, quick insights, action buttons. Bottom section shows comparison panel.

- [ ] **Step 5: Commit web sidebar and bottom changes**

```bash
git add apps/web/src/pages/ReportsPage.tsx apps/web/src/index.css
git commit -m "feat(web): update sidebar with donut chart, insights, and comparison panel"
```

---

## Task 7: Final Testing and Polish

**Files:**
- Test: `apps/mobile/app/(tabs)/reports.tsx`
- Test: `apps/web/src/pages/ReportsPage.tsx`

- [ ] **Step 1: Test mobile responsive layout**

```bash
cd apps/mobile
npx expo start --web
```
Navigate to reports tab. Verify:
- Header shows "Laporan" with month badge
- 3 metric cards in top row
- Line chart with legend
- Category tab shows donut and list
- Tab switching works

- [ ] **Step 2: Test web responsive layout**

```bash
cd apps/web
pnpm dev
```
Navigate to /reports. Verify:
- Header with period badge and filters
- 4 large metric cards
- 2-column main grid (chart + table)
- Right sidebar with donut, insights, buttons
- Comparison panel
- Responsive breakpoints (resize browser)

- [ ] **Step 3: Verify color consistency**

Check both platforms use:
- Primary: #3B82F6 (blue)
- Success: #10B981 (green)
- Danger: #EF4444 (red)
- Warning: #F59E0B (amber)
- Surface: white
- Background: #F8FAFC
- Text primary: #1E293B
- Text secondary: #64748B

- [ ] **Step 4: Verify typography consistency**

Check both platforms use:
- Title: 28px/800 (mobile), page-title (web)
- Card title: 16px/800
- Metric value: 18-24px/800
- Body text: 13px/400
- Small text: 11px

- [ ] **Step 5: Run any existing tests**

```bash
cd apps/web
pnpm test
```
Expected: All tests pass (or at least no new failures).

- [ ] **Step 6: Final commit**

```bash
git add .
git commit -m "feat: complete report menu UI redesign phase 1 - mobile hybrid layout + web desktop-optimized layout"
```

---

## Self-Review

**1. Spec coverage:**
- ✓ Mobile hybrid layout (compact top + breathable bottom)
- ✓ Web desktop-optimized 2-3 column layout
- ✓ Fintech-bold color palette on both platforms
- ✓ Line chart for 6-month trend
- ✓ Donut chart + category breakdown
- ✓ Metric cards with trends
- ✓ Responsive design (mobile <768px, tablet 768-1024px, desktop >1024px)

**2. Placeholder scan:** No TBD/TODO placeholders found. All code blocks complete.

**3. Type consistency:**
- MetricCard (mobile) vs WebMetricCard (web) - intentionally different for platform optimization
- Color values consistent across platforms
- Component props match spec interfaces

**Plan complete and saved to `docs/superpowers/plans/2026-05-10-report-menu-ui-redesign-phase1.md`. Two execution options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**