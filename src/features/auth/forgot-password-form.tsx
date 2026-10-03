"use client"

import { ArrowLeft, KeyRound } from "lucide-react"
import Link from "next/link"
import { useI18n } from "@/components/providers/i18n-provider"
import { AuthCard } from "./auth-shell"

/** Passwords are reset by a manager from the Approvals page (no email service needed). */
export function ForgotPasswordForm() {
  const { t } = useI18n()
  return (
    <AuthCard
      title={t("auth.forgotTitle")}
      description={t("auth.forgotSubtitle")}
      footer={
        <Link href="/login" className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline">
          <ArrowLeft className="size-3.5" /> {t("auth.backToLogin")}
        </Link>
      }
    >
      <div className="flex flex-col items-center gap-3 rounded-xl bg-accent/60 p-6 text-center">
        <span className="flex size-11 items-center justify-center rounded-full bg-accent text-accent-foreground">
          <KeyRound className="size-5" />
        </span>
        <p className="text-sm">{t("auth.forgotInfo")}</p>
      </div>
    </AuthCard>
  )
}
