"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
import { useEffect } from "react"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"
import type { z } from "zod"
import { Field } from "@/components/common/field"
import { SimpleSelect } from "@/components/common/simple-select"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useConfirmSave } from "@/components/providers/confirm-provider"
import { useI18n } from "@/components/providers/i18n-provider"
import { useInvalidateCycle } from "@/features/accounts/queries"
import type { CycleMember } from "@/features/members/queries"
import { PAYMENT_METHODS, PAYMENT_PURPOSES } from "@/lib/constants"
import { errorKey } from "@/lib/errors"
import { defaultDateForMonth, isDateInMonth, monthEndISO, monthStartISO, toNumber } from "@/lib/format"
import { qk } from "@/lib/query-keys"
import { savePayment } from "@/actions/records"
import { errOf } from "@/lib/api"
import type { MonthlyCycle, Payment, PaymentPurpose } from "@/lib/types"
import { cn } from "@/lib/utils"
import { paymentSchema } from "@/lib/validation"

type Values = z.input<typeof paymentSchema>

export function PaymentFormDialog({
  cycle,
  members,
  open,
  onOpenChange,
  payment,
  preset,
}: {
  cycle: MonthlyCycle
  members: CycleMember[]
  open: boolean
  onOpenChange: (open: boolean) => void
  payment?: Payment | null
  /** Pre-filled values for a new payment (e.g. from the rent page). */
  preset?: { memberId?: string; purpose?: PaymentPurpose; amount?: number }
}) {
  const { t, monthName } = useI18n()
  const confirmSave = useConfirmSave()
  const invalidate = useInvalidateCycle()
  const isEdit = !!payment

  const form = useForm<Values>({ resolver: zodResolver(paymentSchema) })
  const { errors, isSubmitting } = form.formState

  useEffect(() => {
    if (!open) return
    form.reset(
      payment
        ? {
            member_id: payment.member_id,
            date: payment.date,
            amount: String(toNumber(payment.amount)),
            payment_method: payment.payment_method,
            purpose: payment.purpose,
            note: payment.note ?? "",
          }
        : {
            member_id: preset?.memberId ?? "",
            date: defaultDateForMonth(cycle.year, cycle.month),
            amount: preset?.amount ? String(preset.amount) : "",
            payment_method: "cash",
            purpose: preset?.purpose ?? "mess",
            note: "",
          }
    )
    // Reset only when the dialog opens; `preset` is often an inline object.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, payment])

  const onSubmit = (raw: Values) => {
    const values = paymentSchema.parse(raw)
    if (!isDateInMonth(values.date, cycle.year, cycle.month)) {
      form.setError("date", { message: "validation.dateInMonth" })
      return
    }
    confirmSave(async () => {
      const error = errOf(await savePayment(cycle.id, raw, payment?.id))
      if (error) {
        toast.error(t(errorKey(error)))
        return
      }
      toast.success(t(isEdit ? "payments.updated" : "payments.added"))
      await invalidate(cycle.id, [qk.payments, qk.rents])
      onOpenChange(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !isSubmitting && onOpenChange(o)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t(isEdit ? "payments.edit" : "payments.add")}</DialogTitle>
          <DialogDescription>{monthName(cycle.year, cycle.month)}</DialogDescription>
        </DialogHeader>
        <form id="payment-form" onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4" noValidate>
          <Field label={t("common.member")} htmlFor="p-member" error={errors.member_id?.message}>
            <Controller
              control={form.control}
              name="member_id"
              render={({ field }) => (
                <SimpleSelect
                  id="p-member"
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  options={members.map((m) => ({ value: m.id, label: m.full_name }))}
                  placeholder={t("common.selectMember")}
                  invalid={!!errors.member_id}
                />
              )}
            />
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label={t("common.amount")} htmlFor="p-amount" error={errors.amount?.message}>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground">৳</span>
                <Input
                  id="p-amount"
                  type="number"
                  inputMode="decimal"
                  step="any"
                  min={0}
                  placeholder="0"
                  className="tabular pl-7"
                  aria-invalid={!!errors.amount}
                  {...form.register("amount")}
                />
              </div>
            </Field>
            <Field label={t("common.date")} htmlFor="p-date" error={errors.date?.message}>
              <Input
                id="p-date"
                type="date"
                min={monthStartISO(cycle.year, cycle.month)}
                max={monthEndISO(cycle.year, cycle.month)}
                aria-invalid={!!errors.date}
                {...form.register("date")}
              />
            </Field>
          </div>
          <Field label={t("payments.method")} error={errors.payment_method?.message}>
            <Controller
              control={form.control}
              name="payment_method"
              render={({ field }) => (
                <div role="radiogroup" aria-label={t("payments.method")} className="flex flex-wrap gap-2">
                  {PAYMENT_METHODS.map((m) => (
                    <button
                      key={m}
                      type="button"
                      role="radio"
                      aria-checked={field.value === m}
                      onClick={() => field.onChange(m)}
                      className={cn(
                        "rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
                        field.value === m
                          ? "border-primary bg-accent text-accent-foreground"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      {t(`paymentMethods.${m}`)}
                    </button>
                  ))}
                </div>
              )}
            />
          </Field>
          <Field label={t("payments.purpose")} error={errors.purpose?.message}>
            <Controller
              control={form.control}
              name="purpose"
              render={({ field }) => (
                <div role="radiogroup" aria-label={t("payments.purpose")} className="grid grid-cols-2 gap-2">
                  {PAYMENT_PURPOSES.map((p) => (
                    <button
                      key={p}
                      type="button"
                      role="radio"
                      aria-checked={field.value === p}
                      onClick={() => field.onChange(p)}
                      className={cn(
                        "rounded-lg border px-3 py-2 text-left text-sm font-medium transition-colors",
                        field.value === p
                          ? "border-primary bg-accent text-accent-foreground"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      {t(p === "rent" ? "payments.purposeRent" : "payments.purposeMess")}
                    </button>
                  ))}
                </div>
              )}
            />
          </Field>
          <Field label={t("common.note")} htmlFor="p-note" optional error={errors.note?.message}>
            <Textarea id="p-note" rows={2} {...form.register("note")} />
          </Field>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" form="payment-form" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="animate-spin" />}
            {isSubmitting ? t("common.saving") : t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
