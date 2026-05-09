# Tasks 5-6: Web Report Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update web report page main content layout with 2-column grid and category table (Task 5), then add sidebar with donut chart, insights, and comparison panel (Task 6).

**Architecture:** Replace BarChart with category breakdown table in reports-main-grid. Add CSS-only donut chart, quick insights section, and comparison panel in reports-secondary-grid. Preserve all existing data fetching, helper functions, and Recharts LineChart.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Recharts (LineChart only), CSS custom properties

---

## File Structure

**Modified files:**
- `apps/web/src/pages/ReportsPage.tsx` - Update JSX structure for main grid and secondary grid
- `apps/web/src/index.css` - Add category table styles, donut chart styles, sidebar component styles

**No new files created.**

---

## Task 5: Update Web Main Content Layout

**Files:**
- Modify: `apps/web/src/pages/ReportsPage.tsx:350-440` (reports-main-grid section)
- Modify: `apps/web/src/index.css` (add category table CSS, update reports-main-grid)

### Step 1: Update CSS for reports-main-grid and category table

Add the following CSS to `apps/web/src/index.css` after the `.metric-trend` rule (around line 1355):

```css
/* ── CATEGORY TABLE ──────────────────────────────────────────── */

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

Then update the `.reports-main-grid` CSS (around line 1154) to:

```css
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

- [ ] **Step 1: Add category table CSS and update reports-main-grid**

Edit `apps/web/src/index.css`:
1. Add category table CSS after `.metric-trend` (line ~1355)
2. Update `.reports-main-grid` to use `2fr 1fr` columns with `20px` gap and `margin: 20px 0`
3. Add responsive breakpoint at 1024px for single column

### Step 2: Replace BarChart section with category table

In `apps/web/src/pages/ReportsPage.tsx`, replace the second section in `reports-main-grid` (lines 411-439). 

Current structure has the "Insight Bulan Ini" section - replace it with category breakdown table.

Find the section starting at line 411:
```tsx
<section className="card panel-card">
  <div className="panel-head">
    <h3 className="panel-title">Insight Bulan Ini</h3>
```

Replace the entire section (lines 411-439) with:

```tsx
<section className="card panel-card">
  <div className="panel-head">
    <h3 className="panel-title">Breakdown Kategori</h3>
    <p className="panel-subtitle">
      Distribusi pengeluaran per kategori bulan ini.
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
                  <span
                    className="category-dot"
                    style={{
                      background: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
                    }}
                  />
                  <span style={{ fontSize: "13px", fontWeight: 600, color: "#1e293b" }}>
                    {item.label}
                  </span>
                </div>
              </td>
              <td>
                <span style={{ fontSize: "13px", fontWeight: 600, color: "#1e293b" }}>
                  {formatRupiah(item.amount)}
                </span>
              </td>
              <td>
                <div className="percentage-cell">
                  <span style={{ fontSize: "12px", color: "#64748b", minWidth: "40px" }}>
                    {item.percentage}%
                  </span>
                  <div className="percentage-bar">
                    <div
                      className="percentage-bar-fill"
                      style={{
                        width: `${item.percentage}%`,
                        background: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
                      }}
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
```

- [ ] **Step 2: Replace insight section with category table in reports-main-grid**

Edit `apps/web/src/pages/ReportsPage.tsx` lines 411-439:
1. Change panel title to "Breakdown Kategori"
2. Replace InsightCard components with category table structure
3. Keep categoryChartData mapping for table rows
4. Add percentage bar visualization

### Step 3: Remove unused BarChart imports

Remove `BarChart`, `Bar`, and `Cell` from the Recharts imports at the top of the file (lines 2-13), since the BarChart is being removed from reports-main-grid.

**Important:** The BarChart is still used in `reports-secondary-grid` (lines 463-493), so we need to keep these imports.

Actually, looking at the code more carefully, the BarChart is used in `reports-secondary-grid` for "Breakdown Pengeluaran per Kategori". So we should NOT remove these imports.

