import {
	addDoc,
	collection,
	collectionGroup,
	deleteDoc,
	doc,
	documentId,
	getDoc,
	getDocs,
	increment,
	limit,
	orderBy,
	query,
	runTransaction,
	setDoc,
	updateDoc,
	where,
	type QueryConstraint,
} from "firebase/firestore";
import type { User as FirebaseUser } from "firebase/auth";
import {
	type BillFormData,
	type BillReminder,
	type Budget,
	type BudgetFormData,
	type Category,
	type PlanType,
	type Transaction,
	type TransactionFormData,
	type TransactionType,
	type User,
	type Wallet,
} from "@catat-in/shared/types";
import { auth, currentAuthUser } from "./firebase";
import { db } from "./firebase-db";

type BillRecurrence = BillReminder["recurrence"];

export interface TransactionFilters {
	type?: "income" | "expense";
	category?: string;
	wallet_id?: string;
	date_from?: string;
	date_to?: string;
	page?: number;
	per_page?: number;
}

const DEFAULT_CATEGORIES: Array<Omit<Category, "id">> = [
	{
		name: "food",
		label: "Makan & Minum",
		type: "expense",
		icon: "🍔",
		is_default: true,
	},
	{
		name: "transport",
		label: "Transportasi",
		type: "expense",
		icon: "🚗",
		is_default: true,
	},
	{
		name: "shopping",
		label: "Belanja",
		type: "expense",
		icon: "🛒",
		is_default: true,
	},
	{
		name: "health",
		label: "Kesehatan",
		type: "expense",
		icon: "💊",
		is_default: true,
	},
	{
		name: "entertainment",
		label: "Hiburan",
		type: "expense",
		icon: "🎬",
		is_default: true,
	},
	{
		name: "education",
		label: "Pendidikan",
		type: "expense",
		icon: "📚",
		is_default: true,
	},
	{
		name: "housing",
		label: "Rumah",
		type: "expense",
		icon: "🏠",
		is_default: true,
	},
	{
		name: "other",
		label: "Lainnya",
		type: "expense",
		icon: "📦",
		is_default: true,
	},
	{
		name: "salary",
		label: "Gaji",
		type: "income",
		icon: "💼",
		is_default: true,
	},
	{
		name: "freelance",
		label: "Freelance",
		type: "income",
		icon: "💻",
		is_default: true,
	},
	{
		name: "investment",
		label: "Investasi",
		type: "income",
		icon: "📈",
		is_default: true,
	},
	{
		name: "other",
		label: "Lainnya",
		type: "income",
		icon: "📦",
		is_default: true,
	},
];

function isoNow() {
	return new Date().toISOString();
}

function toIsoString(value: unknown, fallback = isoNow()): string {
	if (typeof value === "string") return value;
	if (value instanceof Date) return value.toISOString();
	if (value && typeof value === "object") {
		const maybeTimestamp = value as { toDate?: () => Date };
		if (typeof maybeTimestamp.toDate === "function") {
			return maybeTimestamp.toDate().toISOString();
		}
	}
	return fallback;
}

function toDateOnlyString(
	value: unknown,
	fallback = new Date().toISOString().split("T")[0],
): string {
	const iso = toIsoString(value, `${fallback}T00:00:00.000Z`);
	return iso.split("T")[0] || fallback;
}

function startOfMonth(date = new Date()) {
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;
}

function sanitizeForFirestore<T>(value: T): T {
	if (Array.isArray(value)) {
		return value
			.map((item) => sanitizeForFirestore(item))
			.filter((item) => item !== undefined) as T;
	}

	if (value && typeof value === "object") {
		const next: Record<string, unknown> = {};
		Object.entries(value as Record<string, unknown>).forEach(([key, item]) => {
			if (item === undefined) return;
			next[key] = sanitizeForFirestore(item);
		});
		return next as T;
	}

	return value;
}

function slugifyCategoryName(value: string) {
	return value
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "_")
		.replace(/^_+|_+$/g, "");
}

function usersDoc(uid: string) {
	return doc(db, "users", uid);
}

function usersCollection(
	uid: string,
	name:
		| "wallets"
		| "transactions"
		| "budgets"
		| "bills"
		| "categories"
		| "saved_views"
		| "savings_goals",
) {
	return collection(db, "users", uid, name);
}

export function requireAuthUid() {
	const uid = auth.currentUser?.uid || currentAuthUser?.uid;
	if (!uid) throw new Error("Sesi login tidak ditemukan. Silakan login ulang.");
	return uid;
}

export async function ensureUserProfileFromAuth(
	firebaseUser: FirebaseUser,
): Promise<User> {
	const uid = firebaseUser.uid;
	const profileRef = usersDoc(uid);
	const snapshot = await getDoc(profileRef);
	const existing = snapshot.exists()
		? (snapshot.data() as Partial<User>)
		: null;

	const fullName =
		firebaseUser.displayName?.trim() ||
		existing?.full_name ||
		firebaseUser.email?.split("@")[0] ||
		"Pengguna";

	const profile: User = {
		id: uid,
		email: firebaseUser.email || existing?.email || "",
		full_name: fullName,
		avatar_url: firebaseUser.photoURL || existing?.avatar_url,
		plan_type: (existing?.plan_type as PlanType) || "free",
		plan_expires_at: existing?.plan_expires_at,
		group_id: existing?.group_id,
		created_at: existing?.created_at || isoNow(),
	};

	await setDoc(profileRef, sanitizeForFirestore(profile), { merge: true });
	await ensureDefaultCategories(uid);
	return profile;
}

