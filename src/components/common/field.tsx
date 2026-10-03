"use client"

import { Label } from "@/components/ui/label"
import { useI18n } from "@/components/providers/i18n-provider"
import type { TKey } from "@/i18n"
import { cn } from "@/lib/utils"

/**
 * Form field wrapper: label, control, hint and a translated validation error.
 * Zod schemas use translation keys as messages (see lib/validation.ts).
 */
export function Field({
  label,
  htmlFor,
  error,
  hint,
  optional,
  className,
  children,
}: {
  label?: React.ReactNode
  htmlFor?: string
  error?: string
  hint?: React.ReactNode
  optional?: boolean
  className?: string
  children: React.ReactNode
}) {
  const { t } = useI18n()
  const message = error ? (error.includes(".") ? t(error as TKey) : error) : undefined
  return (
    <div className={cn("grid gap-1.5", className)}>
      {label && (
        <Label htmlFor={htmlFor} className="text-[0.8rem] font-medium text-foreground/90">
          {label}
          {optional && <span className="font-normal text-muted-foreground"> ({t("common.optional")})</span>}
        </Label>
      )}
      {children}
      {message ? (
        <p role="alert" className="text-xs text-destructive">
          {message}
        </p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  )
}
