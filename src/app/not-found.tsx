"use client"

import { Compass } from "lucide-react"
import Link from "next/link"
import { Rings } from "@/components/brand/rings"
import { Button } from "@/components/ui/button"
import { useI18n } from "@/components/providers/i18n-provider"

export default function NotFound() {
  const { t } = useI18n()
  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden p-6 text-center">
      <Rings size={520} className="top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
      <span className="relative flex size-12 items-center justify-center rounded-full bg-card text-primary shadow-xs ring-1 ring-border">
        <Compass className="size-5" />
      </span>
      <p className="relative mt-4 text-5xl font-semibold tracking-tight text-primary">404</p>
      <h1 className="relative mt-2 text-lg font-semibold">{t("errors.notFound")}</h1>
      <p className="relative mt-1 text-sm text-muted-foreground">{t("errors.notFoundDesc")}</p>
      <Button className="relative mt-6" nativeButton={false} render={<Link href="/dashboard" />}>
        {t("errors.goHome")}
      </Button>
    </div>
  )
}
