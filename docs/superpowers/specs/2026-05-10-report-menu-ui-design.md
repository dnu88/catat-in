---
name: Report Menu UI Redesign
description: Balanced polish redesign of mobile and web report screens with hybrid layout (mobile) and desktop-optimized 2-3 column layout (web), fintech-bold visual style, and improved data clarity
type: project
---

# Report Menu UI Redesign — Balanced Polish Approach

## Overview
Redesign the mobile report screen (`apps/mobile/app/(tabs)/reports.tsx`) and web report screen (`apps/web`) to address user feedback: layout too dense, charts unclear, colors unengaging, and lack of interactivity. Uses hybrid layout (compact top + breathable bottom) for mobile and desktop-optimized 2-3 column layout for web, with fintech-bold visual style.

## User Requirements
- **Layout**: Hybrid (compact summary top, breathable detail bottom) — user choice C
- **Visual style**: Fintech bold (strong colors, high contrast) — user choice D
- **Top metrics**: Income vs Expense, Total transactions, Quick insight — user choices A, C, D
- **Chart type**: Line chart for 6-month trend — designer recommendation accepted
- **Category breakdown**: Donut chart + detail list — user choice C

## Architecture & Layout

### Mobile Screen Structure (Hybrid Layout)
1. **Header** (compact)
   - Title "Laporan"
   - Subtitle "Ringkasan performa finansial"
   - Period badge (e.g., "Mei 2026")

2. **Top Summary Section** (compact, above fold)
   - 3 metric cards in horizontal row
   - Card 1: Income vs Expense (value + trend)
   - Card 2: Total transactions
   - Card 3: Quick insight (delta vs previous month)

3. **Trend Section** (breathable)
   - Line chart card showing 6-month income vs expense trend
   - Clear legend (income green, expense red)
   - Optional "Detail" CTA for expanded view

4. **Category Breakdown Section** (breathable)
   - Donut chart showing total expense
   - List of categories with emoji, name, amount, percentage, and mini progress bar

### Web Screen Structure (Desktop-Optimized 2-3 Column)
1. **Header** (full width)
   - Title "Laporan"
   - Subtitle "Ringkasan performa finansial bulanan"
   - Period selector + filter controls (dropdowns/buttons)

2. **Top Metrics Row** (3-4 cards, full width)
   - Income card (large, with trend)
   - Expense card (large, with trend)
   - Savings card (saving rate + amount)
   - Transaction count card

3. **Main Content Area** (2-column grid on desktop)
   - **Left Column (wider)**: 
     - Line chart (6-month trend, larger canvas)
     - Category breakdown table (full width, sortable columns)
   - **Right Column (narrower)**:
     - Donut chart (prominent)
     - Quick insights panel (AI-generated tips)
     - Export/Share actions

4. **Bottom Section** (full width)
   - Detailed transaction list (last 10 transactions)
   - Comparison vs previous period

### Component Architecture
- **MetricCard**: Compact metric display with border-bottom accent (mobile) / larger card (web)
- **LineChart**: Simple line chart with data points and legend (responsive)
- **DonutChart**: Donut visualization with center total
- **CategoryRow**: Horizontal row for category breakdown (mobile) / table row (web)
- **PeriodSelector**: Dropdown/segmented control for date range selection
- **ComparisonPanel**: Side-by-side comparison vs previous period

## Visual Design

### Color Palette (Fintech Bold)
- **Primary**: `#3B82F6` (blue-500) — brand accent
- **Success**: `#10B981` (emerald-500) — income
- **Danger**: `#EF4444` (red-500) — expense
- **Warning**: `#F59E0B` (amber-500) — transactions
- **Surface**: `#FFFFFF` — card background
- **Background**: `#F8FAFC` (slate-50) — page background
- **Text Primary**: `#1E293B` (slate-800)
- **Text Secondary**: `#64748B` (slate-500)
- **Border**: `#E2E8F0` (slate-200)

