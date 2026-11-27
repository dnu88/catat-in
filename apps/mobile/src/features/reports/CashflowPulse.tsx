import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { financeEditorial as fe } from "../../theme/finance-editorial";
import { buildCashflowPulseModel, finiteAmount, formatCashflowAmount, type CashflowChartData } from "./cashflow-pulse-model";

type Props = {
  data: CashflowChartData;
  /** Scoped report totals in rupiah, NOT the sum of chart buckets. */
  summaryIncome: number;
  summaryExpense: number;
  periodLabel: string;
  scopeKey: string;
  language: string;
};
const PLOT_HEIGHT = 132;

export function CashflowPulse({ data, summaryIncome, summaryExpense, periodLabel, scopeKey, language }: Props) {
  const isEn = language === "en";
  const title = isEn ? "Cashflow Pulse" : "Ritme Kas";
  const incomeLabel = isEn ? "Income" : "Pemasukan";
  const expenseLabel = isEn ? "Expense" : "Pengeluaran";
  const netLabel = isEn ? "Net cash flow" : "Arus kas bersih";
  const model = useMemo(() => buildCashflowPulseModel(data, PLOT_HEIGHT), [data]);
  const [selection, setSelection] = useState<{ scope: string; key: string } | null>(null);
  const selectionScope = `${scopeKey}:${data.keys.join("|")}`;
  useEffect(() => { setSelection(null); }, [selectionScope]);
  const selected = selection?.scope === selectionScope
    ? model.buckets.find((bucket) => bucket.key === selection.key) : undefined;
  const net = finiteAmount(finiteAmount(summaryIncome) - finiteAmount(summaryExpense));
  const amount = (value: number) => formatCashflowAmount(value, language);
  const netColor = (value: number) => value < 0 ? fe.financialExpenseAlert : fe.financialTotal;
  const status = summaryIncome === 0 && summaryExpense === 0 ? (isEn ? "No activity yet" : "Belum ada aktivitas") : net < 0 ? (isEn ? "Deficit" : "Defisit") : net > 0 ? "Surplus" : (isEn ? "Balanced" : "Seimbang");
  const bucketTitle = (bucket: (typeof model.buckets)[number]) => {
    if (bucket.key.length <= 7) return `${bucket.label} ${bucket.year}`;
    if (bucket.startDate && bucket.endDate && bucket.startDate.slice(0, 7) !== bucket.endDate.slice(0, 7)) {
      const dateLabel = (key: string) => {
        const [year, month, day] = key.split("-").map(Number);
        return new Date(year, month - 1, day).toLocaleDateString(isEn ? "en-GB" : "id-ID", {
          day: "numeric", month: "short", year: "numeric",
        });
      };
      return `${dateLabel(bucket.startDate)} – ${dateLabel(bucket.endDate)}`;
    }
    // Weekly/daily buckets need their month as well as their day range and year.
    const month = new Date(Number(bucket.key.slice(0, 4)), Number(bucket.key.slice(5, 7)) - 1, 1)
      .toLocaleString(isEn ? "en-US" : "id-ID", { month: "short" });
    return `${bucket.label} ${month} ${bucket.year}`;
  };
  return (
    <View testID="reports-pulse-chart">
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{isEn ? "Income and expense · shared scale" : "Pemasukan dan pengeluaran · skala yang sama"}</Text>
      <View style={styles.summary}>
        <Text style={styles.caption}>{netLabel}</Text>
        <Text testID="reports-pulse-net-amount" style={[styles.net, { color: netColor(net) }]}>{amount(net)}</Text>
        <View style={styles.periodRow}>
          <Text style={styles.period}>{isEn ? "Selected period" : "Periode terpilih"} · {periodLabel}</Text>
          <Text style={[styles.status, { color: netColor(net) }]}>{status}</Text>
        </View>
      </View>
      <View style={styles.chartRow}>
        <View style={styles.axis} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {model.ticks.map((tick, index) => (
            <Text key={index} style={[styles.tick, { top: model.ceiling === 0 ? PLOT_HEIGHT - 6 : index * (PLOT_HEIGHT / 2) - 6 }]}>
              {formatCashflowAmount(tick, language, false)}
            </Text>
          ))}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { minWidth: model.buckets.length * 44 }]}
          testID="reports-pulse-plot-scroll">
          {/* Historical registry marker names this real chart, not a hidden alias. */}
          <View testID="reports-line-chart-svg" accessibilityLabel={`${title}: ${periodLabel}`} style={styles.plot}>
            <View pointerEvents="none" style={styles.guides}>
              {[0, 1, 2].map((index) => <View key={index} testID={`reports-line-guide-${index}`} style={styles.guide} />)}
            </View>
            {model.buckets.map((bucket, index) => (
              <Pressable key={bucket.key} testID={`reports-pulse-column-${index}`} accessibilityRole="button"
                accessibilityState={{ selected: selected?.key === bucket.key }}
                accessibilityLabel={`${bucketTitle(bucket)}. ${incomeLabel}: ${amount(bucket.income)}. ${expenseLabel}: ${amount(bucket.expense)}. ${netLabel}: ${amount(bucket.net)}`}
                accessibilityHint={isEn ? "Show or hide period details below the chart" : "Tampilkan atau tutup rincian periode di bawah grafik"}
                onPress={() => setSelection(selected?.key === bucket.key ? null : { scope: selectionScope, key: bucket.key })}
                style={[styles.column, selected?.key === bucket.key && styles.selected]}>
                <View style={styles.bars}>
                  <View testID={`reports-pulse-bar-income-${index}`} style={[styles.bar, { height: bucket.incomeHeight, backgroundColor: fe.financialIncome }]} />
                  <View testID={`reports-pulse-bar-expense-${index}`} style={[styles.bar, { height: bucket.expenseHeight, backgroundColor: fe.financialExpense }]} />
                </View>
                <Text style={[styles.label, selected?.key === bucket.key && styles.selectedLabel]} numberOfLines={1}>{bucket.label}</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </View>
      <View style={styles.legend}>
        <View style={styles.legendItem}><View style={[styles.swatch, { backgroundColor: fe.financialIncome }]} /><Text style={styles.caption}>{incomeLabel}</Text></View>
        <View style={styles.legendItem}><View style={[styles.swatch, { backgroundColor: fe.financialExpense }]} /><Text style={styles.caption}>{expenseLabel}</Text></View>
      </View>
      {model.empty && <Text testID="reports-pulse-empty" style={styles.empty}>{isEn ? "No income or expense in this period." : "Belum ada pemasukan atau pengeluaran pada periode ini."}</Text>}
      {selected ? (
        <View testID="reports-pulse-detail" style={styles.detail} accessibilityLiveRegion="polite">
          <Text style={styles.detailTitle}>{isEn ? "Period detail" : "Rincian periode"} · {bucketTitle(selected)}</Text>
          <View style={styles.detailRow}><Text style={styles.caption}>{incomeLabel}</Text><Text testID="reports-pulse-detail-income" style={[styles.detailAmount, { color: fe.financialIncome }]}>{amount(selected.income)}</Text></View>
          <View style={styles.detailRow}><Text style={styles.caption}>{expenseLabel}</Text><Text testID="reports-pulse-detail-expense" style={[styles.detailAmount, { color: fe.financialExpense }]}>{amount(selected.expense)}</Text></View>
          <View style={styles.detailRow}><Text style={styles.caption}>{netLabel}</Text><Text testID="reports-pulse-detail-net" style={[styles.detailAmount, { color: netColor(selected.net) }]}>{amount(selected.net)}</Text></View>
        </View>
      ) : <Text style={styles.hint}>{isEn ? "Swipe chart if needed · tap a period for details" : "Geser grafik bila perlu · ketuk periode untuk rincian"}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  title: { color: fe.ink, fontSize: 18, fontWeight: "600" },
  subtitle: { color: fe.muted, fontSize: 12, marginTop: 4 },
  summary: { marginTop: 18, marginBottom: 22, gap: 5 },
  caption: { color: fe.muted, fontSize: 12 },
  net: { fontSize: 28, fontWeight: "700", flexShrink: 1 },
  periodRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  period: { color: fe.muted, fontSize: 11, flexShrink: 1 },
  status: { fontSize: 11, fontWeight: "600" },
  chartRow: { flexDirection: "row", marginHorizontal: -8, minWidth: 0 },
  axis: { width: 40, height: PLOT_HEIGHT, marginRight: 4 },
  tick: { position: "absolute", right: 0, fontSize: 11, color: fe.muted },
  scroll: { flex: 1, minWidth: 0 },
  scrollContent: { flexGrow: 1 },
  plot: { flexDirection: "row", flex: 1, minWidth: 0 },
  guides: { position: "absolute", left: 0, right: 0, top: 0, height: PLOT_HEIGHT, justifyContent: "space-between" },
  guide: { height: 1, backgroundColor: fe.line },
  column: { flex: 1, minWidth: 44, alignItems: "center", borderRadius: 5, paddingBottom: 6 },
  selected: { backgroundColor: "rgba(12,78,145,0.07)" },
  bars: { height: PLOT_HEIGHT, flexDirection: "row", alignItems: "flex-end", justifyContent: "center", gap: 4, width: "100%" },
  bar: { width: 11, borderTopLeftRadius: 3, borderTopRightRadius: 3 },
  label: { color: fe.muted, fontSize: 11, marginTop: 8 },
  selectedLabel: { color: fe.financialTotal, fontWeight: "700" },
  legend: { flexDirection: "row", flexWrap: "wrap", gap: 16, marginTop: 14 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  swatch: { width: 8, height: 8, borderRadius: 2 },
  empty: { color: fe.muted, fontSize: 12, lineHeight: 18, marginTop: 12 },
  hint: { color: fe.muted, fontSize: 11, marginTop: 12 },
  detail: { backgroundColor: fe.paper, borderRadius: 12, padding: 12, marginTop: 14, gap: 10 },
  detailTitle: { color: fe.ink, fontSize: 12, fontWeight: "600" },
  detailRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 8 },
  detailAmount: { fontSize: 13, fontWeight: "600", flexShrink: 1 },
});
