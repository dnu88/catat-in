import { useEffect, useMemo, useRef, useState } from "react";
import {
	ScrollView,
	StyleSheet,
	Text,
	View,
	type NativeSyntheticEvent,
	type NativeScrollEvent,
} from "react-native";

import { useTheme } from "../../theme/theme-context";
import type { MobileTheme } from "../../theme/mobile-theme";

const ITEM_HEIGHT = 42;
const VISIBLE_ITEMS = 5;
const WHEEL_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;
const CENTER_INDEX = Math.floor(VISIBLE_ITEMS / 2);

type Locale = "id" | "en";

type IOSWheelDatePickerProps = {
	value: string;
	onChange: (nextValue: string) => void;
	locale?: Locale;
	testID?: string;
	showValueLabel?: boolean;
};

type WheelColumnProps = {
	label: string;
	values: number[];
	selected: number;
	onChange: (value: number) => void;
	format: (value: number) => string;
	testID: string;
};

export function daysInMonth(year: number, month: number) {
	return new Date(year, month, 0).getDate();
}

export function toIsoDate(year: number, month: number, day: number) {
	const safeDay = Math.min(daysInMonth(year, month), Math.max(1, day));
	return `${year}-${month.toString().padStart(2, "0")}-${safeDay
		.toString()
		.padStart(2, "0")}`;
}

export function parseIsoDateParts(value: string) {
	const now = new Date();
	const currentYear = now.getFullYear();
	const allowedYears = getDynamicYearRange(currentYear);
	const [yearText, monthText, dayText] = value.split("-");
	const parsedYear = Number(yearText);
	const year = allowedYears.includes(parsedYear) ? parsedYear : currentYear;
	const month = Math.min(12, Math.max(1, Number(monthText) || now.getMonth() + 1));
	const day = Math.min(
		daysInMonth(year, month),
		Math.max(1, Number(dayText) || now.getDate()),
	);
	return { year, month, day };
}

export function getDynamicYearRange(currentYear = new Date().getFullYear()) {
	return [currentYear - 1, currentYear, currentYear + 1];
}

function monthNames(locale: Locale) {
	return locale === "en"
		? ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
		: ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
}