export async function getUserProfile(uid: string): Promise<User | null> {
	const snapshot = await getDoc(usersDoc(uid));
	if (!snapshot.exists()) return null;
	return snapshot.data() as User;
}

export async function ensureDefaultCategories(uid: string) {
	const categoryRef = usersCollection(uid, "categories");
	const existing = await getDocs(query(categoryRef));
	if (!existing.empty) return;

	await Promise.all(
		DEFAULT_CATEGORIES.map((item) => {
			const id = `${item.type}-${item.name}`;
			return setDoc(
				doc(db, "users", uid, "categories", id),
				sanitizeForFirestore({ ...item, id }),
			);
		}),
	);
}

export async function listCategories(
	uid: string,
	type?: TransactionType,
): Promise<Category[]> {
	await ensureDefaultCategories(uid);
	const constraints: QueryConstraint[] = [];
	if (type) constraints.push(where("type", "==", type));

	const snapshot = await getDocs(
		query(usersCollection(uid, "categories"), ...constraints),
	);
	const rows = snapshot.docs.map((item) => ({
		id: item.id,
		...(item.data() as Omit<Category, "id">),
	}));
	return rows.sort((a, b) => (a.label || "").localeCompare(b.label || ""));
}

export async function createCategory(
	uid: string,
	payload: { name: string; type: TransactionType; icon?: string | null },
): Promise<Category> {
	const normalized = slugifyCategoryName(payload.name);
	if (!normalized) throw new Error("Nama kategori tidak valid.");

	const existing = await getDocs(query(usersCollection(uid, "categories")));
	const duplicate = existing.docs.some((docSnap) => {
		const data = docSnap.data() as Partial<Category>;
		return data.type === payload.type && data.name === normalized;
	});

	if (duplicate) throw new Error("Kategori dengan nama ini sudah ada.");

	const label = payload.name.trim().replace(/\s+/g, " ");
	const docRef = await addDoc(
		usersCollection(uid, "categories"),
		sanitizeForFirestore({
			name: normalized,
			label,
			type: payload.type,
			icon: payload.icon || null,
			is_default: false,
		}),
	);

	return {
		id: docRef.id,
		name: normalized,
		label,
		type: payload.type,
		icon: payload.icon || null,
		is_default: false,
	};
}

export async function removeCategory(
	uid: string,
	categoryId: string,
): Promise<void> {
	const ref = doc(db, "users", uid, "categories", categoryId);
	const snapshot = await getDoc(ref);
	if (!snapshot.exists()) return;
	const category = snapshot.data() as Category;
	if (category.is_default)
		throw new Error("Kategori bawaan tidak dapat dihapus.");
	await deleteDoc(ref);
}

export async function listWallets(uid: string): Promise<Wallet[]> {
	const snapshot = await getDocs(
		query(usersCollection(uid, "wallets"), orderBy("created_at", "desc")),
	);
	return snapshot.docs.map((item) => {
		const value = item.data() as Omit<Wallet, "id">;
		return {
			id: item.id,
			...value,
			balance: Number(value.balance || 0),
			currency: value.currency || "IDR",
			is_shared: Boolean(value.is_shared),
			is_active: value.is_active ?? true,
		};
	});
}

export async function addWallet(
	uid: string,
	payload: {
		name: string;
		type: "bank" | "ewallet" | "cash" | "investment";
		balance: number;
		bank_name?: string;
		account_number?: string;
	},
): Promise<Wallet> {
	const record: Omit<Wallet, "id"> = {
		user_id: uid,
		name: payload.name.trim(),
		type: payload.type,
		balance: Number(payload.balance || 0),
		currency: "IDR",
		bank_name: payload.bank_name?.trim() || undefined,
		account_number: payload.account_number?.trim() || undefined,
		is_shared: false,
		group_id: undefined,
		is_active: true,
		created_at: isoNow(),
	};
	const docRef = await addDoc(
		usersCollection(uid, "wallets"),
		sanitizeForFirestore(record),
	);
	return { id: docRef.id, ...record };
}

export async function patchWallet(
	uid: string,
	walletId: string,
	patch: Partial<{
		name: string;
		type: "bank" | "ewallet" | "cash" | "investment";
		balance: number;
		bank_name?: string;
		account_number?: string;
	}>,
) {
	const payload: Record<string, unknown> = {};
	if (typeof patch.name === "string") payload.name = patch.name.trim();
	if (patch.type) payload.type = patch.type;
	if (typeof patch.balance === "number") payload.balance = patch.balance;
	if (typeof patch.bank_name === "string")
		payload.bank_name = patch.bank_name.trim();
	if (typeof patch.account_number === "string")
		payload.account_number = patch.account_number.trim();
	await updateDoc(
		doc(db, "users", uid, "wallets", walletId),
		sanitizeForFirestore(payload),
	);
}

export async function removeWallet(uid: string, walletId: string) {
	await deleteDoc(doc(db, "users", uid, "wallets", walletId));
}

function applyTransactionFilters(
	items: Transaction[],
	filters: TransactionFilters,
) {
	return items.filter((item) => {
		if (filters.type && item.type !== filters.type) return false;
		if (filters.category && item.category !== filters.category) return false;
		if (filters.wallet_id && item.wallet_id !== filters.wallet_id) return false;
		if (filters.date_from && item.date < filters.date_from) return false;
		if (filters.date_to && item.date > filters.date_to) return false;
		return true;
	});
}

