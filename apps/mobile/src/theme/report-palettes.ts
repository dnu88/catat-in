import { financeEditorial as fe } from './finance-editorial'
import type { ThemeMode } from './tokens'

const canonicalReportCategoryColors = [
  fe.blueBright,
  fe.blue,
  '#2F7FC1',
  '#285D99',
  fe.blueGlow,
  '#3B7DB8',
  '#62AEE0',
  '#4D91C7',
] as const

export const reportBlueGradientPalette = [
  [fe.blueGlow, fe.blueBright],
  [fe.blue, fe.navySurface],
  ['#62AEE0', fe.blue],
  ['#3B7DB8', fe.blueDeep],
  ['#285D99', fe.navySurface],
  ['#85C6E8', '#255A94'],
  ['#4D91C7', '#102C62'],
] as const

export const reportCategoryPalette: Record<ThemeMode, string[]> = {
  light: [...canonicalReportCategoryColors],
  dark: [...canonicalReportCategoryColors],
}

export const reportCategoryRoleColors = {
  light: {
    success: canonicalReportCategoryColors[0],
    navy: canonicalReportCategoryColors[1],
    warning: canonicalReportCategoryColors[2],
    danger: canonicalReportCategoryColors[3],
    info: canonicalReportCategoryColors[4],
    neutral: fe.textMuted,
  },
  dark: {
    success: canonicalReportCategoryColors[0],
    navy: canonicalReportCategoryColors[1],
    warning: canonicalReportCategoryColors[2],
    danger: canonicalReportCategoryColors[3],
    info: canonicalReportCategoryColors[4],
    neutral: fe.textMuted,
  },
} as const satisfies Record<ThemeMode, Record<string, string>>

export const reportDefaultCategoryColors = {
  food: reportCategoryRoleColors.light.success,
  transport: reportCategoryRoleColors.light.navy,
  shopping: reportCategoryRoleColors.light.warning,
  bills: reportCategoryRoleColors.light.danger,
  entertainment: reportCategoryRoleColors.light.info,
  other: reportCategoryRoleColors.light.neutral,
} as const

const canonicalBudgetEnvelopeColors = [
  '#62AEE0',
  fe.blueGlow,
  '#4D91C7',
  fe.blueBright,
  '#3B7DB8',
  '#2F7FC1',
  '#285D99',
  fe.blue,
] as const

export const budgetEnvelopePalette: Record<ThemeMode, string[]> = {
  light: [...canonicalBudgetEnvelopeColors],
  dark: [...canonicalBudgetEnvelopeColors],
}

export const kaswiseLogoPalette = {
  graphiteStart: '#4B5563',
  graphiteEnd: '#1F2937',
  mistStart: '#9CA3AF',
  mistEnd: '#4B5563',
  navyStart: fe.blueDeep,
  navyEnd: fe.navySurface,
  blueStart: fe.blueGlow,
  blueEnd: fe.blueBright,
} as const

export function getReportCategoryColor(mode: ThemeMode, index: number) {
  const palette = reportCategoryPalette[mode]
  return palette[index % palette.length]
}
