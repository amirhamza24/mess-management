"use client"

import { Building2, Clock3, LayoutDashboard, LogOut, Menu, ShieldCheck, type LucideIcon } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { Logo } from "@/components/brand/logo"
import { MemberAvatar } from "@/components/common/member-avatar"
import { LanguageSwitch, ThemeToggle } from "@/components/layout/preferences"
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
import { useSignOut } from "@/features/mess-setup/setup-shell"
import type { TKey } from "@/i18n"
import { cn } from "@/lib/utils"
import { MessActionsProvider } from "./mess-actions"
import { useAdminStats } from "./queries"

interface AdminNavItem {
  href: string
  label: TKey
  icon: LucideIcon
  isActive: (path: string) => boolean
}

const NAV: AdminNavItem[] = [
  { href: "/admin", label: "admin.navOverview", icon: LayoutDashboard, isActive: (p) => p === "/admin" },
  {
    href: "/admin/messes",
    label: "admin.navMesses",
    icon: Building2,
    isActive: (p) => p.startsWith("/admin/messes") && !p.startsWith("/admin/messes/pending"),
  },
  {
    href: "/admin/messes/pending",
    label: "admin.navPending",
    icon: Clock3,
    isActive: (p) => p.startsWith("/admin/messes/pending"),
  },
]

export interface AdminUser {
  name: string
  email: string
}

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useI18n()
  const pathname = usePathname()
  const signOut = useSignOut()
  const { data: stats } = useAdminStats()

  return (
    <div className="flex h-full flex-col">
      <div className="px-4 pt-5 pb-4">
        <Logo tagline={t("admin.panel")} />
      </div>
      <nav className="flex-1 space-y-0.5 px-3" aria-label={t("nav.menu")}>
        {NAV.map((item) => {
          const active = item.isActive(pathname)
          const badge = item.href === "/admin/messes/pending" ? stats?.pending : undefined
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {active && <span className="absolute inset-y-1.5 left-0 w-[3px] rounded-r-full bg-sidebar-primary" />}
              <item.icon className={cn("size-4", active ? "text-sidebar-primary" : "text-muted-foreground group-hover:text-foreground")} />
              <span className="truncate">{t(item.label)}</span>
              {!!badge && (
                <span className="ml-auto min-w-5 rounded-full bg-primary px-1.5 py-0.5 text-center text-[0.65rem] leading-none font-semibold text-primary-foreground">
                  {badge}
                </span>
              )}
            </Link>
          )
        })}

        <div className="my-3 h-px bg-sidebar-border" />
        <div className="flex items-center justify-between px-3 py-2 text-sm text-sidebar-foreground">
          <span>{t("nav.theme")}</span>
          <ThemeToggle className="size-7" />
        </div>
        <div className="flex items-center justify-between px-3 py-1.5 text-sm text-sidebar-foreground">
          <span>{t("nav.language")}</span>
          <LanguageSwitch />
        </div>
        <div className="my-3 h-px bg-sidebar-border" />
        <button
          type="button"
          onClick={signOut}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-danger-soft hover:text-destructive"
        >
          <LogOut className="size-4 text-muted-foreground" />
          {t("nav.logout")}
        </button>
      </nav>
      <div className="border-t border-sidebar-border p-3">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">
          <ShieldCheck className="size-3" /> {t("admin.superAdmin")}
        </span>
      </div>
    </div>
  )
}

export function AdminShell({ user, children }: { user: AdminUser; children: React.ReactNode }) {
  const { t } = useI18n()
  const pathname = usePathname()
  const signOut = useSignOut()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const current = [...NAV].reverse().find((n) => n.isActive(pathname))

  return (
    <MessActionsProvider>
      <div className="min-h-dvh bg-background">
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-sidebar-border bg-sidebar lg:block">
          <SidebarNav />
        </aside>

        <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
          <SheetContent side="left" className="w-72 bg-sidebar p-0" showCloseButton={false}>
            <SheetTitle className="sr-only">{t("nav.menu")}</SheetTitle>
            <SidebarNav onNavigate={() => setDrawerOpen(false)} />
          </SheetContent>
        </Sheet>

        <div className="lg:pl-64">
          <header className="sticky top-0 z-20 border-b bg-background/90 backdrop-blur supports-backdrop-filter:bg-background/75">
            <div className="flex h-14 items-center gap-2 px-4 sm:px-6">
              <Button variant="ghost" size="icon" className="-ml-2 lg:hidden" onClick={() => setDrawerOpen(true)} aria-label={t("nav.menu")}>
                <Menu />
              </Button>
              <h2 className="min-w-0 truncate text-sm font-semibold sm:text-base">
                {current ? t(current.label) : t("admin.panel")}
              </h2>
              <div className="ml-auto flex items-center gap-1.5">
                <LanguageSwitch className="hidden sm:inline-flex" />
                <ThemeToggle />
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button variant="ghost" size="icon" className="rounded-full" aria-label={t("nav.profile")}>
                        <MemberAvatar name={user.name} />
                      </Button>
                    }
                  />
                  <DropdownMenuContent align="end" className="w-60">
                    <DropdownMenuGroup>
                      <DropdownMenuLabel className="flex flex-col gap-0.5 py-2">
                        <span className="truncate text-sm font-medium text-foreground">{user.name}</span>
                        <span className="truncate text-xs font-normal">{user.email}</span>
                        <span className="mt-1 text-[0.7rem] font-medium text-primary">{t("admin.superAdmin")}</span>
                      </DropdownMenuLabel>
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" onClick={signOut}>
                      <LogOut /> {t("nav.logout")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </header>
          <main className="mx-auto w-full max-w-7xl px-4 pt-5 pb-12 sm:px-6">{children}</main>
        </div>
      </div>
    </MessActionsProvider>
  )
}
