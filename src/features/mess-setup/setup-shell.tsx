"use client"

import { useQueryClient } from "@tanstack/react-query"
import { LogOut } from "lucide-react"
import { useRouter } from "next/navigation"
import { logout } from "@/actions/auth"
import { Logo } from "@/components/brand/logo"
import { Rings } from "@/components/brand/rings"
import { LanguageSwitch, ThemeToggle } from "@/components/layout/preferences"
import { Button } from "@/components/ui/button"
import { useI18n } from "@/components/providers/i18n-provider"

export function useSignOut() {
  const router = useRouter()
  const queryClient = useQueryClient()
  return async () => {
    await logout()
    queryClient.clear()
    router.replace("/login")
    router.refresh()
  }
}

/** Minimal shell for screens shown before a mess is usable (create / pending / rejected / inactive). */
export function SetupShell({ children }: { children: React.ReactNode }) {
  const { t } = useI18n()
  const signOut = useSignOut()
  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-background">
      <Rings size={720} className="top-[-260px] left-1/2 -translate-x-1/2" />
      <header className="relative z-10 flex items-center justify-between px-4 py-4 sm:px-8">
        <Logo tagline={t("app.tagline")} />
        <div className="flex items-center gap-1.5">
          <LanguageSwitch className="hidden sm:inline-flex" />
          <ThemeToggle />
          <Button variant="ghost" size="sm" onClick={signOut} className="text-muted-foreground">
            <LogOut /> <span className="hidden sm:inline">{t("nav.logout")}</span>
          </Button>
        </div>
      </header>
      <main className="relative z-10 flex flex-1 items-start justify-center px-4 pt-6 pb-16 sm:items-center sm:pt-0">
        {children}
      </main>
    </div>
  )
}
