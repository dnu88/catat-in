type BackCapableRouter = {
	back: () => void;
	replace: (href: never) => void;
	canGoBack?: () => boolean;
};

/**
 * Hidden routes (settings/wallets/budgets/bills/groups/imports/notifications/
 * transaction-new) can be opened cold, without navigation history — a PWA deep
 * link, a push notification, or an external link. In that case `router.back()`
 * is a no-op and the user is stranded on a screen with no exit affordance.
 *
 * Use the history back when it exists; otherwise replace the current route with
 * the relevant primary destination so the exit always lands somewhere valid.
 */
export function goBackSafely(router: BackCapableRouter, fallback: string) {
	if (router.canGoBack?.()) {
		router.back();
		return;
	}
	router.replace(fallback as never);
}