function toTransaction(item: {
	id: string;
	data: Record<string, any>;
}): Transaction {
	return {
		id: item.id,
		wallet_id: item.data.wallet_id,
		user_id: item.data.user_id,
		type: item.data.type,
		amount: Number(item.data.amount || 0),
		category: item.data.category,
		note: item.data.note,
		merchant: item.data.merchant,
		date: toDateOnlyString(item.data.date),
		receipt_url: item.data.receipt_url,
		is_shared: Boolean(item.data.is_shared),
		visibility: item.data.visibility || "private",
		group_id: item.data.group_id,
		on_behalf_of: item.data.on_behalf_of,
		created_by: item.data.created_by || item.data.user_id,
		is_disputed: Boolean(item.data.is_disputed),
		dispute_resolved_at: item.data.dispute_resolved_at,
		created_at: toIsoString(item.data.created_at),
	};
}

function signedAmount(type: TransactionType, amount: number) {
	return type === "income" ? amount : -amount;
}

async function applyWalletDelta(uid: string, walletId: string, delta: number) {
	if (!walletId || delta === 0) return;
	const walletRef = doc(db, "users", uid, "wallets", walletId);
	await runTransaction(db, async (transaction) => {
		const walletSnap = await transaction.get(walletRef);
		if (!walletSnap.exists()) throw new Error("Wallet tidak ditemukan.");
		transaction.update(walletRef, { balance: increment(delta) });
	});
}

async function getMyActiveGroupRoles(
	uid: string,
): Promise<Map<string, string>> {
	const rows = await getDocs(
		query(collection(db, "group_members"), where("user_id", "==", uid)),
	);
	const map = new Map<string, string>();
	rows.docs.forEach((docSnap) => {
		const data = docSnap.data() as Record<string, string>;
		if (data.status === "active" && data.group_id)
			map.set(data.group_id, data.role || "viewer");
	});
	return map;
}

export async function listTransactions(
	uid: string,
	filters: TransactionFilters,
): Promise<{ data: Transaction[]; total: number }> {
	const ownSnapshot = await getDocs(
		query(usersCollection(uid, "transactions"), orderBy("date", "desc")),
	);
	const own = ownSnapshot.docs.map((item) =>
		toTransaction({ id: item.id, data: item.data() as Record<string, any> }),
	);

	const sharedRows: Transaction[] = [];
	try {
		const groupRoles = await getMyActiveGroupRoles(uid);
		const groupIds = Array.from(groupRoles.keys());

		await Promise.all(
			groupIds.map(async (groupId) => {
				try {
					const snap = await getDocs(
						query(
							collectionGroup(db, "transactions"),
							where("group_id", "==", groupId),
							where("is_shared", "==", true),
						),
					);
					snap.docs.forEach((docSnap) => {
						const tx = toTransaction({
							id: docSnap.id,
							data: docSnap.data() as Record<string, any>,
						});
						if (tx.user_id !== uid) sharedRows.push(tx);
					});
				} catch {
					// Firebase-only quick fix: abaikan shared group transactions
					// bila rules belum mengizinkan collectionGroup query lintas user.
				}
			}),
		);
	} catch {
		// fallback ke transaksi milik user sendiri
	}

	const merged = [...own, ...sharedRows];
	const deduped = Array.from(
		new Map(merged.map((tx) => [`${tx.user_id}:${tx.id}`, tx])).values(),
	);
	deduped.sort((a, b) =>
		`${String(b.date || "")}${String(b.created_at || "")}`.localeCompare(
			`${String(a.date || "")}${String(a.created_at || "")}`,
		),
	);

	const filtered = applyTransactionFilters(deduped, filters);
	const page = filters.page || 1;
	const perPage = filters.per_page || 20;
	const start = (page - 1) * perPage;
	return {
		data: filtered.slice(start, start + perPage),
		total: filtered.length,
	};
}

export async function createTransaction(
	uid: string,
	payload: TransactionFormData,
): Promise<Transaction> {
	const amount = Number(payload.amount || 0);
	const shared = Boolean(payload.is_shared && payload.group_id);
	const record: Omit<Transaction, "id"> = {
		wallet_id: payload.wallet_id,
		user_id: uid,
		type: payload.type,
		amount,
		category: payload.category,
		note: payload.note,
		merchant: payload.merchant,
		date: payload.date,
		receipt_url: undefined,
		is_shared: shared,
		visibility: shared ? "group" : "private",
		group_id: shared ? payload.group_id : undefined,
		on_behalf_of: payload.on_behalf_of,
		created_by: uid,
		is_disputed: false,
		dispute_resolved_at: undefined,
		created_at: isoNow(),
	};

	const docRef = await addDoc(
		usersCollection(uid, "transactions"),
		sanitizeForFirestore(record),
	);
	await applyWalletDelta(
		uid,
		payload.wallet_id,
		signedAmount(payload.type, amount),
	);
	return { id: docRef.id, ...record };
}

