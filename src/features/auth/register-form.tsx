"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Building2, Hourglass, Loader2, UserPlus } from "lucide-react"
import { motion } from "framer-motion"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Controller, useForm, useWatch } from "react-hook-form"
import { toast } from "sonner"
import type { z } from "zod"
import { Field } from "@/components/common/field"
import { PasswordInput } from "@/components/common/password-input"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useI18n } from "@/components/providers/i18n-provider"
import { register } from "@/actions/auth"
import { errorKey } from "@/lib/errors"
import { registerSchema } from "@/lib/validation"
import { cn } from "@/lib/utils"
import { AuthCard } from "./auth-shell"
import { MessPicker } from "./mess-picker"

type Values = z.infer<typeof registerSchema>

export function RegisterForm() {
  const { t } = useI18n()
  const router = useRouter()
  const [sentTo, setSentTo] = useState<string | null>(null)

  const form = useForm<Values>({
    resolver: zodResolver(registerSchema),
    defaultValues: { fullName: "", email: "", phone: "", password: "", confirmPassword: "", intent: "create", messId: "" },
  })
  const { errors, isSubmitting } = form.formState

  const onSubmit = async (values: Values) => {
    const result = await register(values)
    if (!result.ok) {
      toast.error(t(errorKey(result.error)))
      return
    }
    // Creating a mess (or the platform's first account): signed in straight away.
    if (result.data.status === "approved") {
      toast.success(t("auth.registerSuccessNoConfirm"))
      router.replace(result.data.platform_role === "super_admin" ? "/admin" : "/welcome")
      router.refresh()
      return
    }
    setSentTo(values.email)
  }

  const intent = useWatch({ control: form.control, name: "intent" })
  const intents = [
    { value: "create" as const, icon: Building2, title: t("auth.intentCreate"), desc: t("auth.intentCreateDesc") },
    { value: "join" as const, icon: UserPlus, title: t("auth.intentJoin"), desc: t("auth.intentJoinDesc") },
  ]

  if (sentTo) {
    return (
      <AuthCard title={t("auth.registerTitle")} description={t("auth.registerSubtitle")}>
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-3 rounded-xl bg-accent/60 p-6 text-center"
        >
          <span className="flex size-11 items-center justify-center rounded-full bg-accent text-accent-foreground">
            <Hourglass className="size-5" />
          </span>
          <p className="font-semibold">{t("auth.registeredPendingTitle")}</p>
          <p className="text-sm text-muted-foreground">{t("auth.registeredPending")}</p>
          <p className="text-sm font-medium">{sentTo}</p>
        </motion.div>
        <Button variant="outline" className="mt-5 w-full" nativeButton={false} render={<Link href="/login" />}>
          {t("auth.backToLogin")}
        </Button>
      </AuthCard>
    )
  }

  return (
    <AuthCard
      title={t("auth.registerTitle")}
      description={t("auth.registerSubtitle")}
      footer={
        <>
          {t("auth.haveAccount")}{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            {t("auth.login")}
          </Link>
        </>
      }
    >
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4" noValidate>
        <Field label={t("auth.fullName")} htmlFor="fullName" error={errors.fullName?.message}>
          <Input
            id="fullName"
            autoComplete="name"
            placeholder={t("auth.placeholderName")}
            aria-invalid={!!errors.fullName}
            {...form.register("fullName")}
          />
        </Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
          <Field label={t("auth.phone")} htmlFor="phone" error={errors.phone?.message}>
            <Input
              id="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder={t("auth.placeholderPhone")}
              aria-invalid={!!errors.phone}
              {...form.register("phone")}
            />
          </Field>
        </div>
        <Field label={t("auth.intentLabel")}>
          <Controller
            control={form.control}
            name="intent"
            render={({ field }) => (
              <div role="radiogroup" aria-label={t("auth.intentLabel")} className="grid gap-2 sm:grid-cols-2">
                {intents.map((o) => {
                  const active = field.value === o.value
                  return (
                    <button
                      key={o.value}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => field.onChange(o.value)}
                      className={cn(
                        "flex items-start gap-2.5 rounded-xl border p-3 text-left transition-all outline-none focus-visible:ring-3 focus-visible:ring-ring/40",
                        active ? "border-primary bg-accent/60 shadow-xs" : "hover:border-foreground/20 hover:bg-muted/50"
                      )}
                    >
                      <span
                        className={cn(
                          "flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors",
                          active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                        )}
                      >
                        <o.icon className="size-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-medium">{o.title}</span>
                        <span className="block text-xs text-muted-foreground">{o.desc}</span>
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          />
        </Field>
        {intent === "join" && (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}>
            <Field label={t("auth.chooseMess")} htmlFor="messId" error={errors.messId?.message}>
              <Controller
                control={form.control}
                name="messId"
                render={({ field }) => (
                  <MessPicker id="messId" value={field.value} onChange={field.onChange} invalid={!!errors.messId} />
                )}
              />
            </Field>
          </motion.div>
        )}
        <Field label={t("auth.password")} htmlFor="password" error={errors.password?.message}>
          <PasswordInput
            id="password"
            autoComplete="new-password"
            aria-invalid={!!errors.password}
            {...form.register("password")}
          />
        </Field>
        <Field label={t("auth.confirmPassword")} htmlFor="confirmPassword" error={errors.confirmPassword?.message}>
          <PasswordInput
            id="confirmPassword"
            autoComplete="new-password"
            aria-invalid={!!errors.confirmPassword}
            {...form.register("confirmPassword")}
          />
        </Field>
        <Button type="submit" size="lg" disabled={isSubmitting} className="mt-1 w-full">
          {isSubmitting && <Loader2 className="animate-spin" />}
          {isSubmitting ? t("auth.registering") : t("auth.register")}
        </Button>
      </form>
    </AuthCard>
  )
}
