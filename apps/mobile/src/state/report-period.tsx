import AsyncStorage from "@react-native-async-storage/async-storage";
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";

import { useSupabase } from "../lib/supabase";
import { useFinanceContext } from "./finance-context";

export type ReportPeriodPreset = "month" | "3month" | "6month" | "year";
export type ReportPeriodType = ReportPeriodPreset | "custom" | "saved_rule";
export type ReportPeriod = {
	type: ReportPeriodType;
	startDate: string;
	endDate: string;
	ruleId?: string;
	ruleName?: string;
};

export type SavedReportPeriodRule = {
	id: string;
	name: string;
	type: "monthly_cycle";
	startDay: number;
	endDay: number;
	createdAt?: string;
	updatedAt?: string;
};

type ActiveReportPeriodSelection =
	| { type: "preset"; preset: ReportPeriodPreset }
	| { type: "custom"; startDate: string; endDate: string }
	| { type: "saved_rule"; ruleId: string };

type Locale = "id" | "en";

type ReportPeriodContextValue = {
	activePeriod: ReportPeriod;
	activeSelection: ActiveReportPeriodSelection;
	savedRules: SavedReportPeriodRule[];
	setActivePeriod: (period: ReportPeriod) => void;
	resetToCurrentMonth: () => void;
	saveMonthlyCycleRule: (input: {
		name: string;
		startDay: number;
		endDay: number;
	}) => SavedReportPeriodRule;
	updateSavedRule: (ruleId: string, input: { name: string }) => void;
	deleteSavedRule: (ruleId: string) => void;
	selectSavedRule: (ruleId: string) => void;
};

const ReportPeriodContext = createContext<ReportPeriodContextValue | null>(null);
const STORAGE_PREFIX = "kaswise:report-period";

function pad2(value: number) {
	return String(value).padStart(2, "0");
}

export function dateKey(year: number, month: number, day: number) {
	return `${year}-${pad2(month)}-${pad2(day)}`;
}

export function parseDateKey(value: string) {
	const [yearText, monthText, dayText] = value.slice(0, 10).split("-");
	return {
		year: Number(yearText),
		month: Number(monthText),
		day: Number(dayText),
	};
}

function daysInMonth(year: number, month: number) {
	return new Date(year, month, 0).getDate();
}

function clampDay(year: number, month: number, day: number) {
	return Math.min(Math.max(1, day), daysInMonth(year, month));
}

function addMonths(year: number, month: number, offset: number) {
	const value = new Date(year, month - 1 + offset, 1);
	return { year: value.getFullYear(), month: value.getMonth() + 1 };
}

function newId() {
	const cryptoValue = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
	if (cryptoValue?.randomUUID) return cryptoValue.randomUUID();
	return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
		const random = Math.floor(Math.random() * 16);
		const value = char === "x" ? random : (random & 0x3) | 0x8;
		return value.toString(16);
	});
}

export function buildReportPeriod(type: ReportPeriodPreset, referenceDate = new Date()): ReportPeriod {
	const year = referenceDate.getFullYear();
	const monthIndex = referenceDate.getMonth();
	const end = new Date(year, monthIndex + 1, 0);
	let start: Date;

	if (type === "3month") start = new Date(year, monthIndex - 2, 1);
	else if (type === "6month") start = new Date(year, monthIndex - 5, 1);
	else if (type === "year") start = new Date(year, monthIndex - 11, 1);
	else start = new Date(year, monthIndex, 1);

	return {
		type,
		startDate: dateKey(start.getFullYear(), start.getMonth() + 1, start.getDate()),
		endDate: dateKey(end.getFullYear(), end.getMonth() + 1, end.getDate()),
	};
}

export function buildCustomReportPeriod(startDate: string, endDate: string): ReportPeriod {
	return { type: "custom", startDate, endDate };
}