async function findAccessibleTransactionDoc(
	uid: string,
	transactionId: string,
) {
	const ownRef = doc(db, "users", uid, "transactions", transactionId);
	const ownSnap = await getDoc(ownRef);
	if (ownSnap.exists()) {
		return {
			ref: ownRef,
			tx: toTransaction({
				id: ownSnap.id,
				data: ownSnap.data() as Record<string, any>,
			}),
			canEdit: true,
		};
	}

	const cg = await getDocs(
		query(
			collectionGroup(db, "transactions"),
			where(documentId(), "==", transactionId),
			limit(1),
		),
	);
	if (cg.empty) return null;

	const docSnap = cg.docs[0];
	const tx = toTransaction({
		id: docSnap.id,
		data: docSnap.data() as Record<string, any>,
	});
	const roles = await getMyActiveGroupRoles(uid);
	const role = tx.group_id ? roles.get(tx.group_id) : null;
	const canEdit = Boolean(
		tx.is_shared && role && (role === "admin" || role === "editor"),
	);

	return { ref: docSnap.ref, tx, canEdit };
}

export async function patchTransaction(
	uid: string,
	transactionId: string,
	patch: Partial<TransactionFormData>,
): Promise<Transaction> {
	const found = await findAccessibleTransactionDoc(uid, transactionId);
	if (!found) throw new Error("Transaksi tidak ditemukan.");
	if (!found.canEdit)
		throw new Error("Kamu tidak punya izin mengedit transaksi grup ini.");

	const previous = found.tx;
	const next: Transaction = {
		...previous,
		...patch,
		amount: patch.amount !== undefined ? Number(patch.amount) : previous.amount,
	};

	await setDoc(found.ref, sanitizeForFirestore(next), { merge: true });

	const previousSigned = signedAmount(previous.type, previous.amount);
	const nextSigned = signedAmount(next.type, next.amount);
	const ownerUid = previous.user_id;

	if (previous.wallet_id === next.wallet_id) {
		await applyWalletDelta(
			ownerUid,
			next.wallet_id,
			nextSigned - previousSigned,
		);
	} else {
		await applyWalletDelta(ownerUid, previous.wallet_id, -previousSigned);
		await applyWalletDelta(ownerUid, next.wallet_id, nextSigned);
	}

	return next;
}

export async function removeTransaction(uid: string, transactionId: string) {
	const found = await findAccessibleTransactionDoc(uid, transactionId);
	if (!found) return;
	if (!found.canEdit)
		throw new Error("Kamu tidak punya izin menghapus transaksi grup ini.");

	await applyWalletDelta(
		found.tx.user_id,
		found.tx.wallet_id,
		-signedAmount(found.tx.type, found.tx.amount),
	);
	await deleteDoc(found.ref);
}

function toBudget(item: { id: string; data: Record<string, any> }): Budget {
	return {
		id: item.id,
		user_id: item.data.user_id,
		group_id: item.data.group_id,
		category: item.data.category,
		limit_amount: Number(item.data.limit_amount || 0),
		spent_amount: Number(item.data.spent_amount || 0),
		period: "monthly",
		period_start: toDateOnlyString(item.data.period_start, startOfMonth()),
		notify_at_percent: Number(item.data.notify_at_percent || 80),
		is_active: item.data.is_active ?? true,
		created_at: toIsoString(item.data.created_at),
	};
}

export async function listBudgets(
	uid: string,
	periodStart?: string,
): Promise<Array<Budget & { spent_amount: number }>> {
	const constraints: QueryConstraint[] = periodStart
		? [where("period_start", "==", periodStart)]
		: [];
	const snapshot = await getDocs(
		query(usersCollection(uid, "budgets"), ...constraints),
	);
	const budgets = snapshot.docs.map((item) =>
		toBudget({ id: item.id, data: item.data() as Record<string, any> }),
	);

	if (budgets.length === 0) return [];

	// Hitung spent_amount secara dinamis dari transaksi aktual agar selalu akurat
	const txSnapshot = await getDocs(usersCollection(uid, "transactions"));
	const allTx = txSnapshot.docs.map((d) => d.data() as Record<string, any>);

	return budgets
		.map((budget) => {
			const [year, month] = budget.period_start.split("-").map(Number);
			const nextMonth = month === 12 ? 1 : month + 1;
			const nextYear = month === 12 ? year + 1 : year;
			const periodEnd = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;

			const spent = allTx
				.filter(
					(tx) =>
						tx.type === "expense" &&
						tx.category === budget.category &&
						typeof tx.date === "string" &&
						tx.date >= budget.period_start &&
						tx.date < periodEnd,
				)
				.reduce((sum, tx) => sum + Number(tx.amount || 0), 0);

			return { ...budget, spent_amount: spent };
		})
		.sort((a, b) =>
			String(b.created_at || "").localeCompare(String(a.created_at || "")),
		);
}

export async function createBudget(
	uid: string,
	payload: BudgetFormData,
): Promise<Budget> {
	const record: Omit<Budget, "id"> = {
		user_id: uid,
		group_id: payload.group_id,
		category: payload.category,
		limit_amount: Number(payload.limit_amount || 0),
		spent_amount: 0,
		period: "monthly",
		period_start: payload.period_start || startOfMonth(),
		notify_at_percent: Number(payload.notify_at_percent || 80),
		is_active: true,
		created_at: isoNow(),
	};
	const docRef = await addDoc(
		usersCollection(uid, "budgets"),
		sanitizeForFirestore(record),
	);
	return { id: docRef.id, ...record };
}

export async function patchBudget(
	uid: string,
	budgetId: string,
	patch: Partial<BudgetFormData>,
) {
	const payload: Record<string, unknown> = {};
	if (patch.category) payload.category = patch.category;
	if (typeof patch.limit_amount === "number")
		payload.limit_amount = patch.limit_amount;
	if (patch.period_start) payload.period_start = patch.period_start;
	if (typeof patch.notify_at_percent === "number")
		payload.notify_at_percent = patch.notify_at_percent;
	await updateDoc(
		doc(db, "users", uid, "budgets", budgetId),
		sanitizeForFirestore(payload),
	);
}

