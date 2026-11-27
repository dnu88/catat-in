import { useCallback, useRef } from "react";
import { Alert, BackHandler, Platform } from "react-native";
import { useFocusEffect, useNavigation } from "expo-router";
import { armManualBackGuard } from "./manual-back-guard";
import { useScopedDraftExit } from "./DraftExitProvider";

/** Screen-local only: never cache financial drafts or a pending write. */
export function useDraftExitGuard(options: {
	enabled: boolean;
	scopeKey?: string;
	dirty: boolean;
	blocked: boolean;
	isEn: boolean;
	onDiscard: () => void;
	browserBack?: () => void;
	browserUrl?: string;
}) {
	const scopedExit = useScopedDraftExit();
	const latest = useRef(options);
	latest.current = options;
	const allowed = useRef(false);
	const focused = useRef(true);
	// Some non-navigation renderers do not expose this optional router export.
	const navigation = typeof useNavigation === "function" ? useNavigation() : null;
	const requestExit = useCallback((leave: () => void) => {
		const current = latest.current;
		const proceed = () => {
			allowed.current = true;
			try { leave(); } finally { allowed.current = false; }
		};
		if (!current.enabled || allowed.current) { proceed(); return; }
		if (current.blocked) {
			const message = current.isEn
				? "Wait for the save result before leaving. An unconfirmed save must be checked first."
				: "Tunggu hasil simpan sebelum keluar. Hasil simpan yang belum pasti harus diperiksa dulu.";
			if (Platform.OS === "web" && typeof window !== "undefined") window.alert(message);
			else Alert.alert(current.isEn ? "Save in progress" : "Periksa hasil simpan", message);
			return;
		}
		if (!current.dirty) { proceed(); return; }
		const title = current.isEn ? "Discard this draft?" : "Buang draf ini?";
		const message = current.isEn ? "Leaving discards your unsaved draft." : "Keluar akan membuang draf yang belum disimpan.";
		const discard = () => {
			// Re-check after an asynchronous native confirmation: never clear a live write.
			if (!focused.current || latest.current.blocked || latest.current.scopeKey !== current.scopeKey) return;
			latest.current.onDiscard();
			proceed();
		};
		if (Platform.OS === "web" && typeof window !== "undefined") {
			if (window.confirm(`${title}\n${message}`)) discard();
		} else Alert.alert(title, message, [
			{ text: current.isEn ? "Keep editing" : "Lanjut mengedit", style: "cancel" },
			{ text: current.isEn ? "Discard" : "Buang", style: "destructive", onPress: discard },
		]);
	}, []);

	useFocusEffect(useCallback(() => {
		focused.current = true;
		if (!latest.current.enabled) return;
		const remove = navigation?.addListener("beforeRemove", (event: any) => {
			if (allowed.current || (!latest.current.dirty && !latest.current.blocked)) return;
			event.preventDefault();
			requestExit(() => navigation.dispatch(event.data.action));
		});
		if (scopedExit) scopedExit.current = requestExit;
		// Own the sentinel on Manual, not Capture: Back must ask *before* replacing Manual.
		const browserBack = latest.current.browserBack;
		const cleanupBrowser = browserBack && Platform.OS === "web"
			? armManualBackGuard({ isWeb: true, url: latest.current.browserUrl, onBack: () => {
				requestExit(() => latest.current.browserBack?.());
			} })
			: undefined;
		const hardware = browserBack && Platform.OS !== "web"
			? BackHandler.addEventListener("hardwareBackPress", () => { requestExit(browserBack); return true; })
			: undefined;
		return () => {
			focused.current = false;
			remove?.(); cleanupBrowser?.(); hardware?.remove();
			if (scopedExit?.current === requestExit) scopedExit.current = null;
		};
	}, [navigation, requestExit, scopedExit, options.browserUrl]));
	return requestExit;
}
