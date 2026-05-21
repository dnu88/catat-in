import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { FinanceContext } from "../services/finance-context-query";
import { useFinanceContext } from "../state/finance-context";
import type { Transaction } from "../types";

export function transactionChannelName(context: FinanceContext) {
	return context.type === "household"
		? `transactions:household:${context.householdId}`
		: "transactions:personal";
}

export function transactionRealtimeFilter(context: FinanceContext) {
	return context.type === "household"
		? `household_id=eq.${context.householdId}`
		: undefined;
}

function transactionBelongsToContext(
	transaction: Pick<Transaction, "id"> & { household_id?: string | null },
	transactionId: string,
	context: FinanceContext,
) {
	if (transaction.id !== transactionId) return false;

	if (context.type === "household") {
		return transaction.household_id === context.householdId;
	}

	return transaction.household_id == null;
}

type TransactionRealtimePayload = { new?: Transaction; old?: Transaction };

type TransactionChannel = {
	on: (
		event: "postgres_changes",
		filter: Record<string, unknown>,
		callback: (payload: TransactionRealtimePayload) => void,
	) => TransactionChannel;
	subscribe: () => TransactionChannel;
	unsubscribe: () => void;
};

export function useTransactionRealtime(transactionId: string | null) {
	const { activeContext } = useFinanceContext();
	const [transaction, setTransaction] = useState<Transaction | null>(null);
	const [loading, setLoading] = useState(false);

	const refetch = useCallback(
		(isActive: () => boolean = () => true) => {
			if (!transactionId) {
				if (isActive()) {
					setTransaction(null);
					setLoading(false);
				}
				return;
			}

			setLoading(true);

			const query = supabase
				.from("transactions")
				.select("*")
				.eq("id", transactionId);

			const contextQuery =
				activeContext.type === "household"
					? query.eq("household_id", activeContext.householdId)
					: query.is("household_id", null);

			contextQuery.maybeSingle().then(({ data }) => {
				if (!isActive()) return;
				setTransaction(data ? (data as Transaction) : null);
				setLoading(false);
			});
		},
		[activeContext, transactionId],
	);

	useEffect(() => {
		let active = true;
		const isActive = () => active;

		refetch(isActive);

		if (!transactionId) {
			return () => {
				active = false;
			};
		}

		const filter = transactionRealtimeFilter(activeContext);
		const channel = (supabase.channel(
			transactionChannelName(activeContext),
		) as unknown as TransactionChannel)
			.on(
				"postgres_changes",
				{
					event: "*",
					schema: "public",
					table: "transactions",
					...(filter ? { filter } : {}),
				},
				(payload) => {
					if (!active) return;
					const next = payload.new;
					const previous = payload.old;

					if (
						next &&
						transactionBelongsToContext(next, transactionId, activeContext)
					) {
						setTransaction(next);
						return;
					}

					if (previous?.id === transactionId) {
						refetch(isActive);
					}
				},
			)
			.subscribe();

		return () => {
			active = false;
			channel.unsubscribe();
		};
	}, [activeContext, refetch, transactionId]);

	return { transaction, loading };
}