- [ ] **Step 3: Keep BarChart imports (they're still used in secondary grid)**

No changes to imports needed.

### Step 4: Verify changes and commit Task 5

- [ ] **Step 4: Commit Task 5 changes**

```bash
cd "C:\Users\ThinkPad\catat-in-dev-setup\kaswise"
git add apps/web/src/pages/ReportsPage.tsx apps/web/src/index.css
git commit -m "feat(web): update main content layout with 2-column grid and category table"
```

---

## Task 6: Update Web Sidebar and Bottom Sections

**Files:**
- Modify: `apps/web/src/pages/ReportsPage.tsx:442-702` (reports-secondary-grid section)
- Modify: `apps/web/src/index.css` (add sidebar CSS, update reports-secondary-grid)

### Step 5: Add CSS for sidebar components

Add the following CSS to `apps/web/src/index.css` after the category table styles:

```css
/* ── DONUT CHART & SIDEBAR ───────────────────────────────────── */

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

Then update the `.reports-secondary-grid` CSS (around line 1160) to:

```css
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

- [ ] **Step 5: Add sidebar CSS and update reports-secondary-grid**

Edit `apps/web/src/index.css`:
1. Add donut chart, insights, and comparison panel CSS
2. Update `.reports-secondary-grid` to use `1fr 1fr` columns
3. Add responsive breakpoint at 1024px

### Step 6: Restructure reports-secondary-grid with new components

In `apps/web/src/pages/ReportsPage.tsx`, replace the `reports-secondary-grid` section (lines 442-702).

The current structure has:
- Left: BarChart + category buttons
- Right: Category detail

Replace the entire `reports-secondary-grid` div (lines 442-702) with:

```tsx
<div className="reports-secondary-grid">
  {/* Left column: Donut chart + Quick insights + Action buttons */}
  <section className="card panel-card">
    <div className="panel-head">
      <h3 className="panel-title">Ringkasan</h3>
      <p className="panel-subtitle">
        Visualisasi dan wawasan cepat.
      </p>
    </div>

    {/* CSS-only Donut Chart */}
    <div className="donut-container">
      <div className="donut-chart">
        <div className="donut-inner">
          <div className="donut-value">{savingsRate}%</div>
          <div className="donut-label">Tingkat Tabungan</div>
        </div>
      </div>
    </div>

    {/* Quick Insights */}
    <div className="quick-insights">
      <div className="insights-title">Wawasan Cepat</div>
      
      <div className="insight-item">
        <span className="insight-icon">💰</span>
        <span className="insight-text">
          {savingsRate}% dari pemasukan bulan ini tersisa sebagai arus bersih.
        </span>
      </div>
      
      <div className="insight-item">
        <span className="insight-icon">📊</span>
        <span className="insight-text">
          {previousTrend && currentTrend
            ? `Pengeluaran ${expenseDelta >= 0 ? "naik" : "turun"} ${formatRupiah(Math.abs(expenseDelta))} dibanding ${monthLabel(previousTrend.year, previousTrend.month)}.`
            : "Belum cukup data untuk membandingkan dengan bulan sebelumnya."}
        </span>
      </div>
      
      <div className="insight-item">
        <span className="insight-icon">🏷️</span>
        <span className="insight-text">
          {summary.expense_by_category[0]
            ? `${CATEGORY_LABEL[summary.expense_by_category[0].category] || summary.expense_by_category[0].category} menyumbang ${summary.expense_by_category[0].percentage}% dari total pengeluaran.`
            : "Belum ada kategori pengeluaran pada periode ini."}
        </span>
      </div>
    </div>

    {/* Action Buttons (Phase 2 placeholders) */}
    <div className="action-buttons">
      <button className="btn btn-secondary" style={{ flex: 1 }}>
        Export PDF
      </button>
      <button className="btn btn-secondary" style={{ flex: 1 }}>
        Share
      </button>
    </div>
  </section>

  {/* Right column: Comparison panel + Category breakdown */}
  <section className="card panel-card">
    <div className="panel-head">
      <h3 className="panel-title">Perbandingan Bulan Lalu</h3>
      <p className="panel-subtitle">
        Bandingkan dengan periode sebelumnya.
      </p>
    </div>

    {/* Comparison Panel */}
    <div className="comparison-panel">
      <div className="comparison-row">
        <span className="comparison-label">Pemasukan</span>
        <div className="comparison-values">
          <span className="current-value">{formatRupiah(summary.total_income)}</span>
          {previousTrend && currentTrend && (
            <span className={`delta ${currentTrend.income >= previousTrend.income ? "positive" : "negative"}`}>
              {currentTrend.income >= previousTrend.income ? "+" : ""}
              {formatRupiah(currentTrend.income - previousTrend.income)}
            </span>
          )}
        </div>
      </div>
      
      <div className="comparison-row">
        <span className="comparison-label">Pengeluaran</span>
        <div className="comparison-values">
          <span className="current-value">{formatRupiah(summary.total_expense)}</span>
          {previousTrend && currentTrend && (
            <span className={`delta ${currentTrend.expense <= previousTrend.expense ? "positive" : "negative"}`}>
              {currentTrend.expense >= previousTrend.expense ? "+" : ""}
              {formatRupiah(currentTrend.expense - previousTrend.expense)}
            </span>
          )}
        </div>
      </div>
      
      <div className="comparison-row">
        <span className="comparison-label">Tabungan</span>
        <div className="comparison-values">
          <span className="current-value">{formatRupiah(summary.net)}</span>
          {previousTrend && currentTrend && (
            <span className={`delta ${currentTrend.net >= previousTrend.net ? "positive" : "negative"}`}>
              {currentTrend.net >= previousTrend.net ? "+" : ""}
              {formatRupiah(currentTrend.net - previousTrend.net)}
            </span>
          )}
        </div>
      </div>
    </div>

    {/* Category Breakdown List (simplified from original) */}
    <div style={{ marginTop: "20px" }}>
      <div className="insights-title">Top Kategori</div>
      {categoryChartData.slice(0, 3).map((item, index) => (
        <div
          key={item.category}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "10px 0",
            borderBottom: "1px solid #f1f5f9",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
              }}
            />
            <span style={{ fontSize: "13px", color: "#1e293b" }}>{item.label}</span>
          </div>
          <span style={{ fontSize: "12px", fontWeight: 600, color: "#64748b" }}>
            {item.percentage}%
          </span>
        </div>
      ))}
    </div>
  </section>
</div>
```

- [ ] **Step 6: Replace reports-secondary-grid with new structure**

Edit `apps/web/src/pages/ReportsPage.tsx` lines 442-702:
1. Replace entire reports-secondary-grid div
2. Add CSS-only donut chart showing savings rate
3. Add quick insights section with icons
4. Add action buttons (Export PDF, Share)
5. Add comparison panel with income/expense/savings deltas
6. Add simplified top categories list

### Step 7: Remove unused BarChart imports

Now that BarChart is removed from both grids, remove the unused imports.

At line 3-6, remove `BarChart`, `Bar`, and `Cell`:

**Before:**
```tsx
import {
  BarChart,
  Bar,
  CartesianGrid,
  Cell,
  LineChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
```

**After:**
```tsx
import {
  CartesianGrid,
  LineChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
```

- [ ] **Step 7: Remove unused BarChart imports**

Edit `apps/web/src/pages/ReportsPage.tsx` lines 2-13:
1. Remove `BarChart`, `Bar`, `Cell` from recharts imports
2. Keep `LineChart` and related imports for trend chart

### Step 8: Verify changes and commit Task 6

- [ ] **Step 8: Commit Task 6 changes**

```bash
cd "C:\Users\ThinkPad\catat-in-dev-setup\kaswise"
git add apps/web/src/pages/ReportsPage.tsx apps/web/src/index.css
git commit -m "feat(web): update sidebar with donut chart, insights, and comparison panel"
```

---

## Self-Review Checklist

- [x] **Spec coverage:** All requirements from task description covered
- [x] **No placeholders:** All code provided in full
- [x] **Type consistency:** Using existing `categoryChartData`, `previousTrend`, `currentTrend`, `savingsRate`, `summary` variables
- [x] **Helper functions preserved:** `formatRupiah`, `monthLabel`, `CATEGORY_LABEL`, `CATEGORY_COLORS` all used
- [x] **Responsive design:** Media queries at 1024px breakpoint
- [x] **Two separate commits:** Task 5 and Task 6 clearly separated

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-10-tasks-5-6-web-report-layout.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
