"use client"

import { AlertTriangle, RotateCw } from "lucide-react"
import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useI18n } from "@/components/providers/i18n-provider"

// Render errors inside the app shell; never show raw error details to users.
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useI18n()
  useEffect(() => {
    console.error(error)
  }, [error])
  return (
    <Card className="items-center gap-3 px-6 py-16 text-center shadow-xs">
      <span className="flex size-11 items-center justify-center rounded-full bg-danger-soft text-destructive">
        <AlertTriangle className="size-5" />
      </span>
      <h2 className="font-semibold">{t("errors.crashTitle")}</h2>
      <p className="max-w-sm text-sm text-muted-foreground">{t("errors.crashDesc")}</p>
      <Button variant="outline" onClick={reset}>
        <RotateCw /> {t("common.retry")}
      </Button>
    </Card>
  )
}
