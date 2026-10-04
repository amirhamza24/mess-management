"use client"

import { Calculator, Home, ImageDown, Receipt, Scale, UtensilsCrossed } from "lucide-react"
import { useState } from "react"
import { ErrorState } from "@/components/common/error-state"
import { EmptyState } from "@/components/common/empty-state"
import { FadeIn, Stagger, StaggerItem } from "@/components/common/motion"
import { PageHeader } from "@/components/common/page-header"
import { TableSkeleton } from "@/components/common/skeletons"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useI18n } from "@/components/providers/i18n-provider"
import { MonthActions, MonthStatusBadge } from "@/features/cycles/month-actions"
import { MonthGate } from "@/features/cycles/month-gate"
import { useMess } from "@/features/mess/mess-provider"
import type { TKey } from "@/i18n"
import type { CycleSummary, MonthlyCycle, SettlementRow } from "@/lib/types"
import { MemberHisabDialog } from "./member-hisab-dialog"
import { useCycleSummary } from "./queries"
import { SettlementCard, SettlementTable } from "./settlement"

export function AccountsPage() {
  const { t } = useI18n()
  return (
    <FadeIn className="grid grid-cols-1 gap-5">
      <MonthGate
        fallback={
          <>
            <PageHeader title={t("accounts.title")} description={t("accounts.subtitle")} />
            <AccountsSkeleton />
          </>
        }
      >
        {(cycle) => <AccountsContent key={cycle.id} cycle={cycle} />}
      </MonthGate>
    </FadeIn>
  )
}

function AccountsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-5">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <Card key={i} className="gap-4 p-5 shadow-xs">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-8 w-28" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </Card>
        ))}
      </div>
      <Card className="p-0 shadow-xs">
        <TableSkeleton rows={5} cols={8} />
      </Card>
    </div>
  )
}

function AccountsContent({ cycle }: { cycle: MonthlyCycle }) {
  const { t, monthName } = useI18n()
  const summary = useCycleSummary(cycle.id)

  return (
    <>
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-2">
            {t("accounts.title")} <MonthStatusBadge cycle={cycle} />
          </span>
        }
        description={`${monthName(cycle.year, cycle.month)} · ${t("accounts.subtitle")}`}
        actions={<MonthActions cycle={cycle} />}
      />
      {summary.isPending ? (
        <AccountsSkeleton />
      ) : summary.isError ? (
        <Card className="shadow-xs">
          <ErrorState error={summary.error} onRetry={() => summary.refetch()} />
        </Card>
      ) : (
        <AccountsBody summary={summary.data} cycle={cycle} />
      )}
    </>
  )
}

function Line({ label, value, strong }: { label: string; value: React.ReactNode; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className={strong ? "font-semibold" : "text-muted-foreground"}>{label}</span>
      <span className={strong ? "tabular font-semibold" : "tabular"}>{value}</span>
    </div>
  )
}

function AccountsBody({ summary: s, cycle }: { summary: CycleSummary; cycle: MonthlyCycle }) {
  const { t, money, num } = useI18n()
  const { isManager, memberId, mess } = useMess()
  const [selected, setSelected] = useState<SettlementRow | null>(null)
  const myRow = s.members.find((m) => m.member_id === memberId)

  return (
    <div className="grid grid-cols-1 gap-5">
      <Stagger className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* MEAL ACCOUNT — food expenses only */}
        <StaggerItem>
          <Card className="h-full gap-4 shadow-xs">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="flex size-8 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                  <UtensilsCrossed className="size-4" />
                </span>
                {t("accounts.mealAccount")}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-3">
              <div>
                <p className="text-xs text-muted-foreground">{t("accounts.mealRate")}</p>
                <p className="tabular text-3xl font-semibold tracking-tight text-primary">{money(s.meal_rate, { fixed: true })}</p>
              </div>
              <Line label={t("accounts.totalFood")} value={money(s.food_total)} />
              <Line label={t("accounts.totalMeals")} value={num(s.total_meals, 1)} />
              <p className="rounded-md bg-muted px-2.5 py-1.5 text-xs text-muted-foreground">{t("accounts.formula")}</p>
            </CardContent>
          </Card>
        </StaggerItem>

        {/* HOUSE RENT ACCOUNT */}
        <StaggerItem>
          <Card className="h-full gap-4 shadow-xs">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="flex size-8 items-center justify-center rounded-lg bg-warning-soft text-warning">
                  <Home className="size-4" />
                </span>
                {t("accounts.rentAccount")}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-3">
              <div>
                <p className="text-xs text-muted-foreground">{t("accounts.totalRent")}</p>
                <p className="tabular text-3xl font-semibold tracking-tight">{money(s.rent_total)}</p>
              </div>
              <p className="text-xs font-medium text-muted-foreground">{t("accounts.memberWiseRent")}</p>
              <div className="scrollbar-thin grid max-h-40 gap-2 overflow-y-auto">
                {s.members.map((m) => (
                  <Line key={m.member_id} label={m.full_name} value={money(m.rent)} />
                ))}
              </div>
            </CardContent>
          </Card>
        </StaggerItem>

        {/* OTHER EXPENSE ACCOUNT */}
        <StaggerItem>
          <Card className="h-full gap-4 shadow-xs">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="flex size-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <Receipt className="size-4" />
                </span>
                {t("accounts.otherAccount")}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-3">
              <div>
                <p className="text-xs text-muted-foreground">{t("accounts.totalOther")}</p>
                <p className="tabular text-3xl font-semibold tracking-tight">{money(s.other_total)}</p>
              </div>
              {s.other_by_category.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("accounts.noOther")}</p>
              ) : (
                <div className="grid gap-2">
                  {s.other_by_category.map((c) => (
                    <Line key={c.category} label={t(`otherCategories.${c.category}` as TKey)} value={money(c.amount)} />
                  ))}
                </div>
              )}
              <div className="border-t pt-2">
                <Line label={t("accounts.sharePerMember")} value={money(s.other_share)} strong />
              </div>
            </CardContent>
          </Card>
        </StaggerItem>
      </Stagger>

      {/* MEMBER FINAL SETTLEMENT */}
      <Card className="gap-0 p-0 shadow-xs">
        <CardHeader className="border-b py-4">
          <CardTitle className="flex items-center gap-2">
            <Scale className="size-4 text-primary" />
            {t(isManager ? "accounts.settlement" : "accounts.mySettlement")}
          </CardTitle>
          <CardDescription>{t("accounts.settlementDesc")}</CardDescription>
          {s.members.length > 0 && (
            <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-primary">
              <ImageDown className="size-3.5" /> {t("hisabCard.clickHint")}
            </p>
          )}
        </CardHeader>
        {s.members.length === 0 ? (
          <EmptyState icon={Calculator} title={t("empty.noData")} className="py-10" />
        ) : isManager ? (
          <>
            <div className="hidden lg:block">
              <SettlementTable rows={s.members} onSelect={setSelected} />
            </div>
            <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:hidden">
              {s.members.map((r) => (
                <SettlementCard key={r.member_id} row={r} onSelect={setSelected} />
              ))}
            </div>
          </>
        ) : myRow ? (
          <div className="p-4">
            <SettlementCard row={myRow} className="max-w-md" onSelect={setSelected} />
          </div>
        ) : (
          <EmptyState icon={Calculator} title={t("empty.noData")} className="py-10" />
        )}
      </Card>

      <MemberHisabDialog
        row={selected}
        cycle={cycle}
        messName={mess.name}
        mealRate={s.meal_rate}
        onClose={() => setSelected(null)}
      />
    </div>
  )
}
