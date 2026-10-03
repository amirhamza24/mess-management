"use client"

import { AlertTriangle, RotateCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useI18n } from "@/components/providers/i18n-provider"
import { errorKey } from "@/lib/errors"
import { cn } from "@/lib/utils"

export function ErrorState({
  error,
  onRetry,
  className,
}: {
  error?: unknown
  onRetry?: () => void
  className?: string
}) {
  const { t } = useI18n()
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 px-6 py-12 text-center", className)}>
      <span className="flex size-11 items-center justify-center rounded-full bg-danger-soft text-destructive">
        <AlertTriangle className="size-5" />
      </span>
      <div>
        <p className="font-medium">{t("errors.loadFailed")}</p>
        <p className="mt-1 text-sm text-muted-foreground">{t(errorKey(error))}</p>
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RotateCw /> {t("common.retry")}
        </Button>
      )}
    </div>
  )
}
