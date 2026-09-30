export const financeEditorial = {
  navy: '#060A1C',
  navySurface: '#071B4F',
  blueDeep: '#0A3D78',
  blue: '#0C4E91',
  blueBright: '#178BD0',
  blueGlow: '#42B7EB',
  paper: '#F7F7F4',
  white: '#FFFFFF',
  ink: '#060A1C',
  slate: '#3D4254',
  muted: '#A3A5A8',
  line: 'rgba(6, 10, 28, 0.08)',
  glass: 'rgba(255, 255, 255, 0.12)',
  glassStrong: 'rgba(255, 255, 255, 0.20)',
  glassBlue: 'rgba(72, 151, 211, 0.28)',
  success: '#22C55E',
  expense: '#111827',
  financialTotal: '#071B4F',
  financialIncome: '#168FA8',
  financialExpense: '#263246',
  financialExpenseAlert: '#B64B55',
} as const;

const transactionIconBluePalette = [
  { color: '#178BD0', background: 'rgba(23,139,208,0.14)', border: 'rgba(23,139,208,0.28)' },
  { color: '#0C4E91', background: 'rgba(12,78,145,0.12)', border: 'rgba(12,78,145,0.24)' },
  { color: '#2F7FC1', background: 'rgba(47,127,193,0.13)', border: 'rgba(47,127,193,0.26)' },
  { color: '#285D99', background: 'rgba(40,93,153,0.12)', border: 'rgba(40,93,153,0.24)' },
] as const;

export function resolveFinancialIconPalette(
  categoryName: string | null | undefined,
  type: string | null | undefined,
) {
  if (type === 'income') {
    return {
      color: financeEditorial.financialIncome,
      background: 'rgba(22,143,168,0.12)',
      border: 'rgba(22,143,168,0.24)',
    };
  }
  if (type === 'transfer') return transactionIconBluePalette[1];
  const key = (categoryName || 'other').trim().toLowerCase();
  const hash = [...key].reduce((sum, character) => sum + character.charCodeAt(0), 0);
  return transactionIconBluePalette[hash % transactionIconBluePalette.length];
}
