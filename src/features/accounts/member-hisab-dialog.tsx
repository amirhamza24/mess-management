"use client"

import { toJpeg, toPng } from "html-to-image"
import {
  Calculator,
  CheckCircle2,
  Download,
  Home,
  ImageIcon,
  Loader2,
  Receipt,
  TrendingDown,
  TrendingUp,
  UtensilsCrossed,
  Wallet,
  type LucideIcon,
} from "lucide-react"
import { useRef, useState } from "react"
import { toast } from "sonner"
import { balanceKind } from "@/components/common/balance"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useI18n } from "@/components/providers/i18n-provider"
import type { MonthlyCycle, SettlementRow } from "@/lib/types"
import { cn } from "@/lib/utils"

type Format = "png" | "jpg"

/**
 * One member's monthly Hisab as a colourful card, downloadable as PNG / JPG.
 * The card uses fixed (non-theme) colours so the exported image looks the same
 * in light and dark mode.
 */
export function MemberHisabDialog({
  row,
  cycle,
  messName,
  mealRate,
  onClose,
}: {
  row: SettlementRow | null
  cycle: MonthlyCycle
  messName: string
  mealRate: number
  onClose: () => void
}) {
  const { t, monthName } = useI18n()
  const cardRef = useRef<HTMLDivElement>(null)
  const [busy, setBusy] = useState<Format | null>(null)

  const download = async (format: Format) => {
    if (!cardRef.current || !row) return
    setBusy(format)
    try {
      const options = { pixelRatio: 2.5, backgroundColor: "#ffffff", cacheBust: true }
      const url = format === "png" ? await toPng(cardRef.current, options) : await toJpeg(cardRef.current, { ...options, quality: 0.95 })
      const slug = row.full_name.trim().toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "") || "member"
      const link = document.createElement("a")
      link.href = url
      link.download = `hisab-${slug}-${cycle.year}-${String(cycle.month).padStart(2, "0")}.${format}`
      link.click()
      toast.success(t("hisabCard.downloaded"))
    } catch {
      toast.error(t("hisabCard.downloadFailed"))
    } finally {
      setBusy(null)
    }
  }

  return (
    <Dialog open={!!row} onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="max-h-[92dvh] gap-4 overflow-y-auto p-4 sm:max-w-[30rem] sm:p-5">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="size-4 text-primary" /> {t("hisabCard.dialogTitle")}
          </DialogTitle>
          <DialogDescription>{t("hisabCard.dialogDesc")}</DialogDescription>
        </DialogHeader>

        {row && (
          <div className="flex min-w-0 justify-center">
            <HisabCard ref={cardRef} row={row} messName={messName} month={monthName(cycle.year, cycle.month)} mealRate={mealRate} />
          </div>
        )}

        <DialogFooter className="min-w-0 gap-2 sm:justify-between">
          <Button variant="outline" onClick={onClose} disabled={!!busy}>
            {t("common.close")}
          </Button>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <Button variant="outline" onClick={() => download("jpg")} disabled={!!busy}>
              {busy === "jpg" ? <Loader2 className="animate-spin" /> : <Download />}
              {busy === "jpg" ? t("hisabCard.preparing") : t("hisabCard.downloadJpg")}
            </Button>
            <Button onClick={() => download("png")} disabled={!!busy}>
              {busy === "png" ? <Loader2 className="animate-spin" /> : <Download />}
              {busy === "png" ? t("hisabCard.preparing") : t("hisabCard.downloadPng")}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

const TONES = {
  violet: { tile: "bg-violet-50 ring-violet-100", icon: "bg-violet-600 text-white", value: "text-violet-800" },
  indigo: { tile: "bg-indigo-50 ring-indigo-100", icon: "bg-indigo-500 text-white", value: "text-indigo-800" },
  orange: { tile: "bg-orange-50 ring-orange-100", icon: "bg-orange-500 text-white", value: "text-orange-800" },
  sky: { tile: "bg-sky-50 ring-sky-100", icon: "bg-sky-500 text-white", value: "text-sky-800" },
  amber: { tile: "bg-amber-50 ring-amber-100", icon: "bg-amber-500 text-white", value: "text-amber-800" },
  emerald: { tile: "bg-emerald-50 ring-emerald-100", icon: "bg-emerald-500 text-white", value: "text-emerald-800" },
} as const

function Tile({ icon: Icon, label, value, tone }: { icon: LucideIcon; label: string; value: string; tone: keyof typeof TONES }) {
  const c = TONES[tone]
  return (
    <div className={cn("flex items-center gap-3 rounded-2xl p-3 ring-1", c.tile)}>
      <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl shadow-sm", c.icon)}>
        <Icon className="size-4" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-[0.7rem] font-medium text-slate-500">{label}</p>
        <p className={cn("tabular truncate text-[0.95rem] font-bold", c.value)}>{value}</p>
      </div>
    </div>
  )
}

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("")
}

