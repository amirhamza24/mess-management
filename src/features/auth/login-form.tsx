"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { AlertCircle, Loader2 } from "lucide-react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"
import type { z } from "zod"
import { Field } from "@/components/common/field"
import { PasswordInput } from "@/components/common/password-input"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { useI18n } from "@/components/providers/i18n-provider"
import { login } from "@/actions/auth"
import type { TKey } from "@/i18n"
import { errorKey } from "@/lib/errors"
import { loginSchema } from "@/lib/validation"
import { AuthCard } from "./auth-shell"

type Values = z.infer<typeof loginSchema>

export function LoginForm() {
  const { t } = useI18n()
  const router = useRouter()
  const params = useSearchParams()

  const form = useForm<Values>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", remember: true },
  })
  const { errors, isSubmitting } = form.formState

  // Account-state messages (pending / rejected / suspended) stay visible on the card.
  const [notice, setNotice] = useState<TKey | null>(() => {
    const reason = params.get("error")
    return reason?.startsWith("ACCOUNT_") ? errorKey(reason) : null
  })

  const onSubmit = async (values: Values) => {
    const result = await login(values)
    if (!result.ok) {
      if (result.error.startsWith("ACCOUNT_")) setNotice(errorKey(result.error))
      else toast.error(t(errorKey(result.error)))
      return
    }
    const next = params.get("next")
    router.replace(next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard")
    router.refresh()
  }

  return (
    <AuthCard
      title={t("auth.loginTitle")}
      description={t("auth.loginSubtitle")}
      footer={
        <>
          {t("auth.noAccount")}{" "}
          <Link href="/register" className="font-medium text-primary hover:underline">
            {t("auth.register")}
          </Link>
        </>
      }
    >
      {notice && (
        <div role="alert" className="mb-4 flex items-start gap-2.5 rounded-lg border border-warning/30 bg-warning-soft/60 px-3.5 py-3 text-sm">
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-warning" />
          {t(notice)}
        </div>
      )}
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4" noValidate>
        <Field label={t("auth.email")} htmlFor="email" error={errors.email?.message}>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder={t("auth.placeholderEmail")}
            aria-invalid={!!errors.email}
            {...form.register("email")}
          />
        </Field>
        <Field
          label={
            <span className="flex w-full items-center justify-between">
              {t("auth.password")}
              <Link href="/forgot-password" className="text-xs font-normal text-primary hover:underline">
                {t("auth.forgotPassword")}
              </Link>
            </span>
          }
          htmlFor="password"
          error={errors.password?.message}
        >
          <PasswordInput
            id="password"
            autoComplete="current-password"
            aria-invalid={!!errors.password}
            {...form.register("password")}
          />
        </Field>
        <Controller
          control={form.control}
          name="remember"
          render={({ field }) => (
            <label className="flex w-fit cursor-pointer items-center gap-2 text-sm text-muted-foreground select-none">
              <Checkbox checked={field.value} onCheckedChange={(v) => field.onChange(v === true)} />
              {t("auth.rememberMe")}
            </label>
          )}
        />
        <Button type="submit" size="lg" disabled={isSubmitting} className="mt-1 w-full">
          {isSubmitting && <Loader2 className="animate-spin" />}
          {isSubmitting ? t("auth.loggingIn") : t("auth.login")}
        </Button>
      </form>
    </AuthCard>
  )
}