function WheelColumn({ label, values, selected, onChange, format, testID }: WheelColumnProps) {
	const { theme } = useTheme();
	const styles = useMemo(() => createStyles(theme), [theme]);
	const scrollRef = useRef<ScrollView>(null);
	const selectedIndex = Math.max(0, values.indexOf(selected));
	const [scrollY, setScrollY] = useState(selectedIndex * ITEM_HEIGHT);
	const lastSelectedRef = useRef(selected);
	const scrollSettleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		lastSelectedRef.current = selected;
		const nextY = selectedIndex * ITEM_HEIGHT;
		setScrollY(nextY);
		const handle = setTimeout(() => {
			scrollRef.current?.scrollTo({ y: nextY, animated: false });
		}, 0);
		return () => clearTimeout(handle);
	}, [selected, selectedIndex]);

	useEffect(() => {
		return () => {
			if (scrollSettleTimerRef.current) clearTimeout(scrollSettleTimerRef.current);
		};
	}, []);

	const selectFromOffset = (offsetY: number, animated = true) => {
		if (!values.length) return;
		const rawIndex = Math.round(offsetY / ITEM_HEIGHT);
		const clampedIndex = Math.min(values.length - 1, Math.max(0, rawIndex));
		const nextValue = values[clampedIndex];
		const snappedY = clampedIndex * ITEM_HEIGHT;
		setScrollY(snappedY);
		scrollRef.current?.scrollTo({ y: snappedY, animated });
		if (nextValue !== lastSelectedRef.current) {
			lastSelectedRef.current = nextValue;
			onChange(nextValue);
		}
	};

	const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
		const offsetY = event.nativeEvent.contentOffset.y;
		setScrollY(offsetY);
		if (scrollSettleTimerRef.current) clearTimeout(scrollSettleTimerRef.current);
		// React Native Web does not consistently fire momentum/drag-end for
		// every wheel gesture. Debounce scroll updates so the centered value is
		// still selected after the wheel settles, preventing stale dates on save.
		scrollSettleTimerRef.current = setTimeout(() => {
			selectFromOffset(offsetY);
		}, 140);
	};

	const handleScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
		if (scrollSettleTimerRef.current) clearTimeout(scrollSettleTimerRef.current);
		selectFromOffset(event.nativeEvent.contentOffset.y);
	};

	const centerPosition = scrollY / ITEM_HEIGHT;

	return (
		<View style={styles.column} testID={`${testID}-column`}>
			<Text style={styles.columnLabel}>{label}</Text>
			<View style={styles.wheelViewport}>
				<ScrollView
					ref={scrollRef}
					testID={`${testID}-scroll`}
					showsVerticalScrollIndicator={false}
					snapToInterval={ITEM_HEIGHT}
					snapToAlignment="start"
					decelerationRate="fast"
					disableIntervalMomentum
					scrollEventThrottle={16}
					contentContainerStyle={styles.wheelContent}
					onScroll={handleScroll}
					onMomentumScrollEnd={handleScrollEnd}
					onScrollEndDrag={handleScrollEnd}
				>
					{values.map((value, index) => {
						const distance = Math.abs(index - centerPosition);
						const isSelected = distance < 0.45;
						const opacity = isSelected ? 1 : distance < 1.4 ? 0.62 : distance < 2.4 ? 0.34 : 0.16;
						const rotateX = Math.max(-62, Math.min(62, (index - centerPosition) * -24));
						const scale = isSelected ? 1.04 : distance < 1.4 ? 0.94 : 0.82;

						return (
							<View
								key={value}
								testID={`${testID}-item-${value}`}
								style={[
									styles.wheelItem,
									{
										opacity,
										transform: [{ perspective: 900 }, { rotateX: `${rotateX}deg` }, { scale }],
									},
								]}
							>
								<Text
									style={[
										styles.wheelText,
										isSelected ? styles.wheelTextSelected : styles.wheelTextDimmed,
									]}
								>
									{format(value)}
								</Text>
							</View>
						);
					})}
				</ScrollView>
				<View pointerEvents="none" style={styles.fadeTop} />
				<View pointerEvents="none" style={styles.fadeUpper} />
				<View pointerEvents="none" style={styles.fadeLower} />
				<View pointerEvents="none" style={styles.fadeBottom} />
			</View>
		</View>
	);
}

export function IOSWheelDatePicker({
	value,
	onChange,
	locale = "id",
	testID = "ios-wheel-date-picker",
	showValueLabel = true,
}: IOSWheelDatePickerProps) {
	const { theme } = useTheme();
	const styles = useMemo(() => createStyles(theme), [theme]);
	const { year, month, day } = parseIsoDateParts(value);
	const currentYear = new Date().getFullYear();
	const years = useMemo(() => getDynamicYearRange(currentYear), [currentYear]);
	const months = useMemo(() => Array.from({ length: 12 }, (_, index) => index + 1), []);
	const days = useMemo(
		() => Array.from({ length: daysInMonth(year, month) }, (_, index) => index + 1),
		[year, month],
	);
	const labels = locale === "en"
		? { year: "Year", month: "Month", date: "Date" }
		: { year: "Tahun", month: "Bulan", date: "Tanggal" };
	const names = useMemo(() => monthNames(locale), [locale]);

	useEffect(() => {
		const normalized = toIsoDate(year, month, day);
		if (normalized !== value) onChange(normalized);
	}, [day, month, onChange, value, year]);

	const updateDate = (next: Partial<{ year: number; month: number; day: number }>) => {
		const nextYear = next.year ?? year;
		const nextMonth = next.month ?? month;
		const nextDay = Math.min(next.day ?? day, daysInMonth(nextYear, nextMonth));
		onChange(toIsoDate(nextYear, nextMonth, nextDay));
	};

	return (
		<View testID={testID} style={styles.card}>
			<View style={styles.wheelRow}>
				<View pointerEvents="none" style={styles.centerHighlight} />
				<WheelColumn
					label={labels.year}
					values={years}
					selected={year}
					onChange={(nextYear) => updateDate({ year: nextYear })}
					format={(nextYear) => String(nextYear)}
					testID={`${testID}-year`}
				/>
				<WheelColumn
					label={labels.month}
					values={months}
					selected={month}
					onChange={(nextMonth) => updateDate({ month: nextMonth })}
					format={(nextMonth) => names[nextMonth - 1]}
					testID={`${testID}-month`}
				/>
				<WheelColumn
					label={labels.date}
					values={days}
					selected={day}
					onChange={(nextDay) => updateDate({ day: nextDay })}
					format={(nextDay) => String(nextDay).padStart(2, "0")}
					testID={`${testID}-date`}
				/>
			</View>
			{showValueLabel && <Text style={styles.valueLabel}>{toIsoDate(year, month, day)}</Text>}
		</View>
	);
}

