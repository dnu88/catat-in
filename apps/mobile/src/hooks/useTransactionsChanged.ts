import { useEffect, useId, useRef } from "react";
import { supabase } from "../lib/supabase";
import { subscribeTransactionsChanges } from "../services/wallet-events";
import { useFinanceContext } from "../state/finance-context";

/**
 * Dengarkan perubahan transaksi dua jalur:
 * 1. Event bus lokal (create/update/deleteTransaction di perangkat yang sama).
 * 2. Supabase realtime `postgres_changes` di tabel `transactions` dengan filter
 *    sesuai finance context aktif (perangkat/anggota household lain).
 *
 * Setiap sinyal di-debounce (default 400 ms) supaya burst insert tidak memicu
 * banyak query, lalu memanggil `onChanged`. Listener dibersihkan saat unmount
 * atau saat finance context berganti. Callback harus idempotent — guard data
 * milik layar (mis. `cancelled`) tetap berlaku.
 */
export function useTransactionsChanged(onChanged: () => void, debounceMs = 400) {
	const { activeContext } = useFinanceContext();
	const callbackRef = useRef(onChanged);
	callbackRef.current = onChanged;
	// Setiap pemakaian hook butuh channel sendiri: supabase-js mengembalikan
	// instance channel yang SUDAH subscribe untuk nama yang sama, dan
	// `.on('postgres_changes')` setelah subscribe melempar
	// "cannot add postgres_changes callbacks ... after subscribe()".
	// (Nyata di produksi: Beranda + Laporan membuka konteks household yang sama.)
	const instanceId = useId();

	useEffect(() => {
		let cancelled = false;
		let timer: ReturnType<typeof setTimeout> | null = null;

		const schedule = () => {
			if (cancelled) return;
			if (timer !== null) clearTimeout(timer);
			timer = setTimeout(() => {
				timer = null;
				if (!cancelled) callbackRef.current();
			}, debounceMs);
		};

		const unsubscribeBus = subscribeTransactionsChanges(schedule);

		const channel = supabase
			.channel(
				`transactions-changed:${activeContext.type}:${
					activeContext.type === "household" ? activeContext.householdId : "personal"
				}:${instanceId}`,
			)
			.on(
				"postgres_changes",
				{
					event: "*",
					schema: "public",
					table: "transactions",
					...(activeContext.type === "household"
						? { filter: `household_id=eq.${activeContext.householdId}` }
						: {}),
				},
				schedule,
			)
			.subscribe();

		return () => {
			cancelled = true;
			if (timer !== null) clearTimeout(timer);
			unsubscribeBus();
			void supabase.removeChannel(channel);
		};
	}, [activeContext, debounceMs]);
}
