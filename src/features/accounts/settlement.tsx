"use client"

import { BalanceAmount, BalanceBadge, balanceKind } from "@/components/common/balance"
import { MemberAvatar } from "@/components/common/member-avatar"
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useI18n } from "@/components/providers/i18n-provider"
import type { SettlementRow } from "@/lib/types"
import { cn } from "@/lib/utils"

/** Member final settlement table (desktop) with totals. */
export function SettlementTable({ rows, highlightId }: { rows: SettlementRow[]; highlightId?: string }) {
  const { t, money, num } = useI18n()
  const sum = (k: keyof SettlementRow) => rows.reduce((s, r) => s + (r[k] as number), 0)
  return (
    <Table>
      <TableHeader>
        <TableRow className="bg-muted/40 hover:bg-muted/40">
          <TableHead className="pl-4">{t("common.member")}</TableHead>
          <TableHead className="text-right">{t("accounts.meals")}</TableHead>
          <TableHead className="text-right">{t("accounts.mealCost")}</TableHead>
          <TableHead className="text-right">{t("accounts.rent")}</TableHead>
          <TableHead className="text-right">{t("accounts.otherShare")}</TableHead>
          <TableHead className="text-right">{t("accounts.totalCost")}</TableHead>
          <TableHead className="text-right">{t("accounts.paid")}</TableHead>
          <TableHead className="pr-4 text-right">{t("accounts.balance")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.member_id} className={cn(r.member_id === highlightId && "bg-accent/40", r.status === "removed" && "opacity-70")}>
            <TableCell className="pl-4">
              <span className="flex items-center gap-2 font-medium">
                <MemberAvatar name={r.full_name} src={r.avatar_url} className="size-7" />
                <span className="max-w-36 truncate">{r.full_name}</span>
              </span>
            </TableCell>
            <TableCell className="tabular text-right">{num(r.meals, 1)}</TableCell>
            <TableCell className="tabular text-right">{money(r.meal_cost)}</TableCell>
            <TableCell className="tabular text-right">{money(r.rent)}</TableCell>
            <TableCell className="tabular text-right">{money(r.other_share)}</TableCell>
            <TableCell className="tabular text-right font-semibold">{money(r.total_cost)}</TableCell>
            <TableCell className="tabular text-right text-success">{money(r.paid)}</TableCell>
            <TableCell className="pr-4 text-right">
              <BalanceAmount balance={r.balance} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
      {rows.length > 1 && (
        <TableFooter>
          <TableRow>
            <TableCell className="pl-4 font-semibold">{t("accounts.totals")}</TableCell>
            <TableCell className="tabular text-right font-semibold">{num(sum("meals"), 1)}</TableCell>
            <TableCell className="tabular text-right font-semibold">{money(sum("meal_cost"))}</TableCell>
            <TableCell className="tabular text-right font-semibold">{money(sum("rent"))}</TableCell>
            <TableCell className="tabular text-right font-semibold">{money(sum("other_share"))}</TableCell>
            <TableCell className="tabular text-right font-semibold">{money(sum("total_cost"))}</TableCell>
            <TableCell className="tabular text-right font-semibold text-success">{money(sum("paid"))}</TableCell>
            <TableCell className="pr-4" />
          </TableRow>
        </TableFooter>
      )}
    </Table>
  )
}

/** Card version of one member's settlement — mirrors the printed হিসাব layout. */
export function SettlementCard({ row, title, className }: { row: SettlementRow; title?: string; className?: string }) {
  const { t, money, num } = useI18n()
  const kind = balanceKind(row.balance)
  const lines: [string, string][] = [
    [t("accounts.meals"), num(row.meals, 1)],
    [t("accounts.mealCost"), money(row.meal_cost)],
    [t("accounts.rent"), money(row.rent)],
    [t("accounts.otherShare"), money(row.other_share)],
  ]
  return (
    <div className={cn("rounded-xl border bg-card p-4", className)}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-2">
          <MemberAvatar name={row.full_name} src={row.avatar_url} className="size-8" />
          <span className="truncate font-semibold">{title ?? row.full_name}</span>
        </span>
        <BalanceBadge balance={row.balance} />
      </div>
      <dl className="tabular grid gap-1.5 text-sm">
        {lines.map(([k, v]) => (
          <div key={k} className="flex justify-between">
            <dt className="text-muted-foreground">{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
        <div className="mt-1 flex justify-between border-t pt-2 font-semibold">
          <dt>{t("accounts.totalCost")}</dt>
          <dd>{money(row.total_cost)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">{t("accounts.paid")}</dt>
          <dd className="text-success">{money(row.paid)}</dd>
        </div>
        <div
          className={cn(
            "mt-1 flex items-center justify-between rounded-lg px-3 py-2 font-semibold",
            kind === "due" && "bg-danger-soft text-destructive",
            kind === "advance" && "bg-success-soft text-success",
            kind === "settled" && "bg-muted text-muted-foreground"
          )}
        >
          <dt>{t("accounts.balance")}</dt>
          <dd className="text-base">
            {kind === "advance" ? "+" : kind === "due" ? "−" : ""}
            {money(Math.abs(row.balance))}
          </dd>
        </div>
      </dl>
    </div>
  )
}