const overlayColor = (theme: MobileTheme) => theme.colors.surface;

function createStyles(theme: MobileTheme) {
	const centerBg = theme.mode === "dark" ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.34)";
	const centerBorder = theme.mode === "dark" ? "rgba(255,255,255,0.14)" : "rgba(15,23,42,0.18)";
	const fadeColor = overlayColor(theme);

	return StyleSheet.create({
		card: {
			borderWidth: 1,
			borderColor: theme.colors.borderStrong,
			borderRadius: 20,
			backgroundColor: theme.colors.surface,
			padding: 12,
			gap: 10,
		},
		wheelRow: {
			position: "relative",
			flexDirection: "row",
			height: WHEEL_HEIGHT + 22,
			gap: 8,
		},
		centerHighlight: {
			position: "absolute",
			left: 0,
			right: 0,
			top: 22 + ITEM_HEIGHT * CENTER_INDEX,
			height: ITEM_HEIGHT,
			borderRadius: 14,
			backgroundColor: centerBg,
			borderWidth: 1,
			borderColor: centerBorder,
			zIndex: 0,
		},
		column: {
			flex: 1,
			minWidth: 0,
		},
		columnLabel: {
			height: 22,
			textAlign: "center",
			color: theme.colors.textSecondary,
			fontSize: 11,
			fontWeight: "800",
			textTransform: "uppercase",
			letterSpacing: 0.4,
		},
		wheelViewport: {
			height: WHEEL_HEIGHT,
			borderRadius: 16,
			overflow: "hidden",
			position: "relative",
		},
		wheelContent: {
			paddingVertical: ITEM_HEIGHT * CENTER_INDEX,
		},
		wheelItem: {
			height: ITEM_HEIGHT,
			alignItems: "center",
			justifyContent: "center",
			backfaceVisibility: "hidden",
		},
		wheelText: {
			textAlign: "center",
			fontSize: 17,
			letterSpacing: 0.2,
		},
		wheelTextSelected: {
			color: "#FFFFFF",
			fontWeight: "900",
		},
		wheelTextDimmed: {
			color: theme.colors.textMuted,
			fontWeight: "600",
		},
		fadeTop: {
			position: "absolute",
			left: 0,
			right: 0,
			top: 0,
			height: ITEM_HEIGHT,
			backgroundColor: fadeColor,
			opacity: 0.82,
		},
		fadeUpper: {
			position: "absolute",
			left: 0,
			right: 0,
			top: ITEM_HEIGHT,
			height: ITEM_HEIGHT,
			backgroundColor: fadeColor,
			opacity: 0.26,
		},
		fadeLower: {
			position: "absolute",
			left: 0,
			right: 0,
			bottom: ITEM_HEIGHT,
			height: ITEM_HEIGHT,
			backgroundColor: fadeColor,
			opacity: 0.26,
		},
		fadeBottom: {
			position: "absolute",
			left: 0,
			right: 0,
			bottom: 0,
			height: ITEM_HEIGHT,
			backgroundColor: fadeColor,
			opacity: 0.82,
		},
		valueLabel: {
			color: theme.colors.textMuted,
			fontSize: 12,
			fontWeight: "800",
			textAlign: "center",
		},
	});
}

export default IOSWheelDatePicker;