function HisabCard({
  ref,
  row,
  messName,
  month,
  mealRate,
}: {
  ref: React.Ref<HTMLDivElement>
  row: SettlementRow
  messName: string
  month: string
  mealRate: number
}) {
  const { t, money, num, date } = useI18n()
  const kind = balanceKind(row.balance)
  const balance = {
    due: {
      box: "from-rose-500 to-pink-600",
      label: t("hisabCard.due"),
      hint: t("hisabCard.dueHint"),
      icon: TrendingDown,
    },
    advance: {
      box: "from-emerald-500 to-teal-600",
      label: t("hisabCard.advance"),
      hint: t("hisabCard.advanceHint"),
      icon: TrendingUp,
    },
    settled: {
      box: "from-slate-500 to-slate-700",
      label: t("hisabCard.settled"),
      hint: t("hisabCard.settledHint"),
      icon: CheckCircle2,
    },
  }[kind]

  return (
    <div ref={ref} className="w-full max-w-[26rem] overflow-hidden rounded-3xl bg-white font-sans text-slate-900 shadow-xl ring-1 ring-slate-200">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-violet-700 via-violet-600 to-fuchsia-500 px-5 pt-5 pb-14 text-white">
        <span className="absolute -top-16 -right-12 size-48 rounded-full border border-white/20" />
        <span className="absolute -top-6 -right-2 size-28 rounded-full border border-white/25" />
        <span className="absolute -bottom-20 -left-10 size-44 rounded-full border border-white/15" />
        <div className="relative flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-[0.7rem] font-semibold tracking-[0.14em] text-white/75 uppercase">{messName}</p>
            <p className="mt-1 text-xl font-bold">{t("hisabCard.title")}</p>
          </div>
          <span className="shrink-0 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold ring-1 ring-white/25">{month}</span>
        </div>
      </div>

      {/* Member */}
      <div className="relative -mt-10 px-5">
        <div className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-lg ring-1 ring-slate-100">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-base font-bold text-white">
            {initials(row.full_name)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-bold">{row.full_name}</p>
            <p className="text-xs text-slate-500">
              {num(row.meals, 1)} {t("accounts.meals")} · {t("hisabCard.mealRate")} {money(mealRate, { fixed: true })}
            </p>
          </div>
        </div>
      </div>

      {/* Balance */}
      <div className="px-5 pt-4">
        <div className={cn("relative overflow-hidden rounded-2xl bg-gradient-to-br p-4 text-white", balance.box)}>
          <span className="absolute -right-8 -bottom-10 size-32 rounded-full border border-white/20" />
          <div className="relative flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-white/85">{balance.label}</p>
              <p className="tabular mt-0.5 text-3xl font-extrabold tracking-tight">{money(Math.abs(row.balance))}</p>
              <p className="mt-1 text-[0.7rem] text-white/80">{balance.hint}</p>
            </div>
            <span className="flex size-11 items-center justify-center rounded-full bg-white/20">
              <balance.icon className="size-5" />
            </span>
          </div>
        </div>
      </div>

      {/* Breakdown */}
      <div className="grid grid-cols-2 gap-2.5 px-5 pt-4">
        <Tile icon={UtensilsCrossed} tone="violet" label={t("hisabCard.totalMeals")} value={num(row.meals, 1)} />
        <Tile icon={Calculator} tone="orange" label={t("hisabCard.mealCost")} value={money(row.meal_cost)} />
        <Tile icon={Home} tone="sky" label={t("hisabCard.rent")} value={money(row.rent)} />
        <Tile icon={Receipt} tone="amber" label={t("hisabCard.otherShare")} value={money(row.other_share)} />
        <Tile icon={Wallet} tone="indigo" label={t("hisabCard.totalCost")} value={money(row.total_cost)} />
        <Tile icon={CheckCircle2} tone="emerald" label={t("hisabCard.paid")} value={money(row.paid)} />
      </div>

      {/* Formula */}
      <div className="px-5 pt-4">
        <div className="tabular flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1 rounded-xl bg-slate-50 px-3 py-2.5 text-center text-xs text-slate-600 ring-1 ring-slate-100">
          <span className="font-semibold text-slate-800">{money(row.total_cost)}</span>
          <span>−</span>
          <span className="font-semibold text-emerald-700">{money(row.paid)}</span>
          <span>=</span>
          <span className={cn("font-bold", kind === "due" ? "text-rose-600" : kind === "advance" ? "text-emerald-600" : "text-slate-700")}>
            {kind === "advance" ? "+" : kind === "due" ? "−" : ""}
            {money(Math.abs(row.balance))}
          </span>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-4 flex items-center justify-between border-t border-dashed border-slate-200 px-5 py-3 text-[0.7rem] text-slate-400">
        <span className="font-semibold text-violet-600">MessHisab</span>
        <span>{t("hisabCard.generated", { date: date(new Date().toISOString().slice(0, 10)) })}</span>
      </div>
    </div>
  )
}
