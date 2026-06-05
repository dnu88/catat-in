import type { ComponentProps } from 'react'
import {
  ArrowLeft,
  Bell,
  Camera,
  CheckCircle,
  Bus,
  Car,
  ChartBar,
  ChartLineUp,
  ChartPieSlice,
  Coffee,
  CreditCard,
  DotsThreeCircle,
  Envelope,
  Eye,
  EyeSlash,
  FileText,
  FilmSlate,
  ForkKnife,
  GameController,
  Gear,
  Gift,
  House,
  ImageSquare,
  Lightbulb,
  ListDashes,
  Lock,
  Plus,
  Receipt,
  Robot,
  ShoppingCart,
  SoccerBall,
  TrendUp,
  Trash,
  TrayArrowDown,
  UploadSimple,
  X,
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
  camera: Camera,
  image: ImageSquare,
  trash: Trash,
  check: CheckCircle,
  close: X,
  food: ForkKnife,
  coffee: Coffee,
  transport: Car,
  bus: Bus,
  sport: SoccerBall,
  recreation: GameController,
  movie: FilmSlate,
  groceries: ShoppingCart,
  household: House,
  investment: TrendUp,
  gift: Gift,
  otherExpenses: DotsThreeCircle,
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
