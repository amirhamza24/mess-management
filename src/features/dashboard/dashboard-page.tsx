"use client"

import {
  Calculator,
  CircleDollarSign,
  Home,
  PlusCircle,
  Receipt,
  ShoppingBasket,
  TrendingDown,
  UtensilsCrossed,
  Users,
  Wallet,
} from "lucide-react"
import Link from "next/link"
import { useMemo } from "react"
import { Rings } from "@/components/brand/rings"
import { BalanceBadge, balanceKind } from "@/components/common/balance"
import { EmptyState } from "@/components/common/empty-state"
import { ErrorState } from "@/components/common/error-state"
import { FadeIn, Stagger, StaggerItem } from "@/components/common/motion"
import { CardListSkeleton, ChartSkeleton } from "@/components/common/skeletons"
import { StatCard, StatGridSkeleton } from "@/components/common/stat-card"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useI18n } from "@/components/providers/i18n-provider"
import { useCycleSummary } from "@/features/accounts/queries"
import { MonthStatusBadge } from "@/features/cycles/month-actions"
import { MonthGate } from "@/features/cycles/month-gate"
import { useExpenses } from "@/features/expenses/queries"
import { useMeals } from "@/features/meals/queries"
import { useMess } from "@/features/mess/mess-provider"
import { usePayments } from "@/features/payments/queries"
import { toNumber } from "@/lib/format"
import type { CycleSummary, MonthlyCycle } from "@/lib/types"
import { cn } from "@/lib/utils"
import {
  ExpenseBreakdownChart,
  ExpenseTrendChart,
  MealConsumptionChart,
  PaymentOverviewChart,
  SERIES,
} from "./charts"

function greetingKey() {
  const h = new Date().getHours()
  if (h < 12) return "greeting.morning" as const
  if (h < 17) return "greeting.afternoon" as const
  return "greeting.evening" as const
}

export function DashboardPage() {
  return (
    <FadeIn className="grid grid-cols-1 gap-5">
      <Hero />
      <MonthGate
        fallback={
          <div className="grid grid-cols-1 gap-4">
            <StatGridSkeleton count={8} />
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <ChartSkeleton />
              <ChartSkeleton />
            </div>
          </div>
        }
      >
        {(cycle) => <DashboardContent key={cycle.id} cycle={cycle} />}
      </MonthGate>
    </FadeIn>
  )
}

function Hero() {
  const { t, monthName } = useI18n()
  const { displayName, mess, period, cycle, canEdit } = useMess()
  return (
    <Card className="relative overflow-hidden border-0 bg-brand-deep p-5 text-white shadow-sm ring-0 sm:p-6">
      <Rings size={420} intensity="medium" tone="light" className="-top-36 -right-24" />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm text-white/70">{mess.name}</p>
          <h1 className="mt-1 truncate text-xl font-semibold tracking-tight sm:text-2xl">
            {t(greetingKey())}, {displayName.split(" ")[0]}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-white/80">
            <span className="font-medium text-white">{monthName(period.year, period.month)}</span>
            {cycle && (
              <span className="[&_[data-slot=badge]]:bg-white/15 [&_[data-slot=badge]]:text-white">
                <MonthStatusBadge cycle={cycle} />
              </span>
            )}
          </div>
        </div>
        {canEdit && (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" className="bg-white text-brand-deep hover:bg-white/90" nativeButton={false} render={<Link href="/meals" />}>
              <UtensilsCrossed /> {t("meals.addDaily")}
            </Button>
            <Button size="sm" className="bg-white/10 text-white ring-1 ring-white/20 hover:bg-white/20" nativeButton={false} render={<Link href="/bazar" />}>
              <PlusCircle /> {t("bazar.add")}
            </Button>
          </div>
        )}
      </div>
    </Card>
  )
}

function DashboardContent({ cycle }: { cycle: MonthlyCycle }) {
  const { isManager } = useMess()
  const summary = useCycleSummary(cycle.id)

  if (summary.isPending)
    return (
      <div className="grid grid-cols-1 gap-4">
        <StatGridSkeleton count={8} />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
      </div>
    )
  if (summary.isError)
    return (
      <Card className="shadow-xs">
        <ErrorState error={summary.error} onRetry={() => summary.refetch()} />
      </Card>
    )
  return isManager ? <ManagerDashboard cycle={cycle} s={summary.data} /> : <MemberDashboard cycle={cycle} s={summary.data} />
}

