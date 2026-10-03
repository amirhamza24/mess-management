"use client"

import { Printer } from "lucide-react"
import { useEffect, useRef } from "react"
import { LogoMark } from "@/components/brand/logo"
import { RingLoader } from "@/components/brand/rings"
import { ErrorState } from "@/components/common/error-state"
import { Button } from "@/components/ui/button"
import { useI18n } from "@/components/providers/i18n-provider"
import { useCycleSummary } from "@/features/accounts/queries"
import { MessProvider, useMess, type ActiveMe } from "@/features/mess/mess-provider"
import type { TKey } from "@/i18n"
import { todayISO } from "@/lib/format"
import { ExpenseReportTable, MonthlyReportGrid } from "./report-sections"

/**
 * Printable monthly report. Rendered as HTML and saved as PDF through the
 * browser print dialog, so Bangla text renders correctly with the app's fonts.
 */
export function PrintReport({ cycleId, initialMe }: { cycleId: string; initialMe: ActiveMe }) {
  return (
    <MessProvider me={initialMe}>
      <PrintBody cycleId={cycleId} />
    </MessProvider>
  )
}

function PrintBody({ cycleId }: { cycleId: string }) {
  const { t, money, num, monthName, date } = useI18n()
  const { mess, cycles, cyclesLoading, isManager, memberId } = useMess()
  const summary = useCycleSummary(cycleId)
  const cycle = cycles.find((c) => c.id === cycleId)
  const printed = useRef(false)

  const ready = !!summary.data && !!cycle
  useEffect(() => {
    if (!ready || printed.current) return
    printed.current = true
    // Let fonts and layout settle before opening the print dialog.
    const id = window.setTimeout(() => window.print(), 600)
    return () => window.clearTimeout(id)
  }, [ready])

  if (summary.isError) return <ErrorState error={summary.error} className="min-h-dvh" />
  if (!ready) {
    if (!cyclesLoading && !cycle && !summary.isPending) return <ErrorState className="min-h-dvh" />
    return <RingLoader className="min-h-dvh" label={t("reports.preparing")} />
  }

  const s = summary.data
  const month = monthName(cycle.year, cycle.month)
  const rows = isManager ? s.members : s.members.filter((m) => m.member_id === memberId)

  return (
    <div className="min-h-dvh bg-muted/40 py-8 print:bg-white print:py-0">
      <div className="no-print mx-auto mb-4 flex max-w-[210mm] items-center justify-between px-4">
        <p className="text-sm text-muted-foreground">{t("reports.printHint")}</p>
        <Button onClick={() => window.print()}>
          <Printer /> {t("common.print")}
        </Button>
      </div>

      <article className="print-surface mx-auto max-w-[210mm] bg-white p-[14mm] text-[13px] text-slate-900 shadow-sm print:max-w-none print:p-0 print:shadow-none">
        <header className="flex items-start justify-between border-b-2 border-violet-800 pb-4">
          <div className="flex items-center gap-3">
            <LogoMark className="size-11" />
            <div>
              <h1 className="text-xl font-bold tracking-wide text-violet-900">MESSHISAB</h1>
              <p className="text-xs text-slate-500">{t("app.tagline")}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-lg font-semibold">{month}</p>
            <p className="text-xs text-slate-500">{mess.name}</p>
            {mess.address && <p className="text-xs text-slate-500">{mess.address}</p>}
          </div>
        </header>

        <section className="print-avoid-break mt-6">
          <h2 className="mb-2 text-sm font-semibold tracking-wide text-violet-900 uppercase">{t("reports.mealSummary")}</h2>
          <table className="w-full max-w-sm">
            <tbody>
              <tr><td className="py-1 text-slate-500">{t("accounts.totalMeals")}</td><td className="tabular py-1 text-right font-medium">{num(s.total_meals, 1)}</td></tr>
              <tr><td className="py-1 text-slate-500">{t("accounts.totalFood")}</td><td className="tabular py-1 text-right font-medium">{money(s.food_total)}</td></tr>
              <tr><td className="py-1 text-slate-500">{t("accounts.mealRate")}</td><td className="tabular py-1 text-right font-bold">{money(s.meal_rate, { fixed: true })}</td></tr>
            </tbody>
          </table>
        </section>

        <section className="print-avoid-break mt-6">
          <h2 className="mb-2 text-sm font-semibold tracking-wide text-violet-900 uppercase">{t("reports.monthly")}</h2>
          <MonthlyReportGrid s={s} compact />
        </section>

        <section className="print-avoid-break mt-6 grid grid-cols-2 gap-6">
          <div>
            <h2 className="mb-2 text-sm font-semibold tracking-wide text-violet-900 uppercase">{t("accounts.rentAccount")}</h2>
            <table className="w-full">
              <tbody>
                {rows.map((r) => (
                  <tr key={r.member_id} className="border-b border-slate-100">
                    <td className="py-1">{r.full_name}</td>
                    <td className="tabular py-1 text-right">{money(r.rent)}</td>
                  </tr>
                ))}
                <tr className="font-semibold">
                  <td className="py-1.5">{t("accounts.totalRent")}</td>
                  <td className="tabular py-1.5 text-right">{money(s.rent_total)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div>
            <h2 className="mb-2 text-sm font-semibold tracking-wide text-violet-900 uppercase">{t("accounts.otherAccount")}</h2>
            <table className="w-full">
              <tbody>
                {s.other_by_category.map((c) => (
                  <tr key={c.category} className="border-b border-slate-100">
                    <td className="py-1">{t(`otherCategories.${c.category}` as TKey)}</td>
                    <td className="tabular py-1 text-right">{money(c.amount)}</td>
                  </tr>
                ))}
                <tr className="font-semibold">
                  <td className="py-1.5">{t("accounts.totalOther")}</td>
                  <td className="tabular py-1.5 text-right">{money(s.other_total)}</td>
                </tr>
                <tr>
                  <td className="py-1 text-slate-500">{t("accounts.sharePerMember")}</td>
                  <td className="tabular py-1 text-right">{money(s.other_share)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-6">
          <h2 className="mb-2 text-sm font-semibold tracking-wide text-violet-900 uppercase">{t("reports.memberSettlement")}</h2>
          <table className="tabular w-full border border-slate-200 text-[12px]">
            <thead className="bg-slate-100">
              <tr>
                <th className="px-2 py-1.5 text-left">{t("common.member")}</th>
                <th className="px-2 py-1.5 text-right">{t("accounts.meals")}</th>
                <th className="px-2 py-1.5 text-right">{t("accounts.mealCost")}</th>
                <th className="px-2 py-1.5 text-right">{t("accounts.rent")}</th>
                <th className="px-2 py-1.5 text-right">{t("accounts.otherShare")}</th>
                <th className="px-2 py-1.5 text-right">{t("accounts.totalCost")}</th>
                <th className="px-2 py-1.5 text-right">{t("accounts.paid")}</th>
                <th className="px-2 py-1.5 text-right">{t("accounts.balance")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const due = r.balance > 0.005
                const adv = r.balance < -0.005
                return (
                  <tr key={r.member_id} className="print-avoid-break border-t border-slate-200">
                    <td className="px-2 py-1.5 font-medium">{r.full_name}</td>
                    <td className="px-2 py-1.5 text-right">{num(r.meals, 1)}</td>
                    <td className="px-2 py-1.5 text-right">{money(r.meal_cost)}</td>
                    <td className="px-2 py-1.5 text-right">{money(r.rent)}</td>
                    <td className="px-2 py-1.5 text-right">{money(r.other_share)}</td>
                    <td className="px-2 py-1.5 text-right font-semibold">{money(r.total_cost)}</td>
                    <td className="px-2 py-1.5 text-right">{money(r.paid)}</td>
                    <td className={`px-2 py-1.5 text-right font-semibold ${due ? "text-red-700" : adv ? "text-emerald-700" : ""}`}>
                      {adv ? "+" : ""}
                      {money(Math.abs(r.balance))} {due ? t("accounts.due") : adv ? t("accounts.advance") : ""}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </section>

        <section className="print-avoid-break mt-6">
          <h2 className="mb-2 text-sm font-semibold tracking-wide text-violet-900 uppercase">{t("reports.expense")}</h2>
          <div className="overflow-hidden rounded border border-slate-200">
            <ExpenseReportTable s={s} />
          </div>
        </section>

        <footer className="mt-12 flex items-end justify-between text-xs text-slate-500">
          <span>{t("reports.generatedOn", { date: date(todayISO(), "long") })}</span>
          <span className="border-t border-slate-400 px-8 pt-1">{t("reports.signature")}</span>
        </footer>
      </article>
    </div>
  )
}
