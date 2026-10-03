"use client"

import { AnimatePresence, motion } from "framer-motion"
import { Ban, CheckCircle2, Clock3, XCircle } from "lucide-react"
import { useI18n } from "@/components/providers/i18n-provider"
import type { MessStatus } from "@/lib/types"
import { cn } from "@/lib/utils"

const STYLE: Record<MessStatus, { className: string; icon: typeof Clock3 }> = {
  pending: { className: "bg-warning-soft text-warning ring-warning/20", icon: Clock3 },
  active: { className: "bg-success-soft text-success ring-success/20", icon: CheckCircle2 },
  inactive: { className: "bg-muted text-muted-foreground ring-border", icon: Ban },
  rejected: { className: "bg-danger-soft text-destructive ring-destructive/20", icon: XCircle },
}

/** Mess status pill; cross-fades when the status changes. */
export function MessStatusBadge({ status, label, className }: { status: MessStatus; label?: string; className?: string }) {
  const { t } = useI18n()
  const { className: tone, icon: Icon } = STYLE[status]
  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.span
        key={status}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.2 }}
        className={cn(
          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset",
          tone,
          className
        )}
      >
        <Icon className="size-3" />
        {label ?? t(`messes.status_${status}`)}
      </motion.span>
    </AnimatePresence>
  )
}