export function buildSavedRuleReportPeriod(rule: SavedReportPeriodRule, referenceDate = new Date()): ReportPeriod {
	const anchorYear = referenceDate.getFullYear();
	const anchorMonth = referenceDate.getMonth() + 1;
	const today = referenceDate.getDate();
	const crossesMonth = rule.startDay > rule.endDay;
	let startYear = anchorYear;
	let startMonth = anchorMonth;
	let endYear = anchorYear;
	let endMonth = anchorMonth;

	if (crossesMonth) {
		if (today <= rule.endDay) {
			const startParts = addMonths(anchorYear, anchorMonth, -1);
			startYear = startParts.year;
			startMonth = startParts.month;
		} else {
			const endParts = addMonths(anchorYear, anchorMonth, 1);
			endYear = endParts.year;
			endMonth = endParts.month;
		}
	} else if (today < rule.startDay) {
		const previous = addMonths(anchorYear, anchorMonth, -1);
		startYear = previous.year;
		startMonth = previous.month;
		endYear = previous.year;
		endMonth = previous.month;
	}

	return {
		type: "saved_rule",
		ruleId: rule.id,
		ruleName: rule.name,
		startDate: dateKey(startYear, startMonth, clampDay(startYear, startMonth, rule.startDay)),
		endDate: dateKey(endYear, endMonth, clampDay(endYear, endMonth, rule.endDay)),
	};
}

export function isDateInReportPeriod(value: string | null | undefined, period: ReportPeriod) {
	const key = value ? String(value).slice(0, 10) : "";
	return Boolean(key && key >= period.startDate && key <= period.endDate);
}

export function isCurrentMonthPeriod(period: ReportPeriod, referenceDate = new Date()) {
	const current = buildReportPeriod("month", referenceDate);
	return period.type === "month" && period.startDate === current.startDate && period.endDate === current.endDate;
}

