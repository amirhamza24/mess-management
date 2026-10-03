"use client"

import { ArrowDownRight, ArrowUpRight, Check } from "lucide-react"
import { useI18n } from "@/components/providers/i18n-provider"
import { cn } from "@/lib/utils"

/** Balance = total cost − paid. Positive → Due, negative → Advance. */
export function balanceKind(balance: number) {
  if (Math.abs(balance) < 0.005) return "settled" as const
  return balance > 0 ? ("due" as const) : ("advance" as const)
}

export function BalanceBadge({ balance, className }: { balance: number; className?: string }) {
  const { t } = useI18n()
  const kind = balanceKind(balance)
  const styles = {
    due: "bg-danger-soft text-destructive",
    advance: "bg-success-soft text-success",
    settled: "bg-muted text-muted-foreground",
  }[kind]
  const Icon = { due: ArrowUpRight, advance: ArrowDownRight, settled: Check }[kind]
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", styles, className)}>
      <Icon className="size-3" />
      {t(`accounts.${kind}`)}
    </span>
  )
}

/** Amount shown as "৳120 Due" / "৳40 Advance" with colour. */
export function BalanceAmount({ balance, className, showLabel = true }: { balance: number; className?: string; showLabel?: boolean }) {
  const { t, money } = useI18n()
  const kind = balanceKind(balance)
  return (
    <span
      className={cn(
        "tabular font-semibold",
        kind === "due" && "text-destructive",
        kind === "advance" && "text-success",
        kind === "settled" && "text-muted-foreground",
        className
      )}
    >
      {kind === "advance" ? "+" : ""}
      {money(Math.abs(balance))}
      {showLabel && kind !== "settled" && (
        <span className="ml-1 text-xs font-medium">{t(`accounts.${kind}`)}</span>
      )}
    </span>
  )
}