export async function removeBudget(uid: string, budgetId: string) {
	await deleteDoc(doc(db, "users", uid, "budgets", budgetId));
}

function computeNextDueDate(
	dueDay: number,
	recurrence: BillRecurrence,
	from = new Date(),
) {
	const safeDay = Math.min(Math.max(dueDay, 1), 31);
	const year = from.getFullYear();
	const month = from.getMonth();

	const candidate = new Date(year, month, safeDay);
	candidate.setHours(0, 0, 0, 0);

	const base = new Date(from);
	base.setHours(0, 0, 0, 0);

	if (candidate < base) {
		if (recurrence === "yearly") {
			candidate.setFullYear(candidate.getFullYear() + 1);
		} else {
			candidate.setMonth(candidate.getMonth() + 1);
		}
	}

	return candidate.toISOString().split("T")[0];
}

function toBill(item: { id: string; data: Record<string, any> }): BillReminder {
	return {
		id: item.id,
		user_id: item.data.user_id,
		name: item.data.name,
		amount: Number(item.data.amount || 0),
		due_day: Number(item.data.due_day || 1),
		recurrence: item.data.recurrence,
		next_due_date: item.data.next_due_date,
		icon: item.data.icon,
		is_active: item.data.is_active ?? true,
		is_paid: Boolean(item.data.is_paid),
		paid_at: item.data.paid_at,
		payment_history: item.data.payment_history || [],
		notify_before_days: item.data.notify_before_days || [3, 1],
		created_at: item.data.created_at || isoNow(),
	};
}

export async function listBills(uid: string): Promise<BillReminder[]> {
	const snapshot = await getDocs(
		query(usersCollection(uid, "bills"), orderBy("next_due_date", "asc")),
	);
	return snapshot.docs
		.map((item) =>
			toBill({ id: item.id, data: item.data() as Record<string, any> }),
		)
		.filter((item) => item.is_active);
}

export async function createBill(
	uid: string,
	payload: BillFormData,
): Promise<BillReminder> {
	const record: Omit<BillReminder, "id"> = {
		user_id: uid,
		name: payload.name.trim(),
		amount: Number(payload.amount || 0),
		due_day: payload.due_day,
		recurrence: payload.recurrence,
		next_due_date: computeNextDueDate(payload.due_day, payload.recurrence),
		icon: payload.icon || "📄",
		is_active: true,
		is_paid: false,
		paid_at: undefined,
		payment_history: [],
		notify_before_days: payload.notify_before_days || [3, 1],
		created_at: isoNow(),
	};
	const docRef = await addDoc(
		usersCollection(uid, "bills"),
		sanitizeForFirestore(record),
	);
	return { id: docRef.id, ...record };
}

export async function markBillPaid(
	uid: string,
	billId: string,
): Promise<BillReminder> {
	const ref = doc(db, "users", uid, "bills", billId);
	const snap = await getDoc(ref);
	if (!snap.exists()) throw new Error("Tagihan tidak ditemukan.");
	const existing = toBill({
		id: snap.id,
		data: snap.data() as Record<string, any>,
	});

	const paidAt = isoNow();
	const historyEntry = {
		paid_at: paidAt,
		amount: existing.amount,
		next_due_date_before_payment: existing.next_due_date,
	};

	if (existing.recurrence === "once") {
		const nextState: BillReminder = {
			...existing,
			is_active: false,
			is_paid: true,
			paid_at: paidAt,
			payment_history: [...(existing.payment_history || []), historyEntry],
		};
		await setDoc(ref, sanitizeForFirestore(nextState), { merge: true });
		return nextState;
	}

	const nextDue = computeNextDueDate(
		existing.due_day,
		existing.recurrence,
		new Date(Date.now() + 86_400_000),
	);
	const nextState: BillReminder = {
		...existing,
		is_active: true,
		is_paid: false,
		paid_at: paidAt,
		next_due_date: nextDue,
		payment_history: [...(existing.payment_history || []), historyEntry],
	};
	await setDoc(ref, sanitizeForFirestore(nextState), { merge: true });
	return nextState;
}

export async function removeBill(uid: string, billId: string) {
	await deleteDoc(doc(db, "users", uid, "bills", billId));
}

// ── GROUPS ────────────────────────────────────────────────────

const GROUP_MAX_MEMBERS = 10;

function generateInviteCode(): string {
	const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
	return Array.from(
		{ length: 8 },
		() => chars[Math.floor(Math.random() * chars.length)],
	).join("");
}

function memberDocId(groupId: string, userId: string): string {
	return `${groupId}_${userId}`;
}

export async function listMyGroups(uid: string) {
	const snapshot = await getDocs(
		query(collection(db, "group_members"), where("user_id", "==", uid)),
	);

	const rows: Array<{
		role: string;
		status: string;
		joined_at?: string;
		groups: Record<string, unknown>;
	}> = [];

	await Promise.all(
		snapshot.docs.map(async (memberDoc) => {
			const member = memberDoc.data() as Record<string, string>;
			if (member.status !== "active") return;
			const groupSnap = await getDoc(doc(db, "groups", member.group_id));
			if (!groupSnap.exists()) return;
			rows.push({
				role: member.role,
				status: member.status,
				joined_at: member.joined_at,
				groups: { id: groupSnap.id, ...groupSnap.data() },
			});
		}),
	);

	rows.sort((a, b) =>
		String(
			(b.groups as Record<string, unknown>)?.created_at || "",
		).localeCompare(
			String((a.groups as Record<string, unknown>)?.created_at || ""),
		),
	);
	return rows;
}