### Typography
- **Title**: `fontSize: 28, fontWeight: '800'`
- **Subtitle**: `fontSize: 13, color: textSecondary`
- **Card Title**: `fontSize: 16, fontWeight: '800'`
- **Metric Value**: `fontSize: 18, fontWeight: '800'`
- **Metric Label**: `fontSize: 12, fontWeight: '600'`
- **Body Text**: `fontSize: 13, fontWeight: '400'`
- **Small Text**: `fontSize: 11, color: textMuted`

### Spacing & Layout
- **Page Padding**: `20px`
- **Card Gap**: `14px`
- **Card Padding**: `16px`
- **Card Border Radius**: `16px`
- **Card Border**: `1px solid borderColor`
- **Metric Card Padding**: `12px`
- **Metric Card Border Radius**: `12px`

### Web Component Specifications

### WebMetricCard Component (Desktop)
```typescript
interface WebMetricCardProps {
  label: string;
  value: string | number;
  trend?: string;
  trendDirection?: 'up' | 'down' | 'neutral';
  color: string;
  icon?: React.ReactNode;
  size?: 'default' | 'large';
}
```

### WebLineChart Component (Desktop)
```typescript
interface WebLineChartProps {
  data: {
    income: number[];
    expense: number[];
  };
  labels: string[];
  colors: {
    income: string;
    expense: string;
  };
  height: number;
  showTooltip?: boolean;
  interactive?: boolean;
}
```

### WebCategoryTable Component (Desktop)
```typescript
interface WebCategoryTableProps {
  categories: Array<{
    emoji: string;
    name: string;
    amount: number;
    percentage: number;
    trend?: string;
  }>;
  sortable?: boolean;
  onSort?: (key: string) => void;
}
```

### PeriodSelector Component
```typescript
interface PeriodSelectorProps {
  value: 'month' | 'quarter' | 'year' | 'custom';
  onChange: (value: string) => void;
  customRange?: { start: Date; end: Date };
}
```

### ComparisonPanel Component
```typescript
interface ComparisonPanelProps {
  current: {
    income: number;
    expense: number;
    savings: number;
  };
  previous: {
    income: number;
    expense: number;
    savings: number;
  };
  label: string; // e.g., "vs bulan lalu"
}
```

## Responsive Design Strategy

### Breakpoints
- **Mobile**: < 768px (hybrid layout)
- **Tablet**: 768px - 1024px (2-column grid, reduced sidebar)
- **Desktop**: > 1024px (full 2-3 column layout with all features)

### Platform-Specific Adjustments
| Feature | Mobile | Web Desktop |
|---------|--------|-------------|
| Metric cards | 3 cards, compact | 4 cards, larger |
| Chart size | 160px height | 280px height, interactive |
| Category list | Vertical list with progress bar | Sortable table |
| Period selector | Badge only | Full dropdown + custom range |
| Donut position | Above list | Right sidebar |
| Export/Share | Hidden (Phase 2) | Prominent buttons |

## Component Specifications

### MetricCard Component (Mobile)
```typescript
interface MetricCardProps {
  label: string;
  value: string | number;
  trend?: string; // e.g., "▲ 12.5%"
  color: string; // border-bottom color
  icon?: string; // optional emoji/icon
}
```

### LineChart Component
```typescript
interface LineChartProps {
  data: {
    income: number[];
    expense: number[];
  };
  labels: string[]; // month labels
  colors: {
    income: string;
    expense: string;
  };
  height: number;
}
```

### DonutChart Component
```typescript
interface DonutChartProps {
  total: string; // formatted total
  segments: Array<{
    value: number;
    color: string;
    label: string;
  }>;
}
```

### CategoryRow Component
```typescript
interface CategoryRowProps {
  emoji: string;
  label: string;
  amount: string; // formatted amount
  percentage: number;
}
```

## Data Flow & State

### Current State (Implementation Phase 1)
- Uses mock data from existing `reports.tsx` file
- Income/expense data arrays: `incomeData`, `expenseData`
- Category data array: `categories`
- Tab state: `activeTab` ('overview' | 'category')

