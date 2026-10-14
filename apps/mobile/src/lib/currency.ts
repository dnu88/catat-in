// Canonical compact currency formatter for Kaswise.
//
// Single source of truth for the compact unit ladder:
//   id → "rb" (ribu) / "jt" (juta) / "M" (miliar) / "T" (triliun)
//   en → "K"  (thousand) / "M" (million) / "B" (billion) / "T" (trillion)
//
// Reuse this instead of writing a new inline formatter. Mixing "jt" and "M" across
// surfaces produced inconsistent, locale-dependent magnitudes (the Reports summary
// said "jt" while the Cashflow Pulse chart said "M" for the same value, and "M"
// meant Miliar in id but Million in en). Keep every compact money label in the app
// going through this one function.

export function formatCompactCurrency(
	value: number,
	language: string = "id",
	currency = true,
): string {
	const amount = Number.isFinite(value) ? value : 0;
	const magnitude = Math.abs(amount);
	const isEn = language === "en";
	const units = isEn
		? ([[1e12, "T"], [1e9, "B"], [1e6, "M"], [1e3, "K"]] as const)
		: ([[1e12, "T"], [1e9, "M"], [1e6, "jt"], [1e3, "rb"]] as const);
	const unit = units.find(([threshold]) => magnitude >= threshold);
	const number = unit ? amount / unit[0] : amount;
	const formatted = number.toLocaleString(isEn ? "en-US" : "id-ID", {
		maximumFractionDigits: magnitude > 0 && magnitude < 1 ? 6 : 1,
	});
	return `${currency ? "Rp " : ""}${formatted}${unit ? ` ${unit[1]}` : ""}`;
}