function ManagerDashboard({ cycle, s }: { cycle: MonthlyCycle; s: CycleSummary }) {
  const { t, money, num } = useI18n()
  const food = useExpenses("food", cycle.id)
  const other = useExpenses("other", cycle.id)

  const fmtMoney = (n: number) => money(n)
  const cards = [
    { icon: Users, label: t("dashboard.totalMembers"), value: s.member_count, format: (n: number) => num(Math.round(n)) },
    { icon: UtensilsCrossed, label: t("dashboard.totalMeals"), value: s.total_meals, format: (n: number) => num(n, 1) },
    { icon: ShoppingBasket, label: t("dashboard.foodExpense"), value: s.food_total, format: fmtMoney, tone: "primary" as const },
    { icon: Calculator, label: t("dashboard.mealRate"), value: s.meal_rate, format: (n: number) => money(n, { fixed: true }), tone: "primary" as const },
    { icon: Home, label: t("dashboard.houseRent"), value: s.rent_total, format: fmtMoney },
    { icon: Receipt, label: t("dashboard.otherExpense"), value: s.other_total, format: fmtMoney },
    { icon: Wallet, label: t("dashboard.totalPayments"), value: s.total_paid, format: fmtMoney, tone: "success" as const },
    { icon: TrendingDown, label: t("dashboard.totalDue"), value: s.total_due, format: fmtMoney, tone: "danger" as const },
  ]

  // Fixed entity → colour mapping for the breakdown.
  const breakdown = useMemo(() => {
    const byCat = new Map(s.other_by_category.map((c) => [c.category, c.amount]))
    const named = ["electricity", "gas", "internet"] as const
    const rest = s.other_total - named.reduce((sum, c) => sum + (byCat.get(c) ?? 0), 0)
    return [
      { name: t("dashboard.food"), value: s.food_total, color: SERIES[0] },
      { name: t("nav.rent"), value: s.rent_total, color: SERIES[1] },
      { name: t("otherCategories.electricity"), value: byCat.get("electricity") ?? 0, color: SERIES[2] },
      { name: t("otherCategories.gas"), value: byCat.get("gas") ?? 0, color: SERIES[3] },
      { name: t("otherCategories.internet"), value: byCat.get("internet") ?? 0, color: SERIES[4] },
      { name: t("dashboard.other"), value: Math.max(0, rest), color: SERIES[5] },
    ]
  }, [s, t])

  const meals = s.members.map((m) => ({ name: m.full_name, meals: m.meals }))

  const trend = useMemo(() => {
    const weeks = Array.from({ length: 5 }, (_, i) => ({ week: t("dashboard.week", { n: num(i + 1) }), food: 0, other: 0 }))
    const add = (rows: { date: string; amount: number | string }[] | undefined, key: "food" | "other") => {
      for (const r of rows ?? []) {
        const day = Number(r.date.slice(8, 10))
        weeks[Math.min(4, Math.floor((day - 1) / 7))][key] += toNumber(r.amount)
      }
    }
    add(food.data, "food")
    add(other.data, "other")
    return weeks
  }, [food.data, other.data, t, num])

  return (
    <div className="grid grid-cols-1 gap-5">
      <Stagger className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((c) => (
          <StaggerItem key={c.label}>
            <StatCard {...c} />
          </StaggerItem>
        ))}
      </Stagger>
      <FadeIn delay={0.15} className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ExpenseBreakdownChart data={breakdown} />
        <MealConsumptionChart data={meals} />
        {food.isPending || other.isPending ? <ChartSkeleton /> : <ExpenseTrendChart data={trend} />}
        <PaymentOverviewChart paid={s.total_paid} due={s.total_due} advance={s.total_advance} />
      </FadeIn>
    </div>
  )
}

