"use client"

import { motion } from "framer-motion"
import { Ban, CalendarDays, Clock3, Loader2, Lock, LogOut, MapPin, RefreshCw, XCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { discardRejectedMess } from "@/actions/mess"
import { Rings } from "@/components/brand/rings"
import { ConfirmDialog } from "@/components/common/confirm-dialog"
import { MessStatusBadge } from "@/components/common/mess-status-badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useI18n } from "@/components/providers/i18n-provider"
import { errOf, query } from "@/lib/api"
import { errorKey } from "@/lib/errors"
import type { MyMess } from "@/lib/types"
import { cn } from "@/lib/utils"
import { SetupShell, useSignOut } from "./setup-shell"

const EASE = [0.16, 1, 0.3, 1] as const

/** Pending / rejected / inactive screen. Accounting modules stay locked until the mess is ACTIVE. */
export function MessStatusView({ mess, isManager }: { mess: MyMess; isManager: boolean }) {
  const { t, date } = useI18n()
  const router = useRouter()
  const signOut = useSignOut()
  const [refreshing, setRefreshing] = useState(false)
  const [discardOpen, setDiscardOpen] = useState(false)
  const [discarding, setDiscarding] = useState(false)
  const toasted = useRef(false)

  useEffect(() => {
    if (mess.status === "inactive" && !toasted.current) {
      toasted.current = true
      toast.error(t("errors.messInactive"))
    }
  }, [mess.status, t])

  const refresh = async () => {
    setRefreshing(true)
    try {
      const current = await query("me")
      if (current.mess?.status !== mess.status) {
        if (current.mess?.status === "active") toast.success(t("messes.nowActive"))
        router.refresh()
      } else {
        toast.info(t("messes.stillPending"))
      }
    } catch (error) {
      toast.error(t(errorKey(error)))
    } finally {
      setRefreshing(false)
    }
  }

  const discard = async () => {
    setDiscarding(true)
    const error = errOf(await discardRejectedMess())
    setDiscarding(false)
    if (error) return void toast.error(t(errorKey(error)))
    router.replace("/welcome")
    router.refresh()
  }

  const view = {
    pending: {
      icon: Clock3,
      tone: "bg-warning-soft text-warning",
      title: t("messes.pendingTitle"),
      desc: isManager && mess.is_creator ? t("messes.pendingDesc") : t("messes.pendingMember"),
      badge: t("messes.pendingBadge"),
    },
    rejected: {
      icon: XCircle,
      tone: "bg-danger-soft text-destructive",
      title: t("messes.rejectedTitle"),
      desc: t("messes.rejectedDesc"),
      badge: undefined,
    },
    inactive: {
      icon: Ban,
      tone: "bg-muted text-muted-foreground",
      title: t("messes.inactiveTitle"),
      desc: t("messes.inactiveDesc"),
      badge: undefined,
    },
    active: {
      icon: Clock3,
      tone: "bg-success-soft text-success",
      title: t("messes.nowActive"),
      desc: "",
      badge: undefined,
    },
  }[mess.status]

  return (
    <SetupShell>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: EASE }}
        className="w-full max-w-lg"
      >
        <Card className="relative items-center gap-0 overflow-hidden px-6 pt-10 pb-6 text-center shadow-sm sm:px-8">
          <div className="relative mb-5 flex size-24 items-center justify-center">
            <Rings size={96} className="inset-0" />
            <span className={cn("relative flex size-12 items-center justify-center rounded-full ring-1 ring-border", view.tone)}>
              <view.icon className="size-5" />
            </span>
          </div>
          <h1 className="text-xl font-semibold tracking-tight">{view.title}</h1>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">{view.desc}</p>

          <dl className="mt-6 grid w-full gap-3 rounded-xl border bg-muted/30 p-4 text-left text-sm">
            <div className="flex items-start justify-between gap-3">
              <dt className="text-muted-foreground">{t("messes.name")}</dt>
              <dd className="text-right font-medium">{mess.name}</dd>
            </div>
            <div className="flex items-start justify-between gap-3">
              <dt className="flex items-center gap-1.5 text-muted-foreground">
                <MapPin className="size-3.5" /> {t("messes.address")}
              </dt>
              <dd className="text-right">{mess.address}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="flex items-center gap-1.5 text-muted-foreground">
                <CalendarDays className="size-3.5" /> {t("messes.createdOn")}
              </dt>
              <dd>{date(mess.created_at.slice(0, 10), "long")}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-muted-foreground">{t("messes.statusLabel")}</dt>
              <dd>
                <MessStatusBadge status={mess.status} label={view.badge} />
              </dd>
            </div>
            {mess.status === "rejected" && (
              <div className="border-t pt-3">
                <dt className="text-xs text-muted-foreground">{t("messes.rejectionReason")}</dt>
                <dd className="mt-1 whitespace-pre-line">{mess.rejection_reason || t("messes.noReason")}</dd>
              </div>
            )}
          </dl>

          {mess.status === "pending" && (
            <p className="mt-4 flex items-start gap-2 text-left text-xs text-muted-foreground">
              <Lock className="mt-px size-3.5 shrink-0" />
              {t("messes.lockedModules")}
            </p>
          )}

          <div className="mt-6 flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-center">
            <Button variant="outline" onClick={signOut}>
              <LogOut /> {t("nav.logout")}
            </Button>
            {mess.status === "rejected" && mess.is_creator ? (
              <Button onClick={() => setDiscardOpen(true)}>{t("messes.startOver")}</Button>
            ) : (
              <Button onClick={refresh} disabled={refreshing}>
                {refreshing ? <Loader2 className="animate-spin" /> : <RefreshCw />}
                {t("messes.refreshStatus")}
              </Button>
            )}
          </div>
        </Card>
      </motion.div>

      <ConfirmDialog
        open={discardOpen}
        onOpenChange={setDiscardOpen}
        title={t("messes.startOverConfirmTitle")}
        description={t("messes.startOverConfirm")}
        confirmLabel={t("messes.startOver")}
        destructive
        pending={discarding}
        onConfirm={discard}
      />
    </SetupShell>
  )
}
