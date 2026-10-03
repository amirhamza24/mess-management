"use client"

import { useI18n } from "@/components/providers/i18n-provider"
import type { TKey } from "@/i18n"
import type { CycleSummary, OtherCategory } from "@/lib/types"
import { cn } from "@/lib/utils"

const UTILITIES: OtherCategory[] = ["electricity", "gas", "water", "internet"]

/** Monthly totals as label/value pairs (shared by the Reports page and the PDF). */
export function useMonthlyReportRows(s: CycleSummary) {
  const { t, money, num } = useI18n()
  return [
    { label: t("reports.totalMembers"), value: num(s.member_count) },
    { label: t("reports.totalMeals"), value: num(s.total_meals, 1) },
    { label: t("reports.foodExpense"), value: money(s.food_total) },
    { label: t("reports.mealRate"), value: money(s.meal_rate, { fixed: true }) },
    { label: t("reports.houseRent"), value: money(s.rent_total) },
    { label: t("reports.otherExpenses"), value: money(s.other_total) },
    { label: t("reports.totalPayments"), value: money(s.total_paid), tone: "success" },
    { label: t("reports.totalDue"), value: money(s.total_due), tone: "danger" },
    { label: t("reports.totalAdvance"), value: money(s.total_advance), tone: "success" },
  ] as { label: string; value: string; tone?: "success" | "danger" }[]
}

export function MonthlyReportGrid({ s, compact }: { s: CycleSummary; compact?: boolean }) {
  const rows = useMonthlyReportRows(s)
  return (
    <dl className={cn("grid grid-cols-2 gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-3", compact && "text-sm")}>
      {rows.map((r) => (
        <div key={r.label} className={cn("bg-card", compact ? "p-3" : "p-4")}>
          <dt className="text-xs text-muted-foreground">{r.label}</dt>
          <dd
            className={cn(
              "tabular mt-1 font-semibold",
              compact ? "text-base" : "text-lg",
              r.tone === "success" && "text-success",
              r.tone === "danger" && "text-destructive"
            )}
          >
            {r.value}
          </dd>
        </div>
      ))}
    </dl>
  )
}

function ExpenseSection({ title, rows, total }: { title: string; rows: { label: string; amount: number }[]; total: number }) {
  const { t, money } = useI18n()
  return (
    <tbody className="print-avoid-break">
      <tr className="bg-muted/50">
        <th colSpan={2} className="px-4 py-2 text-left text-xs font-semibold tracking-wide uppercase">
          {title}
        </th>
      </tr>
      {rows.map((r) => (
        <tr key={r.label} className="border-t">
          <td className="px-4 py-2 text-muted-foreground">{r.label}</td>
          <td className="tabular px-4 py-2 text-right">{money(r.amount)}</td>
        </tr>
      ))}
      <tr className="border-t font-semibold">
        <td className="px-4 py-2">{t("common.total")}</td>
        <td className="tabular px-4 py-2 text-right">{money(total)}</td>
      </tr>
    </tbody>
  )
}

/** Food, rent, utilities and other expenses — kept as separate accounts. */
export function ExpenseReportTable({ s }: { s: CycleSummary }) {
  const { t, money } = useI18n()
  const utilities = s.other_by_category.filter((c) => UTILITIES.includes(c.category))
  const others = s.other_by_category.filter((c) => !UTILITIES.includes(c.category))
  const sum = (rows: { amount: number }[]) => rows.reduce((a, r) => a + r.amount, 0)

  return (
    <table className="w-full text-sm">
      <ExpenseSection
        title={t("reports.foodExpenses")}
        rows={s.food_by_category.map((c) => ({ label: t(`foodCategories.${c.category}` as TKey), amount: c.amount }))}
        total={s.food_total}
      />
      <ExpenseSection title={t("reports.houseRent")} rows={[]} total={s.rent_total} />
      <ExpenseSection
        title={t("reports.utilities")}
        rows={utilities.map((c) => ({ label: t(`otherCategories.${c.category}` as TKey), amount: c.amount }))}
        total={sum(utilities)}
      />
      <ExpenseSection
        title={t("reports.otherExpenses")}
        rows={others.map((c) => ({ label: t(`otherCategories.${c.category}` as TKey), amount: c.amount }))}
        total={sum(others)}
      />
      <tbody>
        <tr className="border-t-2 bg-accent/60 text-base font-bold">
          <td className="px-4 py-3">{t("reports.grandTotal")}</td>
          <td className="tabular px-4 py-3 text-right">{money(s.food_total + s.rent_total + s.other_total)}</td>
        </tr>
      </tbody>
    </table>
  )
}
