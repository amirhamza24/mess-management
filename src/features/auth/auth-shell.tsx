"use client"

import { motion, useReducedMotion } from "framer-motion"
import { CalendarCheck2, Receipt, ShoppingBasket, UtensilsCrossed } from "lucide-react"
import { Logo, LogoMark } from "@/components/brand/logo"
import { Rings } from "@/components/brand/rings"
import { LanguageSwitch, ThemeToggle } from "@/components/layout/preferences"
import { useI18n } from "@/components/providers/i18n-provider"

const EASE = [0.16, 1, 0.3, 1] as const

/** Split-screen auth layout: brand visual on the left, form card on the right. */
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      <BrandPanel />
      <div className="relative flex min-h-dvh flex-col overflow-hidden">
        {/* Mobile: subtle rings behind the card */}
        <Rings size={460} className="-top-40 -right-40 lg:hidden" />
        <header className="relative z-10 flex items-center justify-between p-4 sm:p-6">
          <span className="lg:invisible">
            <Logo />
          </span>
          <div className="flex items-center gap-1.5">
            <LanguageSwitch />
            <ThemeToggle />
          </div>
        </header>
        <main className="relative z-10 flex flex-1 items-center justify-center px-4 pb-10 sm:px-6">
          {children}
        </main>
      </div>
    </div>
  )
}

function BrandPanel() {
  const { t, money, num } = useI18n()
  const reduce = useReducedMotion()
  const float = (delay: number) =>
    reduce
      ? {}
      : {
          animate: { y: [0, -6, 0] },
          transition: { duration: 6, repeat: Infinity, ease: "easeInOut" as const, delay },
        }

  return (
    <aside className="relative hidden overflow-hidden bg-brand-deep text-white lg:flex lg:flex-col">
      {/* Ring circles — white on deep violet, very low opacity */}
      <Rings size={760} intensity="medium" tone="light" className="top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(255,255,255,0.08),transparent_55%)]" />

      <div className="relative z-10 flex items-center gap-2.5 p-10">
        <LogoMark className="bg-white/10 ring-1 ring-white/20" />
        <span className="text-lg font-semibold tracking-tight">MessHisab</span>
      </div>

      <div className="relative z-10 flex flex-1 flex-col justify-center px-10 xl:px-16">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE }}
        >
          <h1 className="max-w-md text-3xl leading-tight font-semibold tracking-tight xl:text-4xl">
            {t("app.tagline")}
          </h1>
          <p className="mt-3 max-w-md text-[0.95rem] text-white/70">{t("app.description")}</p>
        </motion.div>

        {/* Floating preview cards: meal, bazar, monthly accounting */}
        <div className="relative mt-12 h-56 max-w-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.15, ease: EASE }}
            className="absolute top-0 left-0 w-60"
          >
            <motion.div {...float(0)} className="rounded-xl bg-white/[0.08] p-4 ring-1 ring-white/15 backdrop-blur-sm">
              <div className="flex items-center gap-2 text-xs text-white/70">
                <UtensilsCrossed className="size-3.5" /> {t("dashboard.mealRate")}
              </div>
              <p className="tabular mt-1.5 text-2xl font-semibold">{money(132.65)}</p>
              <div className="mt-3 flex h-8 items-end gap-1">
                {[40, 55, 35, 70, 60, 85, 50, 65].map((h, i) => (
                  <span key={i} className="flex-1 rounded-sm bg-white/25" style={{ height: `${h}%` }} />
                ))}
              </div>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.3, ease: EASE }}
            className="absolute top-10 right-0 w-52"
          >
            <motion.div {...float(1.2)} className="rounded-xl bg-white/[0.08] p-4 ring-1 ring-white/15 backdrop-blur-sm">
              <div className="flex items-center gap-2 text-xs text-white/70">
                <ShoppingBasket className="size-3.5" /> {t("nav.bazar")}
              </div>
              <ul className="mt-2 space-y-1 text-xs">
                <li className="flex justify-between"><span className="text-white/70">{t("foodCategories.rice")}</span><span className="tabular">{money(1200)}</span></li>
                <li className="flex justify-between"><span className="text-white/70">{t("foodCategories.fish")}</span><span className="tabular">{money(800)}</span></li>
                <li className="flex justify-between"><span className="text-white/70">{t("foodCategories.vegetable")}</span><span className="tabular">{money(450)}</span></li>
              </ul>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.45, ease: EASE }}
            className="absolute bottom-0 left-16 w-64"
          >
            <motion.div {...float(2.4)} className="flex items-center gap-3 rounded-xl bg-white p-3.5 text-slate-900 shadow-xl shadow-black/20">
              <span className="flex size-9 items-center justify-center rounded-lg bg-violet-100 text-violet-700">
                <Receipt className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-slate-500">{t("accounts.balance")}</p>
                <p className="tabular text-sm font-semibold text-emerald-600">+{money(40.75)} {t("accounts.advance")}</p>
              </div>
              <span className="tabular text-xs text-slate-400">{num(25)} {t("accounts.meals")}</span>
            </motion.div>
          </motion.div>
        </div>
      </div>

      <ul className="relative z-10 grid gap-2.5 p-10 text-sm text-white/75 xl:px-16">
        {(["auth.feature1", "auth.feature2", "auth.feature3"] as const).map((key) => (
          <li key={key} className="flex items-center gap-2.5">
            <CalendarCheck2 className="size-4 text-brand-soft" />
            {t(key)}
          </li>
        ))}
      </ul>
    </aside>
  )
}

export function AuthCard({
  title,
  description,
  children,
  footer,
}: {
  title: string
  description: string
  children: React.ReactNode
  footer?: React.ReactNode
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, ease: EASE }}
      className="w-full max-w-[26rem]"
    >
      <div className="rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
        <div className="mb-6">
          <LogoMark className="mb-5" />
          <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        {children}
      </div>
      {footer && <div className="mt-5 text-center text-sm text-muted-foreground">{footer}</div>}
    </motion.div>
  )
}
