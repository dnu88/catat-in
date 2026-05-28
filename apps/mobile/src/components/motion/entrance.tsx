import {
	Children,
	type ReactNode,
	isValidElement,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import {
	AccessibilityInfo,
	Animated,
	Easing,
	type StyleProp,
	type ViewStyle,
} from "react-native";

export const ENTRANCE_DURATION_MS = 280;
export const ENTRANCE_STAGGER_MS = 50;
export const ENTRANCE_TRANSLATE_Y = 15;
export const PAGE_ENTRANCE_TRANSLATE_X = 24;
export const PAGE_ENTRANCE_DIRECTION = "slide_from_right" as const;
export const ENTRANCE_EASING = Easing.out(Easing.cubic);

export function getEntranceDelay(index: number) {
	return Math.max(0, index) * ENTRANCE_STAGGER_MS;
}

export function getEntranceInitialStyle(reduceMotion: boolean): ViewStyle {
	return {
		opacity: reduceMotion ? 1 : 0,
		transform: [{ translateY: reduceMotion ? 0 : ENTRANCE_TRANSLATE_Y }],
	};
}

export function getPageEntranceInitialStyle(reduceMotion: boolean): ViewStyle {
	return {
		opacity: reduceMotion ? 1 : 0,
		transform: [{ translateX: reduceMotion ? 0 : PAGE_ENTRANCE_TRANSLATE_X }],
	};
}

export function getEntranceTimingConfig(index: number) {
	return {
		toValue: 1,
		duration: ENTRANCE_DURATION_MS,
		delay: getEntranceDelay(index),
		easing: ENTRANCE_EASING,
		useNativeDriver: true,
	};
}

export function getPageEntranceTimingConfig() {
	return {
		toValue: 1,
		duration: ENTRANCE_DURATION_MS,
		delay: 0,
		easing: ENTRANCE_EASING,
		useNativeDriver: true,
	};
}

function useReducedMotionPreference() {
	const [reduceMotion, setReduceMotion] = useState<boolean | null>(null);

	useEffect(() => {
		let mounted = true;

		AccessibilityInfo.isReduceMotionEnabled()
			.then((enabled) => {
				if (mounted) setReduceMotion(enabled);
			})
			.catch(() => {
				if (mounted) setReduceMotion(false);
			});

		const subscription = AccessibilityInfo.addEventListener?.(
			"reduceMotionChanged",
			setReduceMotion,
		);

		return () => {
			mounted = false;
			subscription?.remove?.();
		};
	}, []);

	return reduceMotion;
}

type EntranceBaseProps = {
	children: ReactNode;
	style?: StyleProp<ViewStyle>;
	testID?: string;
	disabled?: boolean;
	reduceMotionOverride?: boolean;
};

type StaggeredEntranceProps = EntranceBaseProps & {
	index: number;
};

type StaggeredStackProps = Omit<EntranceBaseProps, "testID"> & {
	testIDPrefix: string;
	maxStaggerIndex?: number;
};

type StackKeyProps = {
	testID?: unknown;
	accessibilityLabel?: unknown;
	children?: unknown;
};

function getElementTypeName(type: unknown) {
	if (typeof type === "string") return type;
	if (typeof type === "function") {
		const namedType = type as { displayName?: string; name?: string };
		return namedType.displayName ?? namedType.name ?? "";
	}
	if (typeof type === "object" && type && "displayName" in type) {
		return String((type as { displayName?: unknown }).displayName ?? "");
	}
	return "";
}

function getTextSignature(value: unknown): string | null {
	if (typeof value === "string" || typeof value === "number") {
		return String(value);
	}
	return null;
}

function getChildSignature(child: ReactNode) {
	if (typeof child === "string" || typeof child === "number") {
		return `primitive:${child}`;
	}

	if (!isValidElement(child)) return null;

	const props = child.props as StackKeyProps;
	if (typeof props.testID === "string") return `testID:${props.testID}`;
	if (typeof props.accessibilityLabel === "string") {
		return `accessibilityLabel:${props.accessibilityLabel}`;
	}

	const typeName = getElementTypeName(child.type);
	const textSignature = getTextSignature(props.children);
	if (typeName && textSignature) return `${typeName}:${textSignature}`;

	return null;
}

export function getStableStackChildKey(
	child: ReactNode,
	signatureKeys: Map<string, string>,
	testIDPrefix: string,
) {
	if (isValidElement(child) && child.key != null) return String(child.key);

	const signature = getChildSignature(child);
	if (signature) {
		const existingKey = signatureKeys.get(signature);
		if (existingKey) return existingKey;

		const nextKey = `${testIDPrefix}-stable-${signatureKeys.size}`;
		signatureKeys.set(signature, nextKey);
		return nextKey;
	}

	throw new Error(
		`StaggeredStack child in ${testIDPrefix} needs a stable key, testID, accessibilityLabel, or direct text child.`,
	);
}

function useEntranceProgress({
	disabled,
	reduceMotion,
	getTimingConfig,
}: {
	disabled: boolean;
	reduceMotion: boolean | null;
	getTimingConfig: () => ReturnType<typeof getEntranceTimingConfig>;
}) {
	const progress = useRef(new Animated.Value(disabled || reduceMotion === true ? 1 : 0));
	const hasCompletedEntranceRef = useRef(disabled || reduceMotion === true);

	useEffect(() => {
		progress.current.stopAnimation();

		if (disabled || reduceMotion === true) {
			hasCompletedEntranceRef.current = true;
			return undefined;
		}

		if (reduceMotion === null) {
			return undefined;
		}

		if (hasCompletedEntranceRef.current) {
			progress.current.setValue(1);
			return undefined;
		}

		progress.current.setValue(0);
		const animation = Animated.timing(progress.current, getTimingConfig());
		hasCompletedEntranceRef.current = true;
		animation.start();

		return () => {
			animation.stop();
		};
	}, [disabled, getTimingConfig, reduceMotion]);

	return progress;
}

export function StaggeredEntrance({
	children,
	index,
	style,
	testID,
	disabled = false,
	reduceMotionOverride,
}: StaggeredEntranceProps) {
	const systemReduceMotion = useReducedMotionPreference();
	const reduceMotion = reduceMotionOverride ?? systemReduceMotion;
	const getTimingConfig = useMemo(
		() => () => getEntranceTimingConfig(index),
		[index],
	);
	const progress = useEntranceProgress({
		disabled,
		reduceMotion,
		getTimingConfig,
	});
	const animatedStyle = useMemo(
		() => {
			if (disabled || reduceMotion === true) {
				return getEntranceInitialStyle(true);
			}

			return {
				opacity: progress.current,
				transform: [
					{
						translateY: progress.current.interpolate({
							inputRange: [0, 1],
							outputRange: [ENTRANCE_TRANSLATE_Y, 0],
						}),
					},
				],
			};
		},
		[disabled, progress, reduceMotion],
	);

	return (
		<Animated.View testID={testID} style={[style, animatedStyle]}>
			{children}
		</Animated.View>
	);
}

export function PageEntrance({
	children,
	style,
	testID,
	disabled = false,
	reduceMotionOverride,
}: EntranceBaseProps) {
	const systemReduceMotion = useReducedMotionPreference();
	const reduceMotion = reduceMotionOverride ?? systemReduceMotion;
	const getTimingConfig = useMemo(() => getPageEntranceTimingConfig, []);
	const progress = useEntranceProgress({
		disabled,
		reduceMotion,
		getTimingConfig,
	});
	const animatedStyle = useMemo(
		() => {
			if (disabled || reduceMotion === true) {
				return getPageEntranceInitialStyle(true);
			}

			return {
				opacity: progress.current,
				transform: [
					{
						translateX: progress.current.interpolate({
							inputRange: [0, 1],
							outputRange: [PAGE_ENTRANCE_TRANSLATE_X, 0],
						}),
					},
				],
			};
		},
		[disabled, progress, reduceMotion],
	);

	return (
		<Animated.View testID={testID} style={[style, animatedStyle]}>
			{children}
		</Animated.View>
	);
}

export function StaggeredStack({
	children,
	style,
	testIDPrefix,
	disabled = false,
	reduceMotionOverride,
	maxStaggerIndex = 3,
}: StaggeredStackProps) {
	const signatureKeysRef = useRef(new Map<string, string>());
	const resolveChildKey = useCallback(
		(child: ReactNode) =>
			getStableStackChildKey(
				child,
				signatureKeysRef.current,
				testIDPrefix,
			),
		[testIDPrefix],
	);
	const childItems = useMemo(() => {
		const items: ReactNode[] = [];
		Children.forEach(children, (child) => {
			if (child === null || child === undefined || typeof child === "boolean") {
				return;
			}
			items.push(child);
		});
		return items;
	}, [children]);

	return (
		<>
			{childItems.map((child, index) => (
				<StaggeredEntrance
					key={resolveChildKey(child)}
					index={Math.min(index, maxStaggerIndex)}
					style={style}
					testID={`${testIDPrefix}-${index}`}
					disabled={disabled}
					reduceMotionOverride={reduceMotionOverride}
				>
					{child}
				</StaggeredEntrance>
			))}
		</>
	);
}
