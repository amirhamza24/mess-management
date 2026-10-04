"use client"

import { useQuery } from "@tanstack/react-query"
import { LogOut, Menu, Settings, UserCircle2 } from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useState } from "react"
import { Logo } from "@/components/brand/logo"
import { MemberAvatar } from "@/components/common/member-avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { useI18n } from "@/components/providers/i18n-provider"
import { useMess } from "@/features/mess/mess-provider"
import { useSignOut } from "@/features/auth/use-sign-out"
import { query } from "@/lib/api"
import { qk } from "@/lib/query-keys"
import { cn } from "@/lib/utils"
import { MonthSwitcher } from "./month-switcher"
import { BOTTOM_NAV, findNavItem, isActive, MAIN_NAV, SECONDARY_NAV, type NavItem } from "./nav-items"
import { LanguageSwitch, ThemeToggle } from "./preferences"

/** Registrations waiting for approval (managers only), shown as a badge. */
function usePendingCount() {
  const { isManager } = useMess()
  const { data } = useQuery({
    queryKey: qk.pendingCount,
    queryFn: () => query("pendingCount"),
    enabled: isManager,
    refetchInterval: 60_000,
  })
  return data ?? 0
}

function useNavItems() {
  const { isManager } = useMess()
  return MAIN_NAV.filter((item) => !item.managerOnly || isManager)
}

function NavLink({ item, onNavigate, badge }: { item: NavItem; onNavigate?: () => void; badge?: number }) {
  const pathname = usePathname()
  const { t } = useI18n()
  const active = isActive(pathname, item.href)
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm shadow-primary/25"
          : "text-sidebar-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      <item.icon className={cn("size-4 shrink-0", active ? "text-sidebar-primary-foreground" : "text-muted-foreground group-hover:text-foreground")} />
      <span className="truncate">{t(item.label)}</span>
      {!!badge && (
        <span className={cn("ml-auto min-w-5 rounded-full px-1.5 py-0.5 text-center text-[0.65rem] leading-none font-semibold", active ? "bg-white text-primary" : "bg-primary text-primary-foreground")}>
          {badge}
        </span>
      )}
    </Link>
  )
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useI18n()
  const { mess, isManager } = useMess()
  const items = useNavItems()
  const logout = useSignOut()
  const pending = usePendingCount()

  return (
    <div className="flex h-full flex-col">
      <div className="px-4 pt-5 pb-4">
        <Logo tagline={mess.name} />
      </div>

      <nav className="scrollbar-thin flex-1 space-y-0.5 overflow-y-auto px-3" aria-label={t("nav.menu")}>
        {items.map((item) => (
          <NavLink key={item.href} item={item} onNavigate={onNavigate} badge={item.href === "/users" ? pending : undefined} />
        ))}

        <div className="my-3 h-px bg-sidebar-border" />

        <NavLink item={SECONDARY_NAV[0]} onNavigate={onNavigate} />
        <div className="flex items-center justify-between gap-2 px-3 py-2 text-sm text-sidebar-foreground">
          <span>{t("nav.theme")}</span>
          <ThemeToggle className="size-7" />
        </div>
        <div className="flex items-center justify-between gap-2 px-3 py-1.5 text-sm text-sidebar-foreground">
          <span>{t("nav.language")}</span>
          <LanguageSwitch />
        </div>

        <div className="my-3 h-px bg-sidebar-border" />

        <NavLink item={SECONDARY_NAV[1]} onNavigate={onNavigate} />
        <button
          type="button"
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-danger-soft hover:text-destructive"
        >
          <LogOut className="size-4 text-muted-foreground" />
          {t("nav.logout")}
        </button>
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-muted-foreground">
          <Badge variant="secondary" className={cn(isManager && "bg-accent text-accent-foreground")}>
            {t(isManager ? "roles.manager" : "roles.member")}
          </Badge>
          <span className="truncate">{t("app.tagline")}</span>
        </div>
      </div>
    </div>
  )
}

function UserMenu() {
  const { t } = useI18n()
  const { displayName, me, isManager } = useMess()
  const logout = useSignOut()
  const router = useRouter()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon" className="rounded-full" aria-label={t("nav.profile")}>
            <MemberAvatar name={displayName} src={me.member?.avatar_url} />
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex flex-col gap-0.5 py-2">
            <span className="truncate text-sm font-medium text-foreground">{displayName}</span>
            <span className="truncate text-xs font-normal">{me.user.email}</span>
            <span className="mt-1 text-[0.7rem] font-medium text-primary">
              {t(isManager ? "roles.manager" : "roles.member")}
            </span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push("/profile")}>
          <UserCircle2 /> {t("nav.profile")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push("/settings")}>
          <Settings /> {t("nav.settings")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={logout}>
          <LogOut /> {t("nav.logout")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function BottomNav({ onMore }: { onMore: () => void }) {
  const pathname = usePathname()
  const { t } = useI18n()
  const items = MAIN_NAV.filter((i) => BOTTOM_NAV.includes(i.href))
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur supports-backdrop-filter:bg-card/85 lg:hidden"
      aria-label={t("nav.menu")}
    >
      <div className="grid grid-cols-5">
        {items.map((item) => {
          const active = isActive(pathname, item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-col items-center gap-1 px-1 py-2 text-[0.65rem] font-medium transition-colors",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              <item.icon className="size-5" />
              <span className="max-w-full truncate">{t(item.label)}</span>
            </Link>
          )
        })}
        <button
          type="button"
          onClick={onMore}
          className="flex flex-col items-center gap-1 px-1 py-2 text-[0.65rem] font-medium text-muted-foreground"
        >
          <Menu className="size-5" />
          {t("nav.more")}
        </button>
      </div>
    </nav>
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { t } = useI18n()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const current = findNavItem(pathname)

  return (
    <div className="min-h-dvh bg-background">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-sidebar-border bg-sidebar lg:block">
        <SidebarContent />
      </aside>

      {/* Mobile drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="left" className="w-72 bg-sidebar p-0" showCloseButton={false}>
          <SheetTitle className="sr-only">{t("nav.menu")}</SheetTitle>
          <SidebarContent onNavigate={() => setDrawerOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 border-b bg-background/90 backdrop-blur supports-backdrop-filter:bg-background/75">
          <div className="flex h-14 items-center gap-2 px-4 sm:px-6">
            <Button
              variant="ghost"
              size="icon"
              className="-ml-2 lg:hidden"
              onClick={() => setDrawerOpen(true)}
              aria-label={t("nav.menu")}
            >
              <Menu />
            </Button>
            <h2 className="min-w-0 truncate text-sm font-semibold sm:text-base">
              {current ? t(current.label) : ""}
            </h2>
            <div className="ml-auto flex items-center gap-1.5">
              {current?.monthly && <MonthSwitcher className="hidden md:flex" />}
              <LanguageSwitch className="hidden sm:inline-flex" />
              <ThemeToggle />
              <UserMenu />
            </div>
          </div>
          {current?.monthly && (
            <div className="flex justify-center border-t px-2 py-1.5 md:hidden">
              <MonthSwitcher />
            </div>
          )}
        </header>

        <main className="mx-auto w-full max-w-7xl px-4 pt-5 pb-28 sm:px-6 lg:pb-10">{children}</main>
      </div>

      <BottomNav onMore={() => setDrawerOpen(true)} />
    </div>
  )
}
