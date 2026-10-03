import {
  Calculator,
  FileBarChart2,
  Home,
  LayoutDashboard,
  Receipt,
  Settings,
  ShoppingBasket,
  UserCheck,
  UserCircle2,
  Users,
  UtensilsCrossed,
  Wallet,
  type LucideIcon,
} from "lucide-react"
import type { TKey } from "@/i18n"

export interface NavItem {
  href: string
  label: TKey
  icon: LucideIcon
  managerOnly?: boolean
  /** Page depends on the selected month (shows the month switcher). */
  monthly?: boolean
}

export const MAIN_NAV: NavItem[] = [
  { href: "/dashboard", label: "nav.dashboard", icon: LayoutDashboard, monthly: true },
  { href: "/members", label: "nav.members", icon: Users, managerOnly: true, monthly: true },
  { href: "/users", label: "nav.users", icon: UserCheck, managerOnly: true },
  { href: "/meals", label: "nav.meals", icon: UtensilsCrossed, monthly: true },
  { href: "/bazar", label: "nav.bazar", icon: ShoppingBasket, monthly: true },
  { href: "/payments", label: "nav.payments", icon: Wallet, monthly: true },
  { href: "/rent", label: "nav.rent", icon: Home, monthly: true },
  { href: "/expenses", label: "nav.expenses", icon: Receipt, monthly: true },
  { href: "/accounts", label: "nav.accounts", icon: Calculator, monthly: true },
  { href: "/reports", label: "nav.reports", icon: FileBarChart2, monthly: true },
]

export const SECONDARY_NAV: NavItem[] = [
  { href: "/settings", label: "nav.settings", icon: Settings },
  { href: "/profile", label: "nav.profile", icon: UserCircle2 },
]

/** Shown in the mobile bottom bar; everything else lives in the drawer. */
export const BOTTOM_NAV = ["/dashboard", "/meals", "/bazar", "/accounts"]

export function findNavItem(pathname: string) {
  return [...MAIN_NAV, ...SECONDARY_NAV].find(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`)
  )
}

export function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}
