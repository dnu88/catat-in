/** Preserve transfers on the premium report path; keep the legacy fallback. */
export function reportTransactionType(
 type: string | null | undefined,
 premium: boolean,
): 'income' | 'expense' | 'transfer' {
 if (type === 'income') return 'income';
 if (premium && type === 'transfer') return 'transfer';
 return 'expense';
}