### Future Integration (Phase 2)
- Connect to Supabase for real transaction data
- Dynamic period filtering (month/3-month/6-month)
- Real-time updates via Supabase subscriptions

## Error Handling & Edge Cases

### Empty States
- **No transactions**: Show "Belum ada transaksi bulan ini" + CTA
- **No chart data**: Show placeholder "Data belum tersedia"

### Loading States
- Skeleton loading for cards and charts
- Shimmer effect during data fetch

### Error States
- Fetch failure: Show retry button + "Gagal memuat data"

### Edge Cases
- Large numbers (>1 billion): Format as "Rp 1,2 M"
- Zero percentages: Show empty progress bar
- Categories with no transactions: Omit from list

## Testing Strategy

### UI Snapshot Testing
1. Verify new layout structure (header, 3 metric cards, line chart, donut+list)
2. Check visual hierarchy and spacing

### Visual Regression Testing
1. Compare before/after screenshots
2. Verify color contrast and accessibility

### Interaction Testing
1. Tab switching (Ringkasan/Kategori) functionality
2. Chart touch interactions (if implemented)

### Data Rendering Testing
1. Metric values display correctly from mock data
2. Chart points align with data arrays
3. Category list matches mock data

### Edge State Testing
1. Empty state displays correctly
2. Loading state shows skeleton
3. Error state shows retry option

## Implementation Phases

### Phase 1: Core UI Redesign (Current Scope)
1. Update **mobile** layout to hybrid structure (`apps/mobile/app/(tabs)/reports.tsx`)
2. Update **web** layout to desktop-optimized 2-column structure (`apps/web` report page)
3. Implement new color palette and typography on both platforms
4. Create/update components:
   - Mobile: MetricCard, LineChart, DonutChart, CategoryRow
   - Web: WebMetricCard, WebLineChart, WebCategoryTable, PeriodSelector, ComparisonPanel
5. Maintain existing navigation/tab functionality

### Phase 2: Enhanced Interactivity (Future)
1. Add period filter (month/3-month/6-month/custom) on web and mobile
2. Implement chart interaction (hover tooltip on web, tap detail on mobile)
3. Add export/share actions on web
4. Connect both platforms to Supabase real data

### Phase 3: Advanced Features (Optional)
1. Export report functionality
2. Share insights via social/email
3. Custom date range selection
4. Comparative analysis (vs previous period)

## Success Criteria
- **Layout**: Clear visual hierarchy with hybrid structure (mobile) and 2-3 column layout (web)
- **Clarity**: Charts and metrics immediately understandable on both platforms
- **Engagement**: Bold colors create professional fintech feel
- **Performance**: Maintain smooth 60fps scrolling (mobile), instant interactions (web)
- **Accessibility**: WCAG AA compliance for color contrast on both platforms
- **Responsive**: Seamless experience from mobile to desktop

## Target Files
- **Mobile**: `apps/mobile/app/(tabs)/reports.tsx`
- **Web**: `apps/web/src/pages/ReportsPage.tsx` (or equivalent report page)
- **Shared**: Color palette can be shared via design tokens if available

## Why This Approach
**Balanced polish** was chosen over high-fidelity redesign or light refresh because:
- Addresses all user concerns (A-D) without over-engineering
- Maintains existing data structure and logic
- Provides significant visual improvement with moderate effort
- Sets foundation for future interactive features
- Aligns with mobile-first fintech app expectations
- Desktop-optimized layout leverages larger screen real estate without duplicating mobile constraints

---

**Why:** User requested improvements to report menu layout, chart clarity, visual appeal, and interactivity on both mobile and web platforms. This design addresses all four concerns with a balanced approach that improves UX without breaking existing functionality.

**How to apply:** Use this spec as the implementation guide for updating both mobile (`apps/mobile/app/(tabs)/reports.tsx`) and web (`apps/web` report page). Follow the color palette, typography, and component specifications for each platform. Test against the success criteria before considering the work complete.