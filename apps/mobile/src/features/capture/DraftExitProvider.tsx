import React, { createContext, useContext, useRef } from "react";

type Exit = (leave: () => void) => void;
const DraftExitContext = createContext<React.MutableRefObject<Exit | null> | null>(null);

/** Navigator-local callback, not a draft cache. Cleared on blur/unmount. */
export function DraftExitProvider({ children }: { children: React.ReactNode }) {
	const active = useRef<Exit | null>(null);
	return <DraftExitContext.Provider value={active}>{children}</DraftExitContext.Provider>;
}
export function useScopedDraftExit() { return useContext(DraftExitContext); }
