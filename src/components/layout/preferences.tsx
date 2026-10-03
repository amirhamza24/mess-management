"use client"

import { Monitor, Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { useI18n } from "@/components/providers/i18n-provider"
import type { Lang } from "@/i18n"
import { cn } from "@/lib/utils"

/** Switches theme with a short, global colour transition. */
export function useSmoothTheme() {
  const { theme, resolvedTheme, setTheme } = useTheme()
  const change = (next: string) => {
    const root = document.documentElement
    root.classList.add("theme-transition")
    setTheme(next)
    window.setTimeout(() => root.classList.remove("theme-transition"), 300)
  }
  return { theme, resolvedTheme, setTheme: change }
}

function useMounted() {
  const [mounted, setMounted] = useState(false)
  // eslint-disable-next-line react-hooks/set-state-in-effect -- hydration guard for theme
  useEffect(() => setMounted(true), [])
  return mounted
}

export function ThemeToggle({ className }: { className?: string }) {
  const { t } = useI18n()
  const { resolvedTheme, setTheme } = useSmoothTheme()
  const mounted = useMounted()
  const isDark = mounted && resolvedTheme === "dark"
  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn("text-muted-foreground hover:text-foreground", className)}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={t("nav.theme")}
      title={isDark ? t("common.light") : t("common.dark")}
    >
      <Sun className={cn("absolute transition-all", isDark ? "scale-0 -rotate-90" : "scale-100 rotate-0")} />
      <Moon className={cn("absolute transition-all", isDark ? "scale-100 rotate-0" : "scale-0 rotate-90")} />
    </Button>
  )
}

/** Segmented "বাংলা | English" switch. */
export function LanguageSwitch({ className, size = "sm" }: { className?: string; size?: "sm" | "md" }) {
  const { lang, setLang, t } = useI18n()
  const options: { value: Lang; label: string }[] = [
    { value: "bn", label: "বাংলা" },
    { value: "en", label: "English" },
  ]
  return (
    <div
      role="radiogroup"
      aria-label={t("nav.language")}
      className={cn("inline-flex items-center rounded-lg border bg-muted/50 p-0.5", className)}
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={lang === o.value}
          onClick={() => setLang(o.value)}
          className={cn(
            "rounded-md font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
            size === "sm" ? "px-2 py-1 text-xs" : "px-3 py-1.5 text-sm",
            lang === o.value
              ? "bg-card text-foreground shadow-xs ring-1 ring-border"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/** Light / Dark / System segmented control (settings page). */
export function ThemeSelect() {
  const { t } = useI18n()
  const { theme, setTheme } = useSmoothTheme()
  const mounted = useMounted()
  const options = [
    { value: "light", label: t("common.light"), icon: Sun },
    { value: "dark", label: t("common.dark"), icon: Moon },
    { value: "system", label: t("common.system"), icon: Monitor },
  ]
  return (
    <div role="radiogroup" aria-label={t("nav.theme")} className="inline-flex rounded-lg border bg-muted/50 p-0.5">
      {options.map((o) => {
        const active = mounted && theme === o.value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setTheme(o.value)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
              active ? "bg-card text-foreground shadow-xs ring-1 ring-border" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <o.icon className="size-3.5" />
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