function MemberDashboard({ cycle, s }: { cycle: MonthlyCycle; s: CycleSummary }) {
  const { t, money, num, date } = useI18n()
  const { memberId } = useMess()
  const me = s.members.find((m) => m.member_id === memberId)
  const mealsQuery = useMeals(cycle.id)
  const payments = usePayments(cycle.id, { page: 0, memberId, pageSize: 5 })

  const recentMeals = useMemo(
    () =>
      (mealsQuery.data ?? [])
        .filter((m) => m.member_id === memberId)
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 7),
    [mealsQuery.data, memberId]
  )

  if (!me) {
    return <EmptyState icon={UtensilsCrossed} title={t("empty.noData")} description={t("meals.emptyMember")} />
  }

  const kind = balanceKind(me.balance)
  const fmtMoney = (n: number) => money(n)
  const cards = [
    { icon: UtensilsCrossed, label: t("dashboard.myMeals"), value: me.meals, format: (n: number) => num(n, 1) },
    { icon: Calculator, label: t("dashboard.myMealCost"), value: me.meal_cost, format: fmtMoney, tone: "primary" as const, hint: `${t("dashboard.mealRate")}: ${money(s.meal_rate, { fixed: true })}` },
    { icon: Home, label: t("dashboard.myRent"), value: me.rent, format: fmtMoney },
    { icon: Receipt, label: t("dashboard.myOtherShare"), value: me.other_share, format: fmtMoney },
    { icon: CircleDollarSign, label: t("dashboard.totalPayable"), value: me.total_cost, format: fmtMoney },
    { icon: Wallet, label: t("dashboard.paidAmount"), value: me.paid, format: fmtMoney, tone: "success" as const },
  ]

  return (
    <div className="grid grid-cols-1 gap-5">
      <Stagger className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((c) => (
          <StaggerItem key={c.label}>
            <StatCard {...c} />
          </StaggerItem>
        ))}
        <StaggerItem className="col-span-2">
          <Card
            className={cn(
              "h-full flex-row items-center justify-between gap-3 p-4 shadow-xs",
              kind === "due" && "bg-danger-soft/60",
              kind === "advance" && "bg-success-soft/60"
            )}
          >
            <div>
              <p className="text-[0.8rem] font-medium text-muted-foreground">{t("dashboard.dueAdvance")}</p>
              <p className={cn("tabular mt-1 text-2xl font-semibold", kind === "due" && "text-destructive", kind === "advance" && "text-success")}>
                {kind === "advance" ? "+" : ""}
                {money(Math.abs(me.balance))}
              </p>
            </div>
            <BalanceBadge balance={me.balance} className="text-sm" />
          </Card>
        </StaggerItem>
      </Stagger>

      <FadeIn delay={0.15} className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="gap-0 shadow-xs">
          <CardHeader className="flex-row items-center justify-between border-b pb-3">
            <CardTitle className="text-sm">{t("dashboard.recentMeals")}</CardTitle>
            <Link href="/meals" className="text-xs font-medium text-primary hover:underline">{t("dashboard.viewAll")}</Link>
          </CardHeader>
          <CardContent className="p-0">
            {mealsQuery.isPending ? (
              <div className="p-4"><CardListSkeleton count={3} /></div>
            ) : recentMeals.length === 0 ? (
              <EmptyState icon={UtensilsCrossed} title={t("meals.empty")} className="py-8" />
            ) : (
              <table className="tabular w-full text-sm">
                <thead>
                  <tr className="text-xs text-muted-foreground">
                    <th className="px-4 py-2 text-left font-medium">{t("common.date")}</th>
                    <th className="px-2 py-2 text-center font-medium">{t("meals.breakfast")}</th>
                    <th className="px-2 py-2 text-center font-medium">{t("meals.lunch")}</th>
                    <th className="px-2 py-2 text-center font-medium">{t("meals.dinner")}</th>
                    <th className="px-4 py-2 text-right font-medium">{t("meals.total")}</th>
                  </tr>
                </thead>
                <tbody>
                  {recentMeals.map((m) => (
                    <tr key={m.id} className="border-t transition-colors hover:bg-muted/40">
                      <td className="px-4 py-2.5">{date(m.date)}</td>
                      <td className="px-2 text-center">{num(toNumber(m.breakfast), 1)}</td>
                      <td className="px-2 text-center">{num(toNumber(m.lunch), 1)}</td>
                      <td className="px-2 text-center">{num(toNumber(m.dinner), 1)}</td>
                      <td className="px-4 text-right font-semibold">{num(toNumber(m.total), 1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        <Card className="gap-0 shadow-xs">
          <CardHeader className="flex-row items-center justify-between border-b pb-3">
            <CardTitle className="text-sm">{t("dashboard.recentPayments")}</CardTitle>
            <Link href="/payments" className="text-xs font-medium text-primary hover:underline">{t("dashboard.viewAll")}</Link>
          </CardHeader>
          <CardContent className="p-0">
            {payments.isPending ? (
              <div className="p-4"><CardListSkeleton count={3} /></div>
            ) : (payments.data?.rows.length ?? 0) === 0 ? (
              <EmptyState icon={Wallet} title={t("payments.empty")} className="py-8" />
            ) : (
              <ul className="divide-y">
                {payments.data!.rows.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                    <div>
                      <p className="font-medium">{date(p.date)}</p>
                      <p className="text-xs text-muted-foreground">
                        {t(`paymentMethods.${p.payment_method}`)} · {t(p.purpose === "rent" ? "payments.purposeRent" : "payments.purposeMess")}
                      </p>
                    </div>
                    <span className="tabular font-semibold text-success">{money(p.amount)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </FadeIn>
    </div>
  )
}
