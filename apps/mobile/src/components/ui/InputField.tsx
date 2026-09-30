import { forwardRef, useState, type ComponentProps } from "react";
import { Text, TextInput, View } from "react-native";
import { useTheme } from "../../theme/theme-context";

type InputFieldProps = {
	label: string;
	value: string;
	onChangeText: (nextValue: string) => void;
	placeholder?: string;
	error?: string;
	secureTextEntry?: boolean;
	keyboardType?: ComponentProps<typeof TextInput>["keyboardType"];
	autoCapitalize?: ComponentProps<typeof TextInput>["autoCapitalize"];
	autoComplete?: ComponentProps<typeof TextInput>["autoComplete"];
	autoCorrect?: boolean;
	textContentType?: ComponentProps<typeof TextInput>["textContentType"];
	returnKeyType?: ComponentProps<typeof TextInput>["returnKeyType"];
	testID?: string;
};

export const InputField = forwardRef<TextInput, InputFieldProps>(function InputField(
	{
		label,
		value,
		onChangeText,
		placeholder,
		error,
		secureTextEntry,
		keyboardType,
		autoCapitalize,
		autoComplete,
		autoCorrect,
		textContentType,
		returnKeyType,
		testID,
	},
	ref,
) {
	const { theme } = useTheme();
	const [focused, setFocused] = useState(false);

	const fieldStyle = error
		? {
				backgroundColor: theme.iconBubbles.danger.background,
				borderColor: theme.colors.danger,
				borderWidth: 2,
			}
		: focused
			? {
					backgroundColor: theme.colors.card,
					borderColor: theme.colors.brandPrimary,
					borderWidth: 2,
				}
			: {
					backgroundColor: theme.colors.card,
					borderColor: theme.colors.borderBase,
					borderWidth: 1,
				};

	return (
		<View style={{ gap: theme.spacing.xs + 2 }}>
			<Text
				style={{
					color: error
						? theme.colors.danger
						: focused
							? theme.mode === "light"
								? theme.colors.brandPrimaryDeep
								: theme.colors.brandPrimary
							: theme.colors.textMuted,
					fontSize: 10,
					fontWeight: theme.typography.fontWeight.extrabold,
					letterSpacing: 0.6,
					textTransform: "uppercase",
				}}
			>
				{label}
			</Text>
			<TextInput
				ref={ref}
				testID={testID}
				accessibilityLabel={label}
				aria-invalid={error ? true : undefined}
				accessibilityHint={error}
				value={value}
				onChangeText={onChangeText}
				placeholder={placeholder}
				placeholderTextColor={theme.colors.textMuted}
				secureTextEntry={secureTextEntry}
				keyboardType={keyboardType}
				autoCapitalize={autoCapitalize}
				autoComplete={autoComplete}
				autoCorrect={autoCorrect}
				textContentType={textContentType}
				returnKeyType={returnKeyType}
				onFocus={() => setFocused(true)}
				onBlur={() => setFocused(false)}
				style={{
					borderRadius: theme.radius.md,
					minHeight: 44,
					color: theme.colors.textPrimary,
					fontSize: theme.typography.fontSize.md,
					fontFamily: theme.typography.fontFamily,
					paddingHorizontal: theme.spacing.md,
					paddingVertical: theme.spacing.md,
					...fieldStyle,
				}}
			/>
			{error ? (
				<Text
					accessibilityRole="alert"
					accessibilityLiveRegion="polite"
					style={{
						color: theme.colors.danger,
						fontSize: theme.typography.support.fontSize,
						fontWeight: theme.typography.support.fontWeight,
					}}
				>
					{error}
				</Text>
			) : null}
		</View>
	);
});
