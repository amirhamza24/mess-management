"use client"

import { AnimatePresence, motion } from "framer-motion"
import { CalendarRange, PlusCircle, UtensilsCrossed } from "lucide-react"
import { useState } from "react"
import { EmptyState } from "@/components/common/empty-state"
import { ErrorState } from "@/components/common/error-state"
import { FadeIn } from "@/components/common/motion"
import { PageHeader } from "@/components/common/page-header"
import { MatrixSkeleton, TableSkeleton } from "@/components/common/skeletons"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useI18n } from "@/components/providers/i18n-provider"
import { useCycleSummary } from "@/features/accounts/queries"
import { ClosedMonthBanner, MonthGate } from "@/features/cycles/month-gate"
import { useCycleMembers } from "@/features/members/queries"
import { useMess } from "@/features/mess/mess-provider"
import { defaultDateForMonth } from "@/lib/format"
import type { MonthlyCycle } from "@/lib/types"
import { DailyMealEditor } from "./daily-meal-editor"
import { MealMatrix } from "./meal-matrix"
import { useMeals } from "./queries"

type Tab = "overview" | "daily"

export function MealsPage() {
  const { t } = useI18n()
  return (
    <FadeIn className="grid grid-cols-1 gap-5">
      <PageHeader title={t("meals.title")} description={t("meals.subtitle")} />
      <ClosedMonthBanner />
      <MonthGate
        fallback={
          <Card className="p-0 shadow-xs">
            <MatrixSkeleton />
          </Card>
        }
      >
        {(cycle) => <MealsContent key={cycle.id} cycle={cycle} />}
      </MonthGate>
    </FadeIn>
  )
}

function MealsContent({ cycle }: { cycle: MonthlyCycle }) {
  const { t, num, money } = useI18n()
  const { isManager, canEdit, memberId } = useMess()
  const [tab, setTab] = useState<Tab>("overview")
  const [date, setDate] = useState(() => defaultDateForMonth(cycle.year, cycle.month))
  const membersQuery = useCycleMembers(cycle.id)
  const mealsQuery = useMeals(cycle.id)
  const summary = useCycleSummary(cycle.id)

  const loading = membersQuery.isPending || mealsQuery.isPending
  const error = membersQuery.error ?? mealsQuery.error
  const meals = mealsQuery.data ?? []
  const members = membersQuery.members
  const myTotal = meals.filter((m) => m.member_id === memberId).reduce((s, m) => s + Number(m.total), 0)

  const openDay = (iso: string) => {
    setDate(iso)
    setTab("daily")
  }

  return (
    <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)} className="gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <TabsList className="h-9">
          <TabsTrigger value="overview" className="px-3">
            <CalendarRange /> {t("meals.overview")}
          </TabsTrigger>
          {isManager && (
            <TabsTrigger value="daily" className="px-3">
              <PlusCircle /> {t("meals.addDaily")}
            </TabsTrigger>
          )}
        </TabsList>
        <div className="tabular flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          {!isManager && (
            <span>
              {t("meals.myMeals")}: <strong className="text-foreground">{num(myTotal, 1)}</strong>
            </span>
          )}
          <span>
            {t("meals.monthTotal")}: <strong className="text-foreground">{num(summary.data?.total_meals ?? 0, 1)}</strong>
          </span>
          <span>
            {t("dashboard.mealRate")}: <strong className="text-foreground">{money(summary.data?.meal_rate ?? 0, { fixed: true })}</strong>
          </span>
        </div>
      </div>

      <Card className="gap-0 overflow-hidden p-0 shadow-xs">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            className={tab === "daily" ? "pt-4" : undefined}
          >
            {loading ? (
              tab === "overview" ? <MatrixSkeleton /> : <TableSkeleton rows={5} cols={5} />
            ) : error ? (
              <ErrorState error={error} onRetry={() => { membersQuery.refetch(); mealsQuery.refetch() }} />
            ) : tab === "overview" ? (
              members.length === 0 ? (
                <EmptyState icon={UtensilsCrossed} title={t("meals.noMembers")} />
              ) : meals.length === 0 ? (
                <EmptyState
                  icon={UtensilsCrossed}
                  title={t("meals.empty")}
                  description={t(isManager ? "meals.emptyManager" : "meals.emptyMember")}
                  action={
                    canEdit && (
                      <Button onClick={() => setTab("daily")}>
                        <PlusCircle /> {t("meals.addDaily")}
                      </Button>
                    )
                  }
                />
              ) : (
                <MealMatrix
                  cycle={cycle}
                  members={members}
                  meals={meals}
                  highlightMemberId={isManager ? undefined : memberId}
                  onDayClick={canEdit ? openDay : undefined}
                />
              )
            ) : (
              <DailyMealEditor
                cycle={cycle}
                members={members}
                meals={meals}
                date={date}
                onDateChange={setDate}
                canEdit={canEdit}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </Card>
    </Tabs>
  )
}