export async function createGroup(
	uid: string,
	payload: { name: string; description?: string },
) {
	const inviteCode = generateInviteCode();
	const now = isoNow();

	const groupRef = doc(collection(db, "groups"));
	const groupData = {
		name: payload.name.trim(),
		description: payload.description?.trim() || null,
		owner_id: uid,
		invite_code: inviteCode,
		invite_link: `https://catat.in/join/${inviteCode}`,
		max_members: GROUP_MAX_MEMBERS,
		member_count: 1,
		created_at: now,
	};
	await setDoc(groupRef, sanitizeForFirestore(groupData));

	const memberRef = doc(db, "group_members", memberDocId(groupRef.id, uid));
	await setDoc(
		memberRef,
		sanitizeForFirestore({
			group_id: groupRef.id,
			user_id: uid,
			role: "admin",
			status: "active",
			joined_at: now,
			invited_by: uid,
		}),
	);

	return { id: groupRef.id, ...groupData };
}

export async function getGroupDetail(uid: string, groupId: string) {
	const myMemberSnap = await getDoc(
		doc(db, "group_members", memberDocId(groupId, uid)),
	);
	if (!myMemberSnap.exists() || myMemberSnap.data()?.status !== "active") {
		throw new Error("Kamu bukan anggota aktif grup ini.");
	}

	const groupSnap = await getDoc(doc(db, "groups", groupId));
	if (!groupSnap.exists()) throw new Error("Grup tidak ditemukan.");

	const membersSnap = await getDocs(
		query(collection(db, "group_members"), where("group_id", "==", groupId)),
	);

	const members = await Promise.all(
		membersSnap.docs.map(async (memberDoc) => {
			const member = memberDoc.data() as Record<string, string>;
			let profiles = {
				id: member.user_id,
				full_name: "Pengguna",
				avatar_url: null as string | null,
				email: "",
			};
			try {
				const userSnap = await getDoc(doc(db, "users", member.user_id));
				const userData = (userSnap.data() || {}) as Record<string, string>;
				profiles = {
					id: member.user_id,
					full_name: userData.full_name || userData.email || "Pengguna",
					avatar_url: userData.avatar_url || null,
					email: userData.email || "",
				};
			} catch {
				// profil tidak bisa dibaca, gunakan fallback
			}
			return { id: memberDoc.id, ...member, profiles };
		}),
	);

	return {
		id: groupSnap.id,
		...groupSnap.data(),
		members,
		my_role: myMemberSnap.data()?.role || "viewer",
	};
}

export async function joinGroup(uid: string, inviteCode: string) {
	const normalizedCode = inviteCode.trim().toUpperCase();

	const groupsSnap = await getDocs(
		query(
			collection(db, "groups"),
			where("invite_code", "==", normalizedCode),
			limit(1),
		),
	);
	if (groupsSnap.empty)
		throw new Error("Kode undangan tidak valid atau sudah kadaluarsa.");

	const groupDoc = groupsSnap.docs[0];
	const group = { id: groupDoc.id, ...groupDoc.data() } as Record<
		string,
		unknown
	>;

	const memberCount = Number(group.member_count || 0);
	const maxMembers = Number(group.max_members || GROUP_MAX_MEMBERS);
	if (memberCount >= maxMembers) throw new Error("Grup sudah penuh.");

	const memberRef = doc(db, "group_members", memberDocId(groupDoc.id, uid));
	const memberSnap = await getDoc(memberRef);
	if (memberSnap.exists() && memberSnap.data()?.status === "active") {
		throw new Error("Kamu sudah menjadi anggota grup ini.");
	}

	const now = isoNow();
	const groupRef = doc(db, "groups", groupDoc.id);

	if (memberSnap.exists()) {
		await updateDoc(
			memberRef,
			sanitizeForFirestore({
				status: "active",
				joined_at: now,
				role: "viewer",
			}),
		);
		await updateDoc(groupRef, { member_count: increment(1) });
	} else {
		await setDoc(
			memberRef,
			sanitizeForFirestore({
				group_id: groupDoc.id,
				user_id: uid,
				role: "viewer",
				status: "active",
				joined_at: now,
				invited_by: uid,
			}),
		);
		await updateDoc(groupRef, { member_count: increment(1) });
	}

	return {
		group,
		message: `Berhasil bergabung ke grup '${String(group.name)}'`,
	};
}

export async function leaveGroup(uid: string, groupId: string) {
	const memberRef = doc(db, "group_members", memberDocId(groupId, uid));
	const memberSnap = await getDoc(memberRef);
	if (!memberSnap.exists()) throw new Error("Kamu bukan anggota grup ini.");

	const member = memberSnap.data()!;
	if (member.status !== "active")
		throw new Error("Kamu bukan anggota aktif grup ini.");
	if (member.role === "admin") {
		throw new Error(
			"Admin tidak bisa langsung keluar. Transfer peran admin ke anggota lain terlebih dahulu.",
		);
	}

	await updateDoc(memberRef, { status: "left" });
	await updateDoc(doc(db, "groups", groupId), { member_count: increment(-1) });
}

