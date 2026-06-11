import { useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { PageEntrance, StaggeredStack } from "../../src/components/motion";

import type { KaswiseIconName } from "../../src/components/icons/kaswise-icons";
import {
	EmptyState,
	FilterChip,
	IconBubble,
	ScreenHeader,
	StateMessage,
	StatusBadge,
} from "../../src/components/ui";
import { LoadingState } from "../../src/components/ui/LoadingState";
import { useTheme } from "../../src/theme/theme-context";
import { useI18n } from "../../src/i18n/i18n-context";
import { useFinanceContext } from "../../src/state/finance-context";
import { listBills, createBill, updateBill, type Bill, type BillCreate } from "../../src/services/bills";

type BillStatus = "paid" | "upcoming" | "overdue";

const billIcons: Record<string, KaswiseIconName> = {
	Internet: "insight",
	Listrik: "budgets",
	Netflix: "insight",
	Spotify: "insight",
	Asuransi: "budgets",
	Air: "budgets",
	Telepon: "notification",
};

type FilterStatus = "all" | BillStatus;

type BillWithStatus = Bill & { status: BillStatus };

type BillRowProps = {
  item: BillWithStatus;
  theme: ReturnType<typeof useTheme>["theme"];
  styles: ReturnType<typeof createStyles>;
  payingId: string | null;
  onMarkPaid: (id: string) => void;
  canUpdate: boolean;
  isEn: boolean;
};

function BillRow({
  item: bill,
  theme,
  styles,
  payingId,
  onMarkPaid,
  canUpdate,
  isEn,
}: BillRowProps) {
  const statusColor =
    bill.status === "paid"
      ? theme.colors.success
      : bill.status === "overdue"
        ? theme.colors.danger
        : theme.colors.warning;

  const statusLabel =
    bill.status === "paid"
      ? (isEn ? "Paid" : "Lunas")
      : bill.status === "overdue"
        ? (isEn ? "Overdue" : "Terlambat")
        : (isEn ? "Upcoming" : "Akan Datang");

  const dueDate = new Date(bill.next_due_date);
  const locale = isEn ? "en-US" : "id-ID";
  const formattedDate = dueDate.toLocaleDateString(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const dueLabel = isEn ? "Due" : "Jatuh tempo";

  const markPaidA11y = isEn
    ? `Mark ${bill.name} as paid`
    : `Tandai tagihan ${bill.name} lunas`;

  const payingLabel = isEn ? "Processing..." : "Memproses...";
  const payLabel = isEn ? "Mark Paid" : "Tandai Lunas";

  const iconKey =
    Object.keys(billIcons).find((key) => bill.name.includes(key)) || "bills";
  const icon = billIcons[iconKey] || "bills";

  return (
    <View style={styles.billCard}>
      <View style={styles.billTop}>
        <View style={styles.billLeft}>
          <IconBubble
            name={icon as KaswiseIconName}
            tone={
              bill.status === "paid"
                ? "success"
                : bill.status === "overdue"
                  ? "danger"
                  : "warning"
            }
            size={44}
          />
          <View style={{ flex: 1 }}>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
            >
              <Text
                style={styles.billName}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {bill.name}
              </Text>
              <StatusBadge label={statusLabel} color={statusColor} />
            </View>
            <Text style={styles.billDue}>{dueLabel}: {formattedDate}</Text>
          </View>
        </View>
      </View>

      <View style={styles.billBottom}>
        <Text style={styles.billAmount}>
          Rp {bill.amount.toLocaleString(locale)}
        </Text>
        {canUpdate && bill.status === "upcoming" && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={markPaidA11y}
            accessibilityState={{
              disabled: payingId === bill.id,
              busy: payingId === bill.id,
            }}
            style={[styles.payButton, payingId === bill.id && { opacity: 0.7 }]}
            onPress={() => onMarkPaid(bill.id)}
            disabled={payingId === bill.id}
          >
            <Text style={styles.payButtonText}>
              {payingId === bill.id ? payingLabel : payLabel}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

export default function BillsScreen() {
  const { theme } = useTheme();
  const { language } = useI18n();
  const isEn = language === "en";
  const { activeContext, canCreate } = useFinanceContext();
	const styles = useMemo(() => createStyles(theme), [theme]);
	const [filter, setFilter] = useState<FilterStatus>("all");
	const [bills, setBills] = useState<Bill[]>([]);
	const [loading, setLoading] = useState(true);
	const [loadError, setLoadError] = useState<string | null>(null);
	const [payingId, setPayingId] = useState<string | null>(null);

	// --- Simple bill create form state (Tasks 2-4) ---
	const [showCreate, setShowCreate] = useState(false);
	const [nameInput, setNameInput] = useState("");
	const [amountInput, setAmountInput] = useState("");
	const [dueDayInput, setDueDayInput] = useState(String(new Date().getDate()));
	const [recurrenceInput, setRecurrenceInput] = useState<"monthly" | "once">("monthly");
	const [notifyBeforeDays, setNotifyBeforeDays] = useState(3);
	const [savingBill, setSavingBill] = useState(false);

	function parseRupiahInput(raw: string): number {
	  const digits = raw.replace(/[^0-9]/g, "");
	  return Number(digits || 0);
	}

	function clampDueDay(raw: string): number {
	  const day = Number(raw);
	  if (!Number.isFinite(day)) return new Date().getDate();
	  return Math.min(Math.max(Math.round(day), 1), 31);
	}

	function formatLocalDate(date: Date): string {
	  const y = date.getFullYear();
	  const m = String(date.getMonth() + 1).padStart(2, "0");
	  const d = String(date.getDate()).padStart(2, "0");
	  return `${y}-${m}-${d}`;
	}

	function resolveNextDueDate(dueDay: number, recurrence: "monthly" | "once", reference = new Date()): string {
	  const year = reference.getFullYear();
	  const month = reference.getMonth();
	  const today = reference.getDate();
	  if (recurrence === "monthly" && dueDay < today) {
	    const next = new Date(year, month + 1, 1);
	    return formatLocalDate(new Date(next.getFullYear(), next.getMonth(), Math.min(dueDay, new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate())));
	  }
	  const lastDay = new Date(year, month + 1, 0).getDate();
	  return formatLocalDate(new Date(year, month, Math.min(dueDay, lastDay)));
	}

	function resetCreateForm() {
	  setNameInput("");
	  setAmountInput("");
	  setDueDayInput(String(new Date().getDate()));
	  setRecurrenceInput("monthly");
	  setNotifyBeforeDays(3);
	  setShowCreate(false);
	}

	const saveBill = async () => {
	  if (savingBill) return;
	  const amount = parseRupiahInput(amountInput);
	  const dueDay = clampDueDay(dueDayInput);
	  if (!nameInput.trim() || amount <= 0) {
	    setLoadError(isEn ? "Enter a bill name and amount." : "Isi nama dan nominal tagihan.");
	    return;
	  }
	  const nextDueDate = resolveNextDueDate(dueDay, recurrenceInput);
	  setSavingBill(true);
	  setLoadError(null);
	  try {
	    await createBill({
	      name: nameInput.trim(),
	      amount,
	      due_day: dueDay,
	      recurrence: recurrenceInput,
	      next_due_date: nextDueDate,
	      notify_before_days: notifyBeforeDays,
	    }, activeContext);
	    resetCreateForm();
	    await loadBills();
	  } catch {
	    setLoadError(isEn ? "Failed to save bill. Try again." : "Gagal menyimpan tagihan. Coba lagi.");
	  } finally {
	    setSavingBill(false);
	  }
	};

	useEffect(() => {
		loadBills();
	}, [activeContext]);

	const loadBills = async () => {
		setLoading(true);
		try {
			setLoadError(null);
			const data = await listBills(activeContext);
			setBills(data);
		} catch (error) {
		  console.error("Error loading bills:", error);
		  setLoadError(isEn ? "Failed to load bills. Try again later." : "Gagal memuat tagihan. Coba lagi sebentar.");
		} finally {
			setLoading(false);
		}
	};

	const markAsPaid = async (id: string) => {
	  if (payingId) return;
	  const bill = bills.find((b) => b.id === id);
	  if (!bill) return;

	  try {
	    setPayingId(id);
	    setLoadError(null);

	    if (bill.recurrence === "monthly") {
	      // Roll forward to next month — keep is_paid false
	      const currentDue = new Date(bill.next_due_date);
	      const nextMonth = currentDue.getMonth() + 1;
	      const nextYear = currentDue.getFullYear() + (nextMonth > 11 ? 1 : 0);
	      const targetMonth = nextMonth % 12;
	      const lastDay = new Date(nextYear, targetMonth + 1, 0).getDate();
	      const nextDueDate = formatLocalDate(
	        new Date(nextYear, targetMonth, Math.min(bill.due_day, lastDay))
	      );
	      const paymentRecord = {
	        paid_at: new Date().toISOString(),
	        amount: bill.amount,
	        due_date: bill.next_due_date,
	      };
	      await updateBill(id, {
	        next_due_date: nextDueDate,
	        payment_history: [
	          ...(bill.payment_history ?? []),
	          paymentRecord,
	        ],
	      }, activeContext);
	    } else {
	      // Once — mark permanently paid
	      await updateBill(id, { is_paid: true }, activeContext);
	    }
	    await loadBills();
	  } catch (error) {
	    console.error("Error marking bill as paid:", error);
	    setLoadError(isEn ? "Failed to update bill status. Try again." : "Gagal update status tagihan. Coba lagi.");
	  } finally {
	    setPayingId(null);
	  }
	};

	const billsWithStatus = useMemo(
		() =>
			bills.map((bill) => {
				const dueDate = new Date(bill.next_due_date);
				const today = new Date();
				let status: BillStatus = "upcoming";

				if (bill.is_paid) {
					status = "paid";
				} else if (dueDate < today) {
					status = "overdue";
				}

				return { ...bill, status };
			}),
		[bills],
	);

	const filtered = useMemo(
		() =>
			filter === "all"
				? billsWithStatus
				: billsWithStatus.filter((b) => b.status === filter),
		[filter, billsWithStatus],
	);

	const totalUpcoming = useMemo(
		() =>
			billsWithStatus
				.filter((b) => b.status === "upcoming")
				.reduce((a, b) => a + b.amount, 0),
		[billsWithStatus],
	);

	const overdueCount = useMemo(
		() => billsWithStatus.filter((b) => b.status === "overdue").length,
		[billsWithStatus],
	);


	const renderBill = ({ item }: { item: BillWithStatus }) => (
	  <BillRow
	    item={item}
	    theme={theme}
	    styles={styles}
	    payingId={payingId}
	    onMarkPaid={markAsPaid}
	    canUpdate={canCreate}
	    isEn={isEn}
	  />
	);

	const keyExtractor = (item: BillWithStatus) => item.id;

	const listHeader = useMemo(() => (
		<StaggeredStack testIDPrefix="bills-entrance">
		  <ScreenHeader
		    key="bills-header"
		    title={isEn ? "Bills" : "Tagihan"}
		    subtitle={isEn ? "Manage simple bill reminders." : "Kelola pengingat tagihan rutin."}
		    action={
		      canCreate ? (
		        <Pressable
		          testID="bills-add-button"
		          accessibilityRole="button"
		          onPress={() => setShowCreate(true)}
		          style={styles.addButton}
		        >
		          <Text style={styles.addButtonText}>{isEn ? "+ New" : "+ Baru"}</Text>
		        </Pressable>
		      ) : null
		    }
		  />
		  <View key="bills-context" testID="finance-context-badge" style={styles.contextBadge}>
		    <Text style={styles.contextBadgeText}>
		      {activeContext.type === "household" ? (isEn ? "Household" : "Keluarga") : (isEn ? "Personal" : "Pribadi")}
		    </Text>
		  </View>

		  {showCreate && (
		    <View testID="bills-create-card" style={styles.createCard}>
		      <Text style={styles.createCardTitle}>{isEn ? "New Bill" : "Tagihan Baru"}</Text>
		      {/* Name */}
		      <TextInput
		        testID="bills-create-name-input"
		        style={styles.input}
		        placeholder={isEn ? "Bill name" : "Nama tagihan"}
		        placeholderTextColor={theme.colors.textMuted}
		        value={nameInput}
		        onChangeText={setNameInput}
		      />
		      {/* Amount */}
		      <TextInput
		        testID="bills-create-amount-input"
		        style={styles.input}
		        placeholder="Rp 0"
		        placeholderTextColor={theme.colors.textMuted}
		        keyboardType="numeric"
		        value={amountInput}
		        onChangeText={setAmountInput}
		      />
		      {/* Due day */}
		      <View style={styles.formRow}>
		        <Text style={styles.formLabel}>{isEn ? "Due day" : "Tanggal jatuh tempo"}</Text>
		        <TextInput
		          testID="bills-create-due-day-input"
		          style={[styles.input, styles.inputSmall]}
		          keyboardType="numeric"
		          value={dueDayInput}
		          onChangeText={setDueDayInput}
		          maxLength={2}
		        />
		      </View>
		      {/* Recurrence */}
		      <View style={styles.formRow}>
		        <Text style={styles.formLabel}>{isEn ? "Repeat" : "Ulangi"}</Text>
		        <View style={styles.chipRow}>
		          {(["monthly", "once"] as const).map((r) => (
		            <Pressable
		              key={r}
		              testID={`bills-create-recurrence-${r}`}
		              style={[styles.chip, recurrenceInput === r && styles.chipActive]}
		              onPress={() => setRecurrenceInput(r)}
		            >
		              <Text style={[styles.chipText, recurrenceInput === r && styles.chipActiveText]}>
		                {isEn ? (r === "monthly" ? "Monthly" : "Once") : (r === "monthly" ? "Bulanan" : "Sekali")}
		              </Text>
		            </Pressable>
		          ))}
		        </View>
		      </View>
		      {/* Notify */}
		      <View style={styles.formRow}>
		        <Text style={styles.formLabel}>{isEn ? "Remind me" : "Ingatkan"}</Text>
		        <View style={styles.chipRow}>
		          {[3, 1, 0].map((days) => (
		            <Pressable
		              key={days}
		              testID={`bills-create-notify-${days}`}
		              style={[styles.chip, notifyBeforeDays === days && styles.chipActive]}
		              onPress={() => setNotifyBeforeDays(days)}
		            >
		              <Text style={[styles.chipText, notifyBeforeDays === days && styles.chipActiveText]}>
		                {isEn
		                  ? (days === 3 ? "3d before" : days === 1 ? "1d before" : "On the day")
		                  : (days === 3 ? "H-3" : days === 1 ? "H-1" : "Hari H")}
		              </Text>
		            </Pressable>
		          ))}
		        </View>
		      </View>
		      {/* Actions */}
		      <View style={styles.formActions}>
		        <Pressable
		          testID="bills-create-cancel"
		          style={[styles.ctaButton, styles.ctaButtonOutline]}
		          onPress={resetCreateForm}
		        >
		          <Text style={styles.ctaButtonOutlineText}>{isEn ? "Cancel" : "Batal"}</Text>
		        </Pressable>
		        <Pressable
		          testID="bills-create-save"
		          style={[styles.ctaButton, styles.ctaButtonPrimary, savingBill && { opacity: 0.7 }]}
		          onPress={saveBill}
		          disabled={savingBill}
		        >
		          <Text style={styles.ctaButtonPrimaryText}>
		            {savingBill ? (isEn ? "Saving..." : "Menyimpan...") : (isEn ? "Save" : "Simpan")}
		          </Text>
		        </Pressable>
		      </View>
		    </View>
		  )}

		  {overdueCount > 0 && (
		    <View key="bills-overdue-alert" testID="bills-overdue-alert" style={styles.alertCard}>
		      <IconBubble name="bills" tone="danger" size={44} />
		      <View style={styles.alertContent}>
		        <Text style={styles.alertTitle}>
		          {isEn ? `${overdueCount} overdue bill${overdueCount > 1 ? "s" : ""}` : `Ada ${overdueCount} tagihan terlambat`}
		        </Text>
		        <Text style={styles.alertSub}>
		          {isEn ? "Pay soon to avoid late fees." : "Segera bayar untuk menghindari denda."}
		        </Text>
		      </View>
		    </View>
		  )}

		  <View key="bills-summary" testID="bills-summary" style={styles.summaryCard}>
		    <View style={styles.summaryRow}>
		      <View style={styles.summaryItem}>
		        <Text style={styles.summaryLabel}>{isEn ? "Bills This Month" : "Total Tagihan Bulan Ini"}</Text>
		        <Text style={styles.summaryValue}>
		          Rp {totalUpcoming.toLocaleString(isEn ? "en-US" : "id-ID")}
		        </Text>
		      </View>
		    </View>
		  </View>

			{loadError ? <StateMessage key="bills-error" message={loadError} tone="error" /> : null}

			<ScrollView
				key="bills-filter"
				testID="bills-filter"
				horizontal
				showsHorizontalScrollIndicator={false}
				contentContainerStyle={styles.filterRow}
			>
				{(["all", "upcoming", "overdue", "paid"] as FilterStatus[]).map((f) => (
				  <FilterChip
				    key={f}
				    label={
				      f === "all"
				        ? (isEn ? "All" : "Semua")
				        : f === "upcoming"
				          ? (isEn ? "Upcoming" : "Akan Datang")
				          : f === "overdue"
				            ? (isEn ? "Overdue" : "Terlambat")
				            : (isEn ? "Paid" : "Lunas")
				    }
				    selected={filter === f}
				    onPress={() => setFilter(f)}
				  />
				))}
			</ScrollView>
		</StaggeredStack>
	), [
		activeContext.type,
		canCreate,
		filter,
		loadError,
		overdueCount,
		styles,
		totalUpcoming,
	]);

	const ListEmpty = () => (
	  <EmptyState
	    icon="bills"
	    tone="accent"
	    title={isEn ? "No bills yet" : "Belum ada tagihan"}
	    description={isEn ? "Add recurring bills to get reminders." : "Tambahkan tagihan berulang untuk diingatkan."}
	  />
	);

	if (loading) {
	  return (
	    <View style={styles.screen}>
	      <LoadingState label={isEn ? "Loading bills..." : "Memuat tagihan..."} />
	    </View>
	  );
	}

	return (
		<PageEntrance testID="bills-page-entrance" style={styles.screen}>
			<FlatList
				data={filtered}
				renderItem={renderBill}
				keyExtractor={keyExtractor}
				ListHeaderComponent={listHeader}
				ListEmptyComponent={ListEmpty}
				ListFooterComponent={<View style={{ height: 100 }} />}
				contentContainerStyle={styles.content}
				showsVerticalScrollIndicator={false}
				initialNumToRender={10}
				maxToRenderPerBatch={10}
				windowSize={5}
				removeClippedSubviews
				refreshing={loading}
				onRefresh={loadBills}
				refreshControl={
					<RefreshControl
						refreshing={loading}
						onRefresh={loadBills}
						tintColor={theme.colors.brandPrimary}
					/>
				}
			/>
		</PageEntrance>
	);
}

function createStyles(theme: ReturnType<typeof useTheme>["theme"]) {
	return StyleSheet.create({
		screen: { flex: 1, backgroundColor: theme.colors.background },
		content: { padding: 20, gap: 10, paddingBottom: 26 },
		headerRow: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "flex-start",
		},
		title: {
			color: theme.colors.textPrimary,
			fontSize: 28,
			fontWeight: "800",
			letterSpacing: -0.4,
		},
		subtitle: { color: theme.colors.textSecondary, fontSize: 13, marginTop: 2 },
		addButton: {
			minHeight: 44,
			justifyContent: "center",
			backgroundColor: theme.colors.brandPrimary,
			borderRadius: 999,
			paddingHorizontal: 14,
			paddingVertical: 8,
		},
		addButtonText: {
			color: theme.colors.textInverse,
			fontSize: 12,
			fontWeight: "700",
		},
		contextBadge: {
			alignSelf: "flex-start",
			backgroundColor: theme.colors.mutedSurface,
			borderColor: theme.colors.borderSoft,
			borderRadius: 999,
			borderWidth: 1,
			paddingHorizontal: 10,
			paddingVertical: 5,
		},
		contextBadgeText: {
			color: theme.colors.textSecondary,
			fontSize: 12,
			fontWeight: "700",
		},
		alertCard: {
			backgroundColor: `${theme.colors.danger}10`,
			borderWidth: 1,
			borderColor: `${theme.colors.danger}40`,
			borderRadius: 16,
			padding: 14,
			flexDirection: "row",
			gap: 12,
			alignItems: "center",
		},
		alertContent: { flex: 1 },
		alertTitle: { color: theme.colors.danger, fontSize: 14, fontWeight: "800" },
		alertSub: { color: theme.colors.textSecondary, fontSize: 12, marginTop: 2 },
		summaryCard: {
			backgroundColor: theme.colors.surface,
			borderRadius: 18,
			borderWidth: 1,
			borderColor: theme.colors.borderSoft,
			padding: 16,
		},
		summaryRow: { gap: 8 },
		summaryItem: { gap: 4 },
		summaryLabel: {
			color: theme.colors.textSecondary,
			fontSize: 12,
			fontWeight: "600",
		},
		summaryValue: {
			color: theme.colors.textPrimary,
			fontSize: 22,
			fontWeight: "800",
		},
		filterRow: { gap: 8, paddingVertical: 2 },
		filterChip: {
			paddingHorizontal: 14,
			paddingVertical: 8,
			borderRadius: 999,
			borderWidth: 1,
			borderColor: theme.colors.borderSoft,
			backgroundColor: theme.colors.surface,
		},
		filterChipText: {
			color: theme.colors.textSecondary,
			fontSize: 12,
			fontWeight: "700",
		},
		billCard: {
			backgroundColor: theme.colors.surface,
			borderRadius: 18,
			borderWidth: 1,
			borderColor: theme.colors.borderSoft,
			padding: 14,
			gap: 12,
		},
		billTop: { flexDirection: "row", alignItems: "flex-start" },
		billLeft: {
			flexDirection: "row",
			alignItems: "flex-start",
			gap: 12,
			flex: 1,
		},
		billName: {
			color: theme.colors.textPrimary,
			fontSize: 14,
			fontWeight: "700",
		},
		billDue: { color: theme.colors.textMuted, fontSize: 12, marginTop: 2 },
		statusBadge: {
			borderWidth: 1,
			borderRadius: 999,
			paddingHorizontal: 10,
			paddingVertical: 4,
		},
		statusBadgeText: { fontSize: 11, fontWeight: "700" },
		billBottom: {
			flexDirection: "row",
			justifyContent: "space-between",
			alignItems: "center",
			flexWrap: "wrap",
			borderTopWidth: 1,
			borderTopColor: theme.colors.borderSoft,
			paddingTop: 10,
		},
		billAmount: {
			color: theme.colors.textPrimary,
			fontSize: 16,
			fontWeight: "800",
		},
		payButton: {
			backgroundColor: theme.colors.brandPrimary,
			borderRadius: 999,
			paddingHorizontal: 12,
			paddingVertical: 6,
		},
		payButtonText: {
			color: theme.colors.textInverse,
			fontSize: 11,
			fontWeight: "700",
		},
		emptyCard: {
			backgroundColor: theme.colors.surface,
			borderRadius: 18,
			borderWidth: 1,
			borderColor: theme.colors.borderSoft,
			borderStyle: "dashed",
			padding: 24,
			alignItems: "center",
			gap: 8,
		},
		emptyTitle: {
			color: theme.colors.textPrimary,
			fontSize: 15,
			fontWeight: "800",
		},
		emptySub: {
		  color: theme.colors.textMuted,
		  fontSize: 13,
		  textAlign: "center",
		  lineHeight: 20,
		},
		// --- Create bill form styles ---
		createCard: {
		  backgroundColor: theme.colors.surface,
		  borderRadius: 18,
		  borderWidth: 1,
		  borderColor: theme.colors.borderSoft,
		  padding: 16,
		  gap: 12,
		  marginBottom: 4,
		},
		createCardTitle: {
		  color: theme.colors.textPrimary,
		  fontSize: 16,
		  fontWeight: "800",
		  marginBottom: 2,
		},
		input: {
		  backgroundColor: theme.colors.background,
		  borderWidth: 1,
		  borderColor: theme.colors.borderSoft,
		  borderRadius: 12,
		  paddingHorizontal: 14,
		  paddingVertical: 10,
		  fontSize: 14,
		  color: theme.colors.textPrimary,
		},
		inputSmall: { width: 70, textAlign: "center" },
		formRow: { gap: 6 },
		formLabel: {
		  color: theme.colors.textSecondary,
		  fontSize: 13,
		  fontWeight: "600",
		},
		chipRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
		chip: {
		  borderWidth: 1,
		  borderColor: theme.colors.borderSoft,
		  borderRadius: 999,
		  paddingHorizontal: 14,
		  paddingVertical: 7,
		},
		chipActive: {
		  borderColor: theme.colors.brandPrimary,
		  backgroundColor: `${theme.colors.brandPrimary}15`,
		},
		chipText: { color: theme.colors.textSecondary, fontSize: 13, fontWeight: "600" },
		chipActiveText: { color: theme.colors.brandPrimary },
		formActions: {
		  flexDirection: "row",
		  gap: 10,
		  justifyContent: "flex-end",
		  marginTop: 4,
		},
		ctaButton: {
		  borderRadius: 999,
		  paddingHorizontal: 20,
		  paddingVertical: 10,
		  minHeight: 44,
		  justifyContent: "center",
		  alignItems: "center",
		},
		ctaButtonPrimary: {
		  backgroundColor: theme.colors.brandPrimary,
		},
		ctaButtonOutline: {
		  borderWidth: 1,
		  borderColor: theme.colors.borderSoft,
		},
		ctaButtonPrimaryText: {
		  color: theme.colors.textInverse,
		  fontSize: 14,
		  fontWeight: "700",
		},
		ctaButtonOutlineText: {
		  color: theme.colors.textSecondary,
		  fontSize: 14,
		  fontWeight: "600",
		},
		});
}
