export const PAGE_TRANSITION_DURATION_MS = 280;

export const kaswisePageTransition = {
	animation: "slide_from_right" as const,
	animationDuration: PAGE_TRANSITION_DURATION_MS,
	gestureEnabled: true,
};

export function createKaswiseStackScreenOptions(backgroundColor: string) {
	return {
		headerShown: false,
		contentStyle: { backgroundColor },
		...kaswisePageTransition,
	};
}
