/**
 * Pure function to map entitlement state to a human-readable plan label.
 * Kept in a separate module so tests can import it without pulling in
 * the entire Settings screen and its transitive dependencies (expo-router,
 * react-navigation, etc.).
 */
export function planStatusLabel(ent: { plan?: string } | null): string {
  if (!ent || ent.plan === "free" || !ent.plan) return "Gratis";
  if (ent.plan === "premium") return "Premium";
  return "Gratis";
}
