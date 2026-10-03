"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useQueryClient } from "@tanstack/react-query"
import { Loader2 } from "lucide-react"
import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import type { z } from "zod"
import { Field } from "@/components/common/field"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { useI18n } from "@/components/providers/i18n-provider"
import { useMess } from "@/features/mess/mess-provider"
import { errorKey } from "@/lib/errors"
import { todayISO } from "@/lib/format"
import { qk } from "@/lib/query-keys"
import { createMember, updateMember } from "@/actions/members"
import { errOf } from "@/lib/api"
import type { MessMember } from "@/lib/types"
import { memberSchema } from "@/lib/validation"

type Values = z.infer<typeof memberSchema>

export function MemberFormDialog({
  open,
  onOpenChange,
  member,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Edit when provided, otherwise add. */
  member?: MessMember | null
}) {
  const { t, monthName } = useI18n()
  const { mess, cycle, refreshMess } = useMess()
  const queryClient = useQueryClient()
  const isEdit = !!member
  const canAddToMonth = !isEdit && cycle?.status === "open"
  const [addToMonth, setAddToMonth] = useState(true)
  const [rent, setRent] = useState("")

  const form = useForm<Values>({
    resolver: zodResolver(memberSchema),
    defaultValues: { full_name: "", email: "", phone: "", joined_at: todayISO() },
  })
  const { errors, isSubmitting } = form.formState

  useEffect(() => {
    if (!open) return
    form.reset({
      full_name: member?.full_name ?? "",
      email: member?.email ?? "",
      phone: member?.phone ?? "",
      joined_at: member?.joined_at ?? todayISO(),
    })
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset local fields when reopened
    setAddToMonth(true)
    setRent("")
  }, [open, member, form])

  const onSubmit = async (values: Values) => {
    if (isEdit) {
      const error = errOf(await updateMember(member!.id, values))
      if (error) return void toast.error(t(errorKey(error)))
      toast.success(t("members.updated"))
    } else {
      // Optionally joins the open month in the same request (rent defaults to 0 when blank).
      const addTo = canAddToMonth && addToMonth && cycle ? { cycleId: cycle.id, rent: rent || 0 } : undefined
      const error = errOf(await createMember(values, addTo))
      if (error) return void toast.error(t(errorKey(error)))
      if (addTo) {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: qk.monthlyMembers(addTo.cycleId) }),
          queryClient.invalidateQueries({ queryKey: qk.rents(addTo.cycleId) }),
          queryClient.invalidateQueries({ queryKey: qk.summary(addTo.cycleId) }),
        ])
      }
      toast.success(t("members.added"))
    }
    await refreshMess()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !isSubmitting && onOpenChange(o)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t(isEdit ? "members.edit" : "members.add")}</DialogTitle>
          <DialogDescription>{mess.name}</DialogDescription>
        </DialogHeader>
        <form id="member-form" onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4" noValidate>
          <Field label={t("members.fullName")} htmlFor="m-name" error={errors.full_name?.message}>
            <Input id="m-name" placeholder={t("auth.placeholderName")} aria-invalid={!!errors.full_name} {...form.register("full_name")} />
          </Field>
          <Field label={t("members.email")} htmlFor="m-email" optional error={errors.email?.message} hint={t("members.emailHint")}>
            <Input id="m-email" type="email" placeholder={t("auth.placeholderEmail")} aria-invalid={!!errors.email} {...form.register("email")} />
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label={t("members.phone")} htmlFor="m-phone" optional error={errors.phone?.message}>
              <Input id="m-phone" type="tel" inputMode="tel" placeholder={t("auth.placeholderPhone")} aria-invalid={!!errors.phone} {...form.register("phone")} />
            </Field>
            <Field label={t("members.joiningDate")} htmlFor="m-joined" error={errors.joined_at?.message}>
              <Input id="m-joined" type="date" aria-invalid={!!errors.joined_at} {...form.register("joined_at")} />
            </Field>
          </div>

          {canAddToMonth && cycle && (
            <div className="grid grid-cols-1 gap-3 rounded-lg border bg-muted/30 p-3">
              <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
                <Checkbox checked={addToMonth} onCheckedChange={(v) => setAddToMonth(v === true)} />
                {t("members.addToMonth")} — {monthName(cycle.year, cycle.month)}
              </label>
              {addToMonth && (
                <Field label={t("members.rentForMonth")} htmlFor="m-rent">
                  <div className="relative">
                    <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground">৳</span>
                    <Input id="m-rent" type="number" inputMode="decimal" min={0} step="any" value={rent} onChange={(e) => setRent(e.target.value)} className="pl-7" />
                  </div>
                </Field>
              )}
            </div>
          )}
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" form="member-form" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="animate-spin" />}
            {isSubmitting ? t("common.saving") : t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
