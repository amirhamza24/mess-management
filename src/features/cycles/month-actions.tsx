"use client"

import { Lock, LockOpen } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { ConfirmDialog } from "@/components/common/confirm-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useI18n } from "@/components/providers/i18n-provider"
import { useMess } from "@/features/mess/mess-provider"
import { errorKey } from "@/lib/errors"
import { setMonthStatus } from "@/actions/cycles"
import { errOf } from "@/lib/api"
import type { MonthlyCycle } from "@/lib/types"

export function MonthStatusBadge({ cycle }: { cycle: MonthlyCycle }) {
  const { t } = useI18n()
  return cycle.status === "closed" ? (
    <Badge variant="secondary" className="gap-1">
      <Lock className="size-3" /> {t("month.closed")}
    </Badge>
  ) : (
    <Badge className="gap-1 bg-success-soft text-success">
      <span className="size-1.5 rounded-full bg-success" /> {t("month.open")}
    </Badge>
  )
}

/** Close / reopen the month (manager only), with confirmation. */
export function MonthActions({ cycle }: { cycle: MonthlyCycle }) {
  const { t, monthName } = useI18n()
  const { isManager, refreshMess } = useMess()
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)
  if (!isManager) return null

  const closing = cycle.status === "open"
  const month = monthName(cycle.year, cycle.month)

  const run = async () => {
    setPending(true)
    const error = errOf(await setMonthStatus(cycle.id, closing ? "closed" : "open"))
    setPending(false)
    if (error) return void toast.error(t(errorKey(error)))
    toast.success(t(closing ? "month.closedToast" : "month.reopenedToast", { month }))
    setOpen(false)
    await refreshMess()
  }

  return (
    <>
      <Button variant={closing ? "default" : "outline"} onClick={() => setOpen(true)}>
        {closing ? <Lock /> : <LockOpen />}
        {t(closing ? "month.close" : "month.reopen")}
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={t(closing ? "month.closeConfirmTitle" : "month.reopenConfirmTitle", { month })}
        description={t(closing ? "month.closeConfirm" : "month.reopenConfirm")}
        confirmLabel={t(closing ? "month.close" : "month.reopen")}
        destructive={!closing}
        pending={pending}
        onConfirm={run}
      />
    </>
  )
}
