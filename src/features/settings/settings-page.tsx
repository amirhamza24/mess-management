"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Building2, Loader2, SlidersHorizontal } from "lucide-react"
import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import type { z } from "zod"
import { Field } from "@/components/common/field"
import { FadeIn } from "@/components/common/motion"
import { PageHeader } from "@/components/common/page-header"
import { LanguageSwitch, ThemeSelect } from "@/components/layout/preferences"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useI18n } from "@/components/providers/i18n-provider"
import { useMess } from "@/features/mess/mess-provider"
import { errorKey } from "@/lib/errors"
import { updateMess } from "@/actions/records"
import { errOf } from "@/lib/api"
import { messSchema } from "@/lib/validation"

type Values = z.infer<typeof messSchema>

export function SettingsPage() {
  const { t } = useI18n()
  const { mess, isManager, refreshMess } = useMess()
  const form = useForm<Values>({
    resolver: zodResolver(messSchema),
    defaultValues: { name: mess.name, address: mess.address ?? "" },
  })
  const { errors, isSubmitting, isDirty } = form.formState

  useEffect(() => {
    form.reset({ name: mess.name, address: mess.address ?? "" })
  }, [mess, form])

  const onSubmit = async (values: Values) => {
    const error = errOf(await updateMess(values))
    if (error) return void toast.error(t(errorKey(error)))
    toast.success(t("settings.saved"))
    await refreshMess()
  }

  return (
    <FadeIn className="grid max-w-3xl gap-5">
      <PageHeader title={t("settings.title")} description={t("settings.subtitle")} />

      <Card className="shadow-xs">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="size-4 text-primary" /> {t("settings.messInfo")}
          </CardTitle>
          <CardDescription>{isManager ? t("settings.messInfoDesc") : t("settings.managerOnly")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4" noValidate>
            <Field label={t("onboarding.messName")} htmlFor="s-name" error={errors.name?.message}>
              <Input id="s-name" disabled={!isManager} aria-invalid={!!errors.name} {...form.register("name")} />
            </Field>
            <Field label={t("onboarding.messAddress")} htmlFor="s-address" optional error={errors.address?.message}>
              <Textarea id="s-address" rows={2} disabled={!isManager} {...form.register("address")} />
            </Field>
            {isManager && (
              <Button type="submit" disabled={isSubmitting || !isDirty} className="justify-self-end">
                {isSubmitting && <Loader2 className="animate-spin" />}
                {isSubmitting ? t("common.saving") : t("common.save")}
              </Button>
            )}
          </form>
        </CardContent>
      </Card>

      <Card className="shadow-xs">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SlidersHorizontal className="size-4 text-primary" /> {t("settings.preferences")}
          </CardTitle>
          <CardDescription>{t("settings.preferencesDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm font-medium">{t("settings.language")}</span>
            <LanguageSwitch size="md" />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm font-medium">{t("settings.theme")}</span>
            <ThemeSelect />
          </div>
        </CardContent>
      </Card>
    </FadeIn>
  )
}
