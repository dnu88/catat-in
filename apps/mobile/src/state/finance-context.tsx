import AsyncStorage from "@react-native-async-storage/async-storage";
import type React from "react";
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";

import { supabase } from "../lib/supabase";
import { getCurrentUserId } from "../services/currentUser";
import {
	canCreateInContext,
	type FinanceContext,
} from "../services/finance-context-query";
import { listMyHouseholds, type HouseholdMember } from "../services/households";

const ACTIVE_HOUSEHOLD_STORAGE_KEY = "finance-context.active-household-id";

type FinanceContextValue = {
	activeContext: FinanceContext;
	memberships: HouseholdMember[];
	loading: boolean;
	canCreate: boolean;
	refreshMemberships: () => Promise<void>;
	setPersonalContext: () => void;
	setActiveHousehold: (householdId: string) => void;
};

const Context = createContext<FinanceContextValue | null>(null);

type FinanceContextProviderProps = {
	children: React.ReactNode;
	loadMemberships?: () => Promise<HouseholdMember[]>;
};

function contextForHousehold(
	householdId: string,
	rows: HouseholdMember[],
): FinanceContext | null {
	const membership = rows.find((row) => row.household_id === householdId);
	if (!membership) return null;

	return {
		type: "household",
		householdId,
		role: membership.role,
	};
}

export function FinanceContextProvider({
	children,
	loadMemberships,
}: FinanceContextProviderProps) {
	const [activeContext, setActiveContext] = useState<FinanceContext>({
		type: "personal",
	});
	const [memberships, setMemberships] = useState<HouseholdMember[]>([]);
	const [loading, setLoading] = useState(true);

	const resetToPersonal = useCallback(() => {
		setMemberships([]);
		setActiveContext({ type: "personal" });
	}, []);

	const loadRows = useCallback(async (): Promise<HouseholdMember[]> => {
		if (loadMemberships) return loadMemberships();
		try {
			return await listMyHouseholds(supabase, await getCurrentUserId());
		} catch {
			return [];
		}
	}, [loadMemberships]);

	const refreshMemberships = useCallback(async () => {
		setLoading(true);
		try {
			const rows = await loadRows();
			setMemberships(rows);

			setActiveContext((current) => {
				if (current.type !== "household") return current;
				return (
					contextForHousehold(current.householdId, rows) ?? { type: "personal" }
				);
			});
		} catch {
			resetToPersonal();
		} finally {
			setLoading(false);
		}
	}, [loadRows, resetToPersonal]);

	useEffect(() => {
		let cancelled = false;

		async function initialise() {
			setLoading(true);
			try {
				const [rows, storedHouseholdId] = await Promise.all([
					loadRows(),
					AsyncStorage.getItem(ACTIVE_HOUSEHOLD_STORAGE_KEY).catch(() => null),
				]);
				if (cancelled) return;

				setMemberships(rows);
				setActiveContext(
					storedHouseholdId
						? (contextForHousehold(storedHouseholdId, rows) ?? {
								type: "personal",
							})
						: { type: "personal" },
				);
			} catch {
				if (!cancelled) resetToPersonal();
			} finally {
				if (!cancelled) setLoading(false);
			}
		}

		initialise();
		const subscription = supabase.auth.onAuthStateChange((_event, session) => {
			if (!session?.user) {
				resetToPersonal();
				return;
			}
			void refreshMemberships();
		});

		return () => {
			cancelled = true;
			subscription.data.subscription.unsubscribe();
		};
	}, [loadRows, refreshMemberships, resetToPersonal]);

	const setPersonalContext = useCallback(() => {
		setActiveContext({ type: "personal" });
		void AsyncStorage.removeItem(ACTIVE_HOUSEHOLD_STORAGE_KEY).catch(() => undefined);
	}, []);

	const setActiveHousehold = useCallback(
		(householdId: string) => {
			const context = contextForHousehold(householdId, memberships);
			if (!context) return;

			setActiveContext(context);
			void AsyncStorage.setItem(ACTIVE_HOUSEHOLD_STORAGE_KEY, householdId).catch(
				() => undefined,
			);
		},
		[memberships],
	);

	const value = useMemo<FinanceContextValue>(
		() => ({
			activeContext,
			memberships,
			loading,
			canCreate: canCreateInContext(activeContext),
			refreshMemberships,
			setPersonalContext,
			setActiveHousehold,
		}),
		[
			activeContext,
			loading,
			memberships,
			refreshMemberships,
			setPersonalContext,
			setActiveHousehold,
		],
	);

	return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useFinanceContext() {
	const value = useContext(Context);
	if (!value) {
		throw new Error(
			"useFinanceContext must be used within FinanceContextProvider",
		);
	}
	return value;
}
