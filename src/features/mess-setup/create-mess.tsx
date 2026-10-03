"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { AnimatePresence, motion } from "framer-motion"
import { ArrowLeft, Building2, CheckCircle2, ClipboardList, Loader2, MapPin, Plus, ShieldCheck, Sparkles } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import type { z } from "zod"
import { createMess } from "@/actions/mess"
import { Rings } from "@/components/brand/rings"
import { Field } from "@/components/common/field"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useI18n } from "@/components/providers/i18n-provider"
import { errOf } from "@/lib/api"
import { errorKey } from "@/lib/errors"
import { messSchema } from "@/lib/validation"
import { SetupShell } from "./setup-shell"

type Values = z.infer<typeof messSchema>
const EASE = [0.16, 1, 0.3, 1] as const

/** First-run experience for users without a mess: welcome → form → confirm → pending. */
export function CreateMess({ userName }: { userName: string }) {
  const { t } = useI18n()
  const router = useRouter()
  const [step, setStep] = useState<"intro" | "form">("intro")
  const [confirming, setConfirming] = useState<Values | null>(null)
  const [pending, setPending] = useState(false)

  const form = useForm<Values>({
    resolver: zodResolver(messSchema),
    defaultValues: { name: "", address: "", description: "" },
  })
  const { errors } = form.formState

  const submit = async () => {
    if (!confirming) return
    setPending(true)
    const result = await createMess(confirming)
    const error = errOf(result)
    if (error) {
      setPending(false)
      setConfirming(null)
      if (error === "MESS_NAME_TAKEN") form.setError("name", { message: "errors.messNameTaken" })
      toast.error(t(errorKey(error)))
      return
    }
    toast.success(t("messes.createdToast"))
    router.replace("/mess-status")
    router.refresh()
  }

  const steps = [
    { icon: ClipboardList, label: t("messes.step1") },
    { icon: ShieldCheck, label: t("messes.step2") },
    { icon: Sparkles, label: t("messes.step3") },
  ]

  return (
    <SetupShell>
      <AnimatePresence mode="wait">
        {step === "intro" ? (
          <motion.section
            key="intro"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.4, ease: EASE }}
            className="w-full max-w-xl text-center"
          >
            <div className="relative mx-auto mb-6 flex size-28 items-center justify-center">
              <Rings size={112} intensity="medium" className="inset-0" />
              <span className="relative flex size-14 items-center justify-center rounded-2xl bg-brand-deep text-white shadow-lg shadow-primary/25">
                <Building2 className="size-6" />
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{userName}</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">{t("messes.createTitle")}</h1>
            <p className="mx-auto mt-2 max-w-md text-muted-foreground">{t("messes.createSubtitle")}</p>

            <ol className="mx-auto mt-8 grid max-w-lg gap-3 text-left sm:grid-cols-3">
              {steps.map((s, i) => (
                <motion.li
                  key={s.label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: 0.15 + i * 0.07, ease: EASE }}
                  className="flex items-center gap-3 rounded-xl border bg-card/80 p-3 text-sm shadow-xs sm:flex-col sm:items-start"
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                    <s.icon className="size-4" />
                  </span>
                  <span>
                    <span className="block text-xs text-muted-foreground">0{i + 1}</span>
                    {s.label}
                  </span>
                </motion.li>
              ))}
            </ol>

            <Button size="lg" className="mt-8 px-6" onClick={() => setStep("form")}>
              <Plus /> {t("messes.createCta")}
            </Button>
          </motion.section>
        ) : (
          <motion.section
            key="form"
            initial={{ opacity: 0, y: 16, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.4, ease: EASE }}
            className="w-full max-w-lg"
          >
            <Button variant="ghost" size="sm" className="mb-3 -ml-2 text-muted-foreground" onClick={() => setStep("intro")}>
              <ArrowLeft /> {t("common.back")}
            </Button>
            <Card className="gap-6 p-6 shadow-sm sm:p-8">
              <div className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                  <Building2 className="size-5" />
                </span>
                <div>
                  <h1 className="text-lg font-semibold tracking-tight">{t("messes.formTitle")}</h1>
                  <p className="text-sm text-muted-foreground">{t("messes.formDesc")}</p>
                </div>
              </div>
              <form onSubmit={form.handleSubmit((v) => setConfirming(v))} className="grid grid-cols-1 gap-4" noValidate>
                <Field label={`${t("messes.name")} *`} htmlFor="mess-name" error={errors.name?.message}>
                  <Input id="mess-name" autoFocus placeholder={t("messes.namePlaceholder")} aria-invalid={!!errors.name} {...form.register("name")} />
                </Field>
                <Field label={`${t("messes.address")} *`} htmlFor="mess-address" error={errors.address?.message}>
                  <Textarea id="mess-address" rows={2} placeholder={t("messes.addressPlaceholder")} aria-invalid={!!errors.address} {...form.register("address")} />
                </Field>
                <Field label={t("messes.description")} htmlFor="mess-description" optional error={errors.description?.message}>
                  <Textarea id="mess-description" rows={3} placeholder={t("messes.descriptionPlaceholder")} {...form.register("description")} />
                </Field>
                <Button type="submit" size="lg" className="mt-1 w-full">
                  {t("messes.submit")}
                </Button>
              </form>
            </Card>
          </motion.section>
        )}
      </AnimatePresence>

      <AlertDialog open={!!confirming} onOpenChange={(o) => !o && !pending && setConfirming(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-accent text-accent-foreground">
              <Building2 />
            </AlertDialogMedia>
            <AlertDialogTitle>{t("messes.confirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("messes.confirmDesc")}</AlertDialogDescription>
          </AlertDialogHeader>
          {confirming && (
            <dl className="grid gap-3 rounded-lg border bg-muted/40 p-3 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">{t("messes.name")}</dt>
                <dd className="font-medium">{confirming.name}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">{t("messes.address")}</dt>
                <dd className="flex items-start gap-1.5">
                  <MapPin className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                  {confirming.address}
                </dd>
              </div>
            </dl>
          )}
          <p className="flex items-start gap-2 text-xs text-muted-foreground">
            <CheckCircle2 className="mt-px size-3.5 shrink-0 text-primary" />
            {t("messes.confirmNote")}
          </p>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>{t("common.cancel")}</AlertDialogCancel>
            <Button onClick={submit} disabled={pending}>
              {pending && <Loader2 className="animate-spin" />}
              {pending ? t("messes.creating") : t("messes.submit")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SetupShell>
  )
}
