"use client"

import { AnimatePresence, motion } from "framer-motion"
import { FileDown, PieChart, Receipt, Users } from "lucide-react"
import { useState } from "react"
import { ErrorState } from "@/components/common/error-state"
import { FadeIn } from "@/components/common/motion"
import { PageHeader } from "@/components/common/page-header"
import { TableSkeleton } from "@/components/common/skeletons"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useI18n } from "@/components/providers/i18n-provider"
import { useCycleSummary } from "@/features/accounts/queries"
import { SettlementCard, SettlementTable } from "@/features/accounts/settlement"
import { MonthGate } from "@/features/cycles/month-gate"
import { useMess } from "@/features/mess/mess-provider"
import type { MonthlyCycle } from "@/lib/types"
import { ExpenseReportTable, MonthlyReportGrid } from "./report-sections"

type Tab = "monthly" | "member" | "expense"

export function ReportsPage() {
  const { t } = useI18n()
  return (
    <FadeIn className="grid grid-cols-1 gap-5">
      <MonthGate
        fallback={
          <>
            <PageHeader title={t("reports.title")} description={t("reports.subtitle")} />
            <Card className="p-0 shadow-xs"><TableSkeleton rows={6} cols={4} /></Card>
          </>
        }
      >
        {(cycle) => <ReportsContent key={cycle.id} cycle={cycle} />}
      </MonthGate>
    </FadeIn>
  )
}

function ReportsContent({ cycle }: { cycle: MonthlyCycle }) {
  const { t, monthName } = useI18n()
  const { isManager, memberId } = useMess()
  const [tab, setTab] = useState<Tab>("monthly")
  const summary = useCycleSummary(cycle.id)
  const month = monthName(cycle.year, cycle.month)

  return (
    <>
      <PageHeader
        title={t("reports.title")}
        description={`${month} · ${t("reports.subtitle")}`}
        actions={
          <Button nativeButton={false} render={<a href={`/print/${cycle.id}`} target="_blank" rel="noopener" />}>
            <FileDown /> {t("reports.downloadPdf")}
          </Button>
        }
      />
      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)} className="gap-4">
        <TabsList className="h-9 w-full sm:w-fit">
          <TabsTrigger value="monthly" className="px-3"><PieChart /> <span className="truncate">{t("reports.monthly")}</span></TabsTrigger>
          <TabsTrigger value="member" className="px-3"><Users /> <span className="truncate">{t("reports.member")}</span></TabsTrigger>
          <TabsTrigger value="expense" className="px-3"><Receipt /> <span className="truncate">{t("reports.expense")}</span></TabsTrigger>
        </TabsList>

        <Card className="gap-0 p-0 shadow-xs">
          {summary.isPending ? (
            <TableSkeleton rows={6} cols={4} />
          ) : summary.isError ? (
            <ErrorState error={summary.error} onRetry={() => summary.refetch()} />
          ) : (
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={tab}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
              >
                <CardHeader className="border-b py-4">
                  <CardTitle>{t(`reports.${tab}`)}</CardTitle>
                  <CardDescription>{month}</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  {tab === "monthly" && (
                    <div className="p-4">
                      <MonthlyReportGrid s={summary.data} />
                    </div>
                  )}
                  {tab === "member" &&
                    (isManager ? (
                      <>
                        <div className="hidden lg:block">
                          <SettlementTable rows={summary.data.members} />
                        </div>
                        <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:hidden">
                          {summary.data.members.map((r) => (
                            <SettlementCard key={r.member_id} row={r} />
                          ))}
                        </div>
                      </>
                    ) : (
                      <div className="p-4">
                        {summary.data.members
                          .filter((r) => r.member_id === memberId)
                          .map((r) => (
                            <SettlementCard key={r.member_id} row={r} className="max-w-md" />
                          ))}
                      </div>
                    ))}
                  {tab === "expense" && <ExpenseReportTable s={summary.data} />}
                </CardContent>
              </motion.div>
            </AnimatePresence>
          )}
        </Card>
      </Tabs>
    </>
  )
}