export async function updateGroupMemberRole(
	uid: string,
	groupId: string,
	memberUserId: string,
	role: "admin" | "editor" | "viewer",
) {
	const requesterSnap = await getDoc(
		doc(db, "group_members", memberDocId(groupId, uid)),
	);
	if (!requesterSnap.exists() || requesterSnap.data()?.role !== "admin") {
		throw new Error("Hanya admin yang bisa mengubah peran anggota.");
	}

	const targetRef = doc(
		db,
		"group_members",
		memberDocId(groupId, memberUserId),
	);
	const targetSnap = await getDoc(targetRef);
	if (!targetSnap.exists()) throw new Error("Anggota tidak ditemukan.");
	if (targetSnap.data()?.status !== "active")
		throw new Error("Anggota tidak aktif.");

	await updateDoc(targetRef, { role });
}

export async function removeGroupMember(
	uid: string,
	groupId: string,
	memberUserId: string,
) {
	const requesterSnap = await getDoc(
		doc(db, "group_members", memberDocId(groupId, uid)),
	);
	if (!requesterSnap.exists() || requesterSnap.data()?.role !== "admin") {
		throw new Error("Hanya admin yang bisa mengeluarkan anggota.");
	}

	if (memberUserId === uid)
		throw new Error("Tidak bisa mengeluarkan diri sendiri.");

	const targetRef = doc(
		db,
		"group_members",
		memberDocId(groupId, memberUserId),
	);
	await updateDoc(targetRef, { status: "removed" });
	await updateDoc(doc(db, "groups", groupId), { member_count: increment(-1) });
}

export interface GroupTransactionItem extends Transaction {
	contributor_name: string;
	contributor_email: string;
}

export async function listGroupTransactions(
	uid: string,
	groupId: string,
	filters?: { myOnly?: boolean; month?: string },
): Promise<GroupTransactionItem[]> {
	const myMemberSnap = await getDoc(
		doc(db, "group_members", memberDocId(groupId, uid)),
	);
	if (!myMemberSnap.exists() || myMemberSnap.data()?.status !== "active") {
		throw new Error("Kamu bukan anggota aktif grup ini.");
	}

	const snap = await getDocs(
		query(
			collectionGroup(db, "transactions"),
			where("group_id", "==", groupId),
			where("is_shared", "==", true),
		),
	);

	const profileCache = new Map<string, { full_name: string; email: string }>();

	const rows: GroupTransactionItem[] = [];
	await Promise.all(
		snap.docs.map(async (docSnap) => {
			const tx = toTransaction({
				id: docSnap.id,
				data: docSnap.data() as Record<string, any>,
			});

			if (filters?.myOnly && tx.user_id !== uid) return;
			if (filters?.month && !tx.date.startsWith(filters.month)) return;

			if (!profileCache.has(tx.user_id)) {
				try {
					const userSnap = await getDoc(doc(db, "users", tx.user_id));
					const d = (userSnap.data() || {}) as Record<string, string>;
					profileCache.set(tx.user_id, {
						full_name: d.full_name || d.email || "Pengguna",
						email: d.email || "",
					});
				} catch {
					profileCache.set(tx.user_id, { full_name: "Pengguna", email: "" });
				}
			}

			const profile = profileCache.get(tx.user_id)!;
			rows.push({
				...tx,
				contributor_name: profile.full_name,
				contributor_email: profile.email,
			});
		}),
	);

	return rows.sort((a, b) =>
		`${String(b.date || "")}${String(b.created_at || "")}`.localeCompare(
			`${String(a.date || "")}${String(a.created_at || "")}`,
		),
	);
}

export async function getGroupFinanceSummary(
	uid: string,
	groupId: string,
	month?: string,
): Promise<{
	total_income: number;
	total_expense: number;
	net: number;
	transaction_count: number;
}> {
	const txs = await listGroupTransactions(
		uid,
		groupId,
		month ? { month } : undefined,
	);
	const total_income = txs
		.filter((tx) => tx.type === "income")
		.reduce((sum, tx) => sum + tx.amount, 0);
	const total_expense = txs
		.filter((tx) => tx.type === "expense")
		.reduce((sum, tx) => sum + tx.amount, 0);
	return {
		total_income,
		total_expense,
		net: total_income - total_expense,
		transaction_count: txs.length,
	};
}

export interface SavedViewItem {
	id: string;
	name: string;
	scope: "transactions" | "reports";
	filters: Record<string, unknown>;
	created_at: string;
}

export async function listSavedViews(
	uid: string,
	scope?: "transactions" | "reports",
): Promise<SavedViewItem[]> {
	const constraints: QueryConstraint[] = [orderBy("created_at", "desc")];
	if (scope) constraints.unshift(where("scope", "==", scope));
	const snapshot = await getDocs(
		query(usersCollection(uid, "saved_views"), ...constraints),
	);
	return snapshot.docs.map((item) => {
		const row = item.data() as Record<string, unknown>;
		return {
			id: item.id,
			name: String(row.name || "Untitled view"),
			scope: (row.scope as "transactions" | "reports") || "transactions",
			filters: (row.filters as Record<string, unknown>) || {},
			created_at: String(row.created_at || isoNow()),
		};
	});
}

export async function createSavedView(
	uid: string,
	payload: {
		name: string;
		scope: "transactions" | "reports";
		filters: Record<string, unknown>;
	},
): Promise<SavedViewItem> {
	const record = {
		name: payload.name.trim(),
		scope: payload.scope,
		filters: payload.filters || {},
		created_at: isoNow(),
	};
	const ref = await addDoc(
		usersCollection(uid, "saved_views"),
		sanitizeForFirestore(record),
	);
	return { id: ref.id, ...record };
}

