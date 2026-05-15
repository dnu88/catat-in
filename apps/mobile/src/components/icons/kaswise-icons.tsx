import type { ComponentProps } from 'react'
import {
  ArrowLeft,
  Bell,
  ChartBar,
  ChartLineUp,
  ChartPieSlice,
  CreditCard,
  Envelope,
  Eye,
  EyeSlash,
  FileText,
  Gear,
  House,
  Lightbulb,
  ListDashes,
  Lock,
  Plus,
  Receipt,
  Robot,
  TrayArrowDown,
  UploadSimple,
  UsersThree,
  Wallet,
} from 'phosphor-react-native'

const iconMap = {
  home: House,
  transactions: ListDashes,
  capture: Plus,
  reports: ChartLineUp,
  settings: Gear,
  wallets: Wallet,
  budgets: ChartPieSlice,
  bills: Receipt,
  groups: UsersThree,
  imports: TrayArrowDown,
  upload: UploadSimple,
  lock: Lock,
  email: Envelope,
  eye: Eye,
  eyeSlash: EyeSlash,
  back: ArrowLeft,
  insight: Lightbulb,
  ai: Robot,
  chart: ChartBar,
  file: FileText,
  card: CreditCard,
  notification: Bell,
} as const

export type KaswiseIconName = keyof typeof iconMap
export const kaswiseIconNames = Object.keys(iconMap) as KaswiseIconName[]

type IconProps = Omit<ComponentProps<typeof House>, 'weight'> & {
  name: KaswiseIconName
  weight?: ComponentProps<typeof House>['weight']
}

export function KaswiseIcon({ name, weight = 'regular', ...props }: IconProps) {
  const Icon = iconMap[name] ?? House
  return <Icon weight={weight} {...props} />
}
