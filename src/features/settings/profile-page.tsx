"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useQueryClient } from "@tanstack/react-query"
import { History, KeyRound, Loader2, Mail, UserCircle2 } from "lucide-react"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import type { z } from "zod"
import { Field } from "@/components/common/field"
import { MemberAvatar } from "@/components/common/member-avatar"
import { FadeIn } from "@/components/common/motion"
import { PageHeader } from "@/components/common/page-header"
import { PasswordInput } from "@/components/common/password-input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useI18n } from "@/components/providers/i18n-provider"
import { useMess } from "@/features/mess/mess-provider"
import { changePassword as changePasswordAction, updateProfile } from "@/actions/auth"
import { errOf } from "@/lib/api"
import { errorKey } from "@/lib/errors"
import { qk } from "@/lib/query-keys"
import { changePasswordSchema, profileSchema } from "@/lib/validation"

type ProfileValues = z.infer<typeof profileSchema>
type PasswordValues = z.infer<typeof changePasswordSchema>

export function ProfilePage() {
  const { t } = useI18n()
  const queryClient = useQueryClient()
  const { me, mess, memberId, isManager, displayName } = useMess()

  const profileForm = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { full_name: me.user.name || displayName, phone: me.user.phone ?? "" },
  })
  const passwordForm = useForm<PasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { current: "", password: "", confirmPassword: "" },
  })
  const pe = profileForm.formState
  const pw = passwordForm.formState

  const saveProfile = async (values: ProfileValues) => {
    const error = errOf(await updateProfile(values))
    if (error) return void toast.error(t(errorKey(error)))
    toast.success(t("profile.updated"))
    profileForm.reset(values)
    await queryClient.invalidateQueries({ queryKey: qk.me })
  }

  const changePassword = async ({ current, password }: PasswordValues) => {
    const error = errOf(await changePasswordAction({ current, password }))
    if (error) return void toast.error(t(errorKey(error)))
    toast.success(t("profile.passwordChanged"))
    passwordForm.reset()
  }

  return (
    <FadeIn className="grid max-w-3xl gap-5">
      <PageHeader title={t("profile.title")} description={t("profile.subtitle")} />

      <Card className="flex-row items-center gap-4 p-5 shadow-xs">
        <MemberAvatar name={displayName} src={me.member?.avatar_url} className="size-14 text-base" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-semibold">{displayName}</p>
          <p className="flex items-center gap-1.5 truncate text-sm text-muted-foreground">
            <Mail className="size-3.5" /> {me.user.email}
          </p>
          <p className="mt-1.5 flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground">{t("profile.memberOf")}:</span>
            <span className="font-medium">{mess.name}</span>
            <Badge variant="secondary" className={isManager ? "bg-accent text-accent-foreground" : undefined}>
              {t(isManager ? "roles.manager" : "roles.member")}
            </Badge>
          </p>
        </div>
        <Button variant="outline" size="sm" className="hidden sm:inline-flex" nativeButton={false} render={<Link href={`/members/${memberId}`} />}>
          <History /> {t("members.history")}
        </Button>
      </Card>

      <Card className="shadow-xs">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCircle2 className="size-4 text-primary" /> {t("profile.personal")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={profileForm.handleSubmit(saveProfile)} className="grid grid-cols-1 gap-4" noValidate>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label={t("auth.fullName")} htmlFor="pf-name" error={pe.errors.full_name?.message}>
                <Input id="pf-name" aria-invalid={!!pe.errors.full_name} {...profileForm.register("full_name")} />
              </Field>
              <Field label={t("auth.phone")} htmlFor="pf-phone" optional error={pe.errors.phone?.message}>
                <Input id="pf-phone" type="tel" inputMode="tel" placeholder={t("auth.placeholderPhone")} aria-invalid={!!pe.errors.phone} {...profileForm.register("phone")} />
              </Field>
            </div>
            <Field label={t("auth.email")} htmlFor="pf-email">
              <Input id="pf-email" value={me.user.email} disabled readOnly />
            </Field>
            <Button type="submit" disabled={pe.isSubmitting || !pe.isDirty} className="justify-self-end">
              {pe.isSubmitting && <Loader2 className="animate-spin" />}
              {pe.isSubmitting ? t("common.saving") : t("common.save")}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="shadow-xs">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="size-4 text-primary" /> {t("profile.security")}
          </CardTitle>
          <CardDescription>{t("profile.changePassword")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={passwordForm.handleSubmit(changePassword)} className="grid grid-cols-1 gap-4" noValidate>
            <Field label={t("auth.currentPassword")} htmlFor="pw-current" error={pw.errors.current?.message}>
              <PasswordInput id="pw-current" autoComplete="current-password" aria-invalid={!!pw.errors.current} {...passwordForm.register("current")} />
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label={t("auth.newPassword")} htmlFor="pw-new" error={pw.errors.password?.message}>
                <PasswordInput id="pw-new" autoComplete="new-password" aria-invalid={!!pw.errors.password} {...passwordForm.register("password")} />
              </Field>
              <Field label={t("auth.confirmPassword")} htmlFor="pw-confirm" error={pw.errors.confirmPassword?.message}>
                <PasswordInput id="pw-confirm" autoComplete="new-password" aria-invalid={!!pw.errors.confirmPassword} {...passwordForm.register("confirmPassword")} />
              </Field>
            </div>
            <Button type="submit" variant="outline" disabled={pw.isSubmitting} className="justify-self-end">
              {pw.isSubmitting && <Loader2 className="animate-spin" />}
              {t("profile.changePassword")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </FadeIn>
  )
}