export async function deleteSavedView(uid: string, id: string): Promise<void> {
	await deleteDoc(doc(db, "users", uid, "saved_views", id));
}

export interface SavingsGoalItem {
	id: string;
	name: string;
	target_amount: number;
	current_amount: number;
	created_at: string;
}

export async function listSavingsGoals(
	uid: string,
): Promise<SavingsGoalItem[]> {
	const snapshot = await getDocs(
		query(usersCollection(uid, "savings_goals"), orderBy("created_at", "desc")),
	);
	return snapshot.docs.map((item) => {
		const row = item.data() as Record<string, unknown>;
		return {
			id: item.id,
			name: String(row.name || "Target tabungan"),
			target_amount: Number(row.target_amount || 0),
			current_amount: Number(row.current_amount || 0),
			created_at: String(row.created_at || isoNow()),
		};
	});
}

export async function createSavingsGoal(
	uid: string,
	payload: { name: string; target_amount: number; current_amount: number },
): Promise<SavingsGoalItem> {
	const record = {
		name: payload.name.trim(),
		target_amount: Number(payload.target_amount || 0),
		current_amount: Number(payload.current_amount || 0),
		created_at: isoNow(),
	};
	const ref = await addDoc(
		usersCollection(uid, "savings_goals"),
		sanitizeForFirestore(record),
	);
	return { id: ref.id, ...record };
}

export async function deleteSavingsGoal(
	uid: string,
	id: string,
): Promise<void> {
	await deleteDoc(doc(db, "users", uid, "savings_goals", id));
}

export async function buildMonthlyReport(
	uid: string,
	year: number,
	month: number,
	walletId?: string,
) {
	const ownSnapshot = await getDocs(
		query(usersCollection(uid, "transactions"), orderBy("date", "desc")),
	);
	const ownRows = ownSnapshot.docs.map((item) =>
		toTransaction({ id: item.id, data: item.data() as Record<string, any> }),
	);

	// Sertakan shared group transactions agar laporan konsisten dengan daftar transaksi
	const sharedRows: Transaction[] = [];
	try {
		const groupRoles = await getMyActiveGroupRoles(uid);
		await Promise.all(
			Array.from(groupRoles.keys()).map(async (groupId) => {
				try {
					const snap = await getDocs(
						query(
							collectionGroup(db, "transactions"),
							where("group_id", "==", groupId),
							where("is_shared", "==", true),
						),
					);
					snap.docs.forEach((docSnap) => {
						const tx = toTransaction({
							id: docSnap.id,
							data: docSnap.data() as Record<string, any>,
						});
						if (tx.user_id !== uid) sharedRows.push(tx);
					});
				} catch {
					// abaikan bila rules Firestore belum mengizinkan collectionGroup query
				}
			}),
		);
	} catch {
		// fallback ke transaksi milik sendiri
	}

	const merged = [...ownRows, ...sharedRows];
	const rows = Array.from(
		new Map(merged.map((tx) => [`${tx.user_id}:${tx.id}`, tx])).values(),
	);

	const monthPrefix = `${year}-${String(month).padStart(2, "0")}`;
	const monthly = rows.filter((tx) => {
		if (!tx.date.startsWith(monthPrefix)) return false;
		if (walletId && tx.wallet_id !== walletId) return false;
		return true;
	});

	const totalIncome = monthly
		.filter((item) => item.type === "income")
		.reduce((sum, item) => sum + item.amount, 0);
	const totalExpense = monthly
		.filter((item) => item.type === "expense")
		.reduce((sum, item) => sum + item.amount, 0);

	const byCategoryMap = new Map<string, number>();
	monthly
		.filter((item) => item.type === "expense")
		.forEach((item) =>
			byCategoryMap.set(
				item.category,
				(byCategoryMap.get(item.category) || 0) + item.amount,
			),
		);

	const expenseByCategory = [...byCategoryMap.entries()]
		.map(([category, amount]) => ({
			category,
			amount,
			percentage:
				totalExpense > 0 ? Math.round((amount / totalExpense) * 100) : 0,
		}))
		.sort((a, b) => b.amount - a.amount);

	const monthlyBucket = new Map<string, { income: number; expense: number }>();
	rows.forEach((item) => {
		const key = String(item.date || "").slice(0, 7);
		const current = monthlyBucket.get(key) || { income: 0, expense: 0 };
		if (item.type === "income") current.income += item.amount;
		if (item.type === "expense") current.expense += item.amount;
		monthlyBucket.set(key, current);
	});

	const trends = [...monthlyBucket.entries()]
		.sort(([a], [b]) => a.localeCompare(b))
		.slice(-6)
		.map(([key, value]) => {
			const [yy, mm] = key.split("-").map(Number);
			return {
				year: yy,
				month: mm,
				income: value.income,
				expense: value.expense,
				net: value.income - value.expense,
			};
		});

	return {
		period: {
			year,
			month,
			start: `${monthPrefix}-01`,
			end: `${monthPrefix}-31`,
		},
		total_income: totalIncome,
		total_expense: totalExpense,
		net: totalIncome - totalExpense,
		transaction_count: monthly.length,
		expense_by_category: expenseByCategory,
		trends,
		transactions: monthly,
	};
}
