"use client"

import { CheckCircle2, Loader2, Power, PowerOff, XCircle, type LucideIcon } from "lucide-react"
import { createContext, useCallback, useContext, useMemo, useState } from "react"
import { toast } from "sonner"
import { approveMess, rejectMess, setMessActive } from "@/actions/admin"
import { Field } from "@/components/common/field"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useI18n } from "@/components/providers/i18n-provider"
import type { TKey } from "@/i18n"
import { errOf } from "@/lib/api"
import { errorKey } from "@/lib/errors"
import type { MessStatus } from "@/lib/types"
import { cn } from "@/lib/utils"
import { useInvalidateAdmin } from "./queries"

export type MessAction = "approve" | "reject" | "activate" | "deactivate"

export interface ActionTarget {
  id: string
  name: string
  status: MessStatus
  manager?: string | null
}

/** Which actions make sense for a mess in a given status. */
export function actionsFor(status: MessStatus): MessAction[] {
  switch (status) {
    case "pending":
      return ["approve", "reject"]
    case "rejected":
      return ["approve"]
    case "active":
      return ["deactivate"]
    case "inactive":
      return ["activate"]
  }
}

const CONFIG: Record<
  MessAction,
  {
    icon: LucideIcon
    tone: string
    title: TKey
    desc: TKey
    note?: TKey
    cta: TKey
    busy: TKey
    toast: TKey
    destructive?: boolean
  }
> = {
  approve: {
    icon: CheckCircle2,
    tone: "bg-success-soft text-success",
    title: "admin.approveTitle",
    desc: "admin.approveDesc",
    note: "admin.approveNote",
    cta: "admin.approveCta",
    busy: "admin.approving",
    toast: "admin.approvedToast",
  },
  reject: {
    icon: XCircle,
    tone: "bg-danger-soft text-destructive",
    title: "admin.rejectTitle",
    desc: "admin.rejectDesc",
    cta: "admin.rejectCta",
    busy: "admin.rejecting",
    toast: "admin.rejectedToast",
    destructive: true,
  },
  activate: {
    icon: Power,
    tone: "bg-success-soft text-success",
    title: "admin.activateTitle",
    desc: "admin.activateDesc",
    note: "admin.activateNote",
    cta: "admin.activateCta",
    busy: "admin.activating",
    toast: "admin.activatedToast",
  },
  deactivate: {
    icon: PowerOff,
    tone: "bg-warning-soft text-warning",
    title: "admin.deactivateTitle",
    desc: "admin.deactivateDesc",
    note: "admin.deactivateNote",
    cta: "admin.deactivateCta",
    busy: "admin.deactivating",
    toast: "admin.deactivatedToast",
    destructive: true,
  },
}

export const ACTION_LABEL: Record<MessAction, TKey> = {
  approve: "admin.approve",
  reject: "admin.reject",
  activate: "admin.activate",
  deactivate: "admin.deactivate",
}

export const ACTION_ICON: Record<MessAction, LucideIcon> = {
  approve: CheckCircle2,
  reject: XCircle,
  activate: Power,
  deactivate: PowerOff,
}

interface Ctx {
  /** Opens the confirmation dialog for an action. Nothing changes until confirmed. */
  request: (action: MessAction, target: ActionTarget) => void
  /** Mess id currently being processed (for row-level loading state). */
  busyId: string | null
}

const MessActionsContext = createContext<Ctx | null>(null)

export function useMessActions() {
  const ctx = useContext(MessActionsContext)
  if (!ctx) throw new Error("useMessActions must be used inside <MessActionsProvider>")
  return ctx
}

/** Provides confirm-then-run mess status actions with loading states and toasts. */
export function MessActionsProvider({ children }: { children: React.ReactNode }) {
  const { t } = useI18n()
  const invalidate = useInvalidateAdmin()
  const [current, setCurrent] = useState<{ action: MessAction; target: ActionTarget } | null>(null)
  const [reason, setReason] = useState("")
  const [busyId, setBusyId] = useState<string | null>(null)

  const request = useCallback((action: MessAction, target: ActionTarget) => {
    setReason("")
    setCurrent({ action, target })
  }, [])

  const confirm = async () => {
    if (!current) return
    const { action, target } = current
    setBusyId(target.id)
    const result =
      action === "approve"
        ? await approveMess(target.id)
        : action === "reject"
          ? await rejectMess(target.id, { reason })
          : await setMessActive(target.id, action === "activate")
    const error = errOf(result)
    if (error) {
      setBusyId(null)
      toast.error(t(errorKey(error)))
      return
    }
    await invalidate()
    setBusyId(null)
    setCurrent(null)
    toast.success(t(CONFIG[action].toast))
  }

  const value = useMemo(() => ({ request, busyId }), [request, busyId])
  const cfg = current ? CONFIG[current.action] : null
  const pending = !!current && busyId === current.target.id

  return (
    <MessActionsContext.Provider value={value}>
      {children}
      <AlertDialog open={!!current} onOpenChange={(o) => !o && !pending && setCurrent(null)}>
        <AlertDialogContent>
          {cfg && current && (
            <>
              <AlertDialogHeader>
                <AlertDialogMedia className={cfg.tone}>
                  <cfg.icon />
                </AlertDialogMedia>
                <AlertDialogTitle>{t(cfg.title)}</AlertDialogTitle>
                <AlertDialogDescription>{t(cfg.desc)}</AlertDialogDescription>
              </AlertDialogHeader>
              <dl className="grid gap-2 rounded-lg border bg-muted/40 p-3 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">{t("admin.colMess")}</dt>
                  <dd className="text-right font-medium">{current.target.name}</dd>
                </div>
                {current.target.manager && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">{t("admin.colManager")}</dt>
                    <dd className="text-right">{current.target.manager}</dd>
                  </div>
                )}
              </dl>
              {cfg.note && <p className="text-xs text-muted-foreground">{t(cfg.note)}</p>}
              {current.action === "reject" && (
                <Field label={t("admin.rejectReason")} htmlFor="reject-reason" optional>
                  <Textarea
                    id="reject-reason"
                    rows={3}
                    value={reason}
                    maxLength={500}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder={t("admin.rejectReasonPlaceholder")}
                    disabled={pending}
                  />
                </Field>
              )}
              <AlertDialogFooter>
                <AlertDialogCancel disabled={pending}>{t("common.cancel")}</AlertDialogCancel>
                <Button
                  onClick={confirm}
                  disabled={pending}
                  className={cn(cfg.destructive && "bg-destructive text-white hover:bg-destructive/90")}
                >
                  {pending && <Loader2 className="animate-spin" />}
                  {pending ? t(cfg.busy) : t(cfg.cta)}
                </Button>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </MessActionsContext.Provider>
  )
}
