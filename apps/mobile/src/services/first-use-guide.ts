import AsyncStorage from "@react-native-async-storage/async-storage";

export type FirstUseGuideState = {
	dismissed?: boolean;
	reportsVisited?: boolean;
	lastStep?: number;
	updatedAt?: string;
};

const FIRST_USE_GUIDE_PREFIX = "first-use-guide:v1";

export function firstUseGuideStorageKey(userId: string) {
	return `${FIRST_USE_GUIDE_PREFIX}:${userId}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeFirstUseGuideState(value: unknown): FirstUseGuideState {
	if (!isRecord(value)) return {};

	const state: FirstUseGuideState = {};
	if (typeof value.dismissed === "boolean") {
		state.dismissed = value.dismissed;
	}
	if (typeof value.reportsVisited === "boolean") {
		state.reportsVisited = value.reportsVisited;
	}
	if (
		typeof value.lastStep === "number" &&
		Number.isInteger(value.lastStep) &&
		value.lastStep >= 0
	) {
		state.lastStep = value.lastStep;
	}
	if (typeof value.updatedAt === "string") {
		state.updatedAt = value.updatedAt;
	}

	return state;
}

export async function readFirstUseGuideState(
	userId: string,
): Promise<FirstUseGuideState> {
	try {
		const raw = await AsyncStorage.getItem(firstUseGuideStorageKey(userId));
		if (!raw) return {};
		return normalizeFirstUseGuideState(JSON.parse(raw));
	} catch {
		return {};
	}
}

export async function saveFirstUseGuideState(
	userId: string,
	patch: Omit<FirstUseGuideState, "updatedAt">,
): Promise<FirstUseGuideState> {
	const current = await readFirstUseGuideState(userId);
	const next = normalizeFirstUseGuideState({
		...current,
		...patch,
		updatedAt: new Date().toISOString(),
	});
	await AsyncStorage.setItem(
		firstUseGuideStorageKey(userId),
		JSON.stringify(next),
	);
	return next;
}

export function markFirstUseReportsVisited(userId: string) {
	return saveFirstUseGuideState(userId, { reportsVisited: true });
}