function monthName(month: number, locale: Locale) {
	return (locale === "en"
		? ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
		: ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"])[month - 1];
}

export function formatReportPeriodLabel(period: ReportPeriod, locale: Locale) {
	const start = parseDateKey(period.startDate);
	const end = parseDateKey(period.endDate);
	if (period.type === "month" && start.year === end.year && start.month === end.month) {
		return `${monthName(start.month, locale)} ${start.year}`;
	}
	if (start.year === end.year && start.month === end.month) {
		return `${start.day}–${end.day} ${monthName(start.month, locale)} ${start.year}`;
	}
	if (start.year === end.year) {
		return `${start.day} ${monthName(start.month, locale)} – ${end.day} ${monthName(end.month, locale)} ${start.year}`;
	}
	return `${start.day} ${monthName(start.month, locale)} ${start.year} – ${end.day} ${monthName(end.month, locale)} ${end.year}`;
}

export function formatSavedRuleSummary(rule: SavedReportPeriodRule, locale: Locale) {
	return locale === "en"
		? `Monthly cycle, day ${rule.startDay}–${rule.endDay}`
		: `Siklus bulanan, tanggal ${rule.startDay}–${rule.endDay}`;
}

function selectionFromPeriod(period: ReportPeriod): ActiveReportPeriodSelection {
	if (period.type === "custom") {
		return { type: "custom", startDate: period.startDate, endDate: period.endDate };
	}
	if (period.type === "saved_rule" && period.ruleId) {
		return { type: "saved_rule", ruleId: period.ruleId };
	}
	return { type: "preset", preset: period.type as ReportPeriodPreset };
}

function periodFromSelection(selection: ActiveReportPeriodSelection, rules: SavedReportPeriodRule[]) {
	if (selection.type === "custom") return buildCustomReportPeriod(selection.startDate, selection.endDate);
	if (selection.type === "saved_rule") {
		const rule = rules.find((item) => item.id === selection.ruleId);
		if (rule) return buildSavedRuleReportPeriod(rule);
	}
	return buildReportPeriod(selection.type === "preset" ? selection.preset : "month");
}

function isValidRule(value: unknown): value is SavedReportPeriodRule {
	const rule = value as SavedReportPeriodRule;
	return Boolean(
		rule &&
		typeof rule.id === "string" &&
		typeof rule.name === "string" &&
		rule.type === "monthly_cycle" &&
		Number.isFinite(rule.startDay) &&
		Number.isFinite(rule.endDay),
	);
}

function normalizeRuleRow(row: any): SavedReportPeriodRule | null {
	const rule = {
		id: String(row?.id ?? ""),
		name: String(row?.name ?? ""),
		type: "monthly_cycle" as const,
		startDay: Number(row?.start_day ?? row?.startDay),
		endDay: Number(row?.end_day ?? row?.endDay),
		createdAt: row?.created_at ?? row?.createdAt,
		updatedAt: row?.updated_at ?? row?.updatedAt,
	};
	return isValidRule(rule) ? rule : null;
}

function normalizeSelection(value: any): ActiveReportPeriodSelection | null {
	const type = value?.type ?? value?.active_type;
	if (type === "preset") {
		const preset = value?.preset ?? value?.preset_type;
		return ["month", "3month", "6month", "year"].includes(preset)
			? { type: "preset", preset }
			: null;
	}
	if (type === "custom") {
		const startDate = value?.startDate ?? value?.custom_start_date;
		const endDate = value?.endDate ?? value?.custom_end_date;
		return typeof startDate === "string" && typeof endDate === "string"
			? { type: "custom", startDate, endDate }
			: null;
	}
	if (type === "saved_rule") {
		const ruleId = value?.ruleId ?? value?.active_rule_id;
		return typeof ruleId === "string" ? { type: "saved_rule", ruleId } : null;
	}
	return null;
}

function reportPeriodContextKey(activeContext: ReturnType<typeof useFinanceContext>["activeContext"]) {
	return activeContext.type === "household" ? `household:${activeContext.householdId}` : "personal";
}

function contextStorageKey(userId: string, activeContext: ReturnType<typeof useFinanceContext>["activeContext"]) {
	return `${STORAGE_PREFIX}:${userId}:${reportPeriodContextKey(activeContext)}`;
}

async function maybeLoadRemote(supabase: any, userId: string, activeContext: ReturnType<typeof useFinanceContext>["activeContext"]) {
	if (typeof supabase?.from !== "function") return null;
	try {
		let rulesQuery = supabase.from("report_period_rules").select("*");
		let prefQuery = supabase.from("report_period_preferences").select("*");
		if (typeof rulesQuery?.match !== "function" || typeof prefQuery?.match !== "function") {
			return null;
		}
		rulesQuery = rulesQuery.match({ user_id: userId });
		prefQuery = prefQuery.match({ user_id: userId, context_key: reportPeriodContextKey(activeContext) });
		if (activeContext.type === "household") {
			rulesQuery = rulesQuery.match({ household_id: activeContext.householdId });
			prefQuery = prefQuery.match({ household_id: activeContext.householdId });
		} else {
			rulesQuery = rulesQuery.is("household_id", null);
			prefQuery = prefQuery.is("household_id", null);
		}
		const [rulesResult, prefResult] = await Promise.all([rulesQuery, prefQuery]);
		const rules = Array.isArray(rulesResult?.data)
			? rulesResult.data.map(normalizeRuleRow).filter(Boolean) as SavedReportPeriodRule[]
			: [];
		const selection = Array.isArray(prefResult?.data)
			? normalizeSelection(prefResult.data[0])
			: null;
		return { rules, selection };
	} catch {
		return null;
	}
}

function serializeSelection(selection: ActiveReportPeriodSelection) {
	return selection;
}

async function maybeDeleteRemoteRule(supabase: any, ruleId: string) {
	if (typeof supabase?.from !== "function") return;
	try {
		const table = supabase.from("report_period_rules");
		if (typeof table?.delete === "function") {
			await table.delete().eq("id", ruleId);
		}
	} catch {
		// Local storage keeps the app functional if the backend delete is unavailable.
	}
}

async function maybeSaveRemote(
	supabase: any,
	userId: string,
	activeContext: ReturnType<typeof useFinanceContext>["activeContext"],
	rules: SavedReportPeriodRule[],
	selection: ActiveReportPeriodSelection,
) {
	if (typeof supabase?.from !== "function") return;
	try {
		const householdId = activeContext.type === "household" ? activeContext.householdId : null;
		const rulesTable = supabase.from("report_period_rules");
		if (typeof rulesTable?.upsert === "function") {
			await rulesTable.upsert(
				rules.map((rule) => ({
					id: rule.id,
					user_id: userId,
					household_id: householdId,
					name: rule.name,
					rule_type: rule.type,
					start_day: rule.startDay,
					end_day: rule.endDay,
				})),
			);
		}
		const preferencesTable = supabase.from("report_period_preferences");
		if (typeof preferencesTable?.upsert === "function") {
			await preferencesTable.upsert({
				user_id: userId,
				household_id: householdId,
				context_type: activeContext.type,
				context_key: reportPeriodContextKey(activeContext),
				active_type: selection.type,
				preset_type: selection.type === "preset" ? selection.preset : null,
				active_rule_id: selection.type === "saved_rule" ? selection.ruleId : null,
				custom_start_date: selection.type === "custom" ? selection.startDate : null,
				custom_end_date: selection.type === "custom" ? selection.endDate : null,
			}, { onConflict: "user_id,context_key" });
		}
	} catch {
		// Local storage keeps the app functional if the backend migration is not present yet.
	}
}

export function ReportPeriodProvider({ children }: { children: React.ReactNode }) {
	const { supabase } = useSupabase();
	const { activeContext } = useFinanceContext();
	const [savedRules, setSavedRules] = useState<SavedReportPeriodRule[]>([]);
	const [activeSelection, setActiveSelection] = useState<ActiveReportPeriodSelection>({
		type: "preset",
		preset: "month",
	});
	const scopeRef = useRef<{ userId: string; storageKey: string } | null>(null);
	const rulesRef = useRef(savedRules);
	const selectionRef = useRef(activeSelection);

	useEffect(() => {
		rulesRef.current = savedRules;
	}, [savedRules]);
	useEffect(() => {
		selectionRef.current = activeSelection;
	}, [activeSelection]);

	useEffect(() => {
		let cancelled = false;
		async function load() {
			try {
				const { data: { user } } = await supabase.auth.getUser();
				if (!user?.id || cancelled) return;
				const storageKey = contextStorageKey(user.id, activeContext);
				scopeRef.current = { userId: user.id, storageKey };
				const localRaw = await AsyncStorage.getItem(storageKey).catch(() => null);
				let nextRules: SavedReportPeriodRule[] = [];
				let nextSelection: ActiveReportPeriodSelection | null = null;
				if (localRaw) {
					try {
						const parsed = JSON.parse(localRaw);
						nextRules = Array.isArray(parsed?.rules)
							? parsed.rules.filter(isValidRule)
							: [];
						nextSelection = normalizeSelection(parsed?.selection);
					} catch {
						// ignore malformed local cache
					}
				}
				const remote = await maybeLoadRemote(supabase, user.id, activeContext);
				if (remote?.rules.length) nextRules = remote.rules;
				if (remote?.selection) nextSelection = remote.selection;
				if (cancelled) return;
				setSavedRules(nextRules);
				setActiveSelection(nextSelection ?? { type: "preset", preset: "month" });
			} catch {
				// keep default month period
			}
		}
		void load();
		return () => {
			cancelled = true;
		};
	}, [activeContext, supabase]);

	const persist = useCallback((rules: SavedReportPeriodRule[], selection: ActiveReportPeriodSelection) => {
		const scope = scopeRef.current;
		if (!scope) return;
		const payload = JSON.stringify({ rules, selection: serializeSelection(selection) });
		void AsyncStorage.setItem(scope.storageKey, payload).catch(() => undefined);
		void maybeSaveRemote(supabase, scope.userId, activeContext, rules, selection);
	}, [activeContext, supabase]);

	const setSelectionAndPersist = useCallback((selection: ActiveReportPeriodSelection) => {
		setActiveSelection(selection);
		selectionRef.current = selection;
		persist(rulesRef.current, selection);
	}, [persist]);

	const setActivePeriod = useCallback((period: ReportPeriod) => {
		setSelectionAndPersist(selectionFromPeriod(period));
	}, [setSelectionAndPersist]);

	const resetToCurrentMonth = useCallback(() => {
		setSelectionAndPersist({ type: "preset", preset: "month" });
	}, [setSelectionAndPersist]);

	const saveMonthlyCycleRule = useCallback((input: { name: string; startDay: number; endDay: number }) => {
		const now = new Date().toISOString();
		const rule: SavedReportPeriodRule = {
			id: newId(),
			name: input.name.trim() || `Siklus ${input.startDay}–${input.endDay}`,
			type: "monthly_cycle",
			startDay: input.startDay,
			endDay: input.endDay,
			createdAt: now,
			updatedAt: now,
		};
		const nextRules = [...rulesRef.current, rule];
		const nextSelection: ActiveReportPeriodSelection = { type: "saved_rule", ruleId: rule.id };
		setSavedRules(nextRules);
		setActiveSelection(nextSelection);
		rulesRef.current = nextRules;
		selectionRef.current = nextSelection;
		persist(nextRules, nextSelection);
		return rule;
	}, [persist]);

	const updateSavedRule = useCallback((ruleId: string, input: { name: string }) => {
		const nextName = input.name.trim();
		if (!nextName) return;
		const now = new Date().toISOString();
		const nextRules = rulesRef.current.map((rule) =>
			rule.id === ruleId ? { ...rule, name: nextName, updatedAt: now } : rule,
		);
		setSavedRules(nextRules);
		rulesRef.current = nextRules;
		persist(nextRules, selectionRef.current);
	}, [persist]);

	const deleteSavedRule = useCallback((ruleId: string) => {
		const nextRules = rulesRef.current.filter((rule) => rule.id !== ruleId);
		const nextSelection =
			selectionRef.current.type === "saved_rule" && selectionRef.current.ruleId === ruleId
				? { type: "preset", preset: "month" } as ActiveReportPeriodSelection
				: selectionRef.current;
		setSavedRules(nextRules);
		setActiveSelection(nextSelection);
		rulesRef.current = nextRules;
		selectionRef.current = nextSelection;
		persist(nextRules, nextSelection);
		void maybeDeleteRemoteRule(supabase, ruleId);
	}, [persist, supabase]);

	const selectSavedRule = useCallback((ruleId: string) => {
		setSelectionAndPersist({ type: "saved_rule", ruleId });
	}, [setSelectionAndPersist]);

	const activePeriod = useMemo(() => periodFromSelection(activeSelection, savedRules), [activeSelection, savedRules]);

	const value = useMemo<ReportPeriodContextValue>(() => ({
		activePeriod,
		activeSelection,
		savedRules,
		setActivePeriod,
		resetToCurrentMonth,
		saveMonthlyCycleRule,
		updateSavedRule,
		deleteSavedRule,
		selectSavedRule,
	}), [
		activePeriod,
		activeSelection,
		resetToCurrentMonth,
		savedRules,
		saveMonthlyCycleRule,
		updateSavedRule,
		deleteSavedRule,
		selectSavedRule,
		setActivePeriod,
	]);

	return <ReportPeriodContext.Provider value={value}>{children}</ReportPeriodContext.Provider>;
}

export function useReportPeriod() {
	const context = useContext(ReportPeriodContext);
	if (!context) {
		throw new Error("useReportPeriod must be used within ReportPeriodProvider");
	}
	return context;
}
