"use client"

import { CalendarPlus, Lock } from "lucide-react"
import { useState } from "react"
import { Rings } from "@/components/brand/rings"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useI18n } from "@/components/providers/i18n-provider"
import { useMess } from "@/features/mess/mess-provider"
import type { MonthlyCycle } from "@/lib/types"
import { StartMonthDialog } from "./start-month-dialog"

/**
 * Renders children only when the selected month has a cycle.
 * Otherwise shows a "month not started" state (with Start Month for managers).
 */
export function MonthGate({
  children,
  fallback,
}: {
  children: (cycle: MonthlyCycle) => React.ReactNode
  fallback: React.ReactNode
}) {
  const { cycle, cyclesLoading } = useMess()
  if (cyclesLoading) return <>{fallback}</>
  if (!cycle) return <MonthNotStarted />
  return <>{children(cycle)}</>
}

export function MonthNotStarted() {
  const { t, monthName } = useI18n()
  const { isManager, period } = useMess()
  const [open, setOpen] = useState(false)
  const month = monthName(period.year, period.month)
  return (
    <Card className="relative items-center overflow-hidden px-6 py-16 text-center shadow-xs">
      <Rings size={360} className="top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
      <span className="relative flex size-12 items-center justify-center rounded-full bg-card text-primary shadow-xs ring-1 ring-border">
        <CalendarPlus className="size-5" />
      </span>
      <h3 className="relative mt-2 text-lg font-semibold">{t("month.notStartedTitle", { month })}</h3>
      <p className="relative max-w-sm text-sm text-muted-foreground">
        {t(isManager ? "month.notStartedManager" : "month.notStartedMember")}
      </p>
      {isManager && (
        <>
          <Button className="relative mt-3" onClick={() => setOpen(true)}>
            <CalendarPlus /> {t("month.start")}
          </Button>
          <StartMonthDialog open={open} onOpenChange={setOpen} />
        </>
      )}
    </Card>
  )
}

/** Notice shown on editable pages when the selected month is closed. */
export function ClosedMonthBanner() {
  const { t } = useI18n()
  const { isClosed, isManager } = useMess()
  if (!isClosed) return null
  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-warning/30 bg-warning-soft/60 px-3.5 py-2.5 text-sm">
      <Lock className="mt-0.5 size-4 shrink-0 text-warning" />
      <span>{t(isManager ? "month.closedBannerManager" : "month.closedBanner")}</span>
    </div>
  )
}
