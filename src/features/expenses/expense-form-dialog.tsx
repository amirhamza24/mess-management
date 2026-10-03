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
import { useI18n } from "@/components/providers/i18n-provider"
import { useInvalidateCycle } from "@/features/accounts/queries"
import type { CycleMember } from "@/features/members/queries"
import type { TKey } from "@/i18n"
import { errorKey } from "@/lib/errors"
import { defaultDateForMonth, isDateInMonth, monthEndISO, monthStartISO, toNumber } from "@/lib/format"
import { saveExpense } from "@/actions/records"
import { errOf } from "@/lib/api"
import type { MonthlyCycle } from "@/lib/types"
import { EXPENSE_KINDS, type ExpenseKind } from "./config"
import type { ExpenseRow } from "./queries"

type Values = z.input<typeof EXPENSE_KINDS.food.schema>

export function ExpenseFormDialog({
  kind,
  cycle,
  members,
  open,
  onOpenChange,
  expense,
}: {
  kind: ExpenseKind
  cycle: MonthlyCycle
  members: CycleMember[]
  open: boolean
  onOpenChange: (open: boolean) => void
  expense?: ExpenseRow | null
}) {
  const { t, monthName } = useI18n()
  const cfg = EXPENSE_KINDS[kind]
  const invalidate = useInvalidateCycle()
  const isEdit = !!expense

  const form = useForm<Values>({
    // Both schemas share the same shape; only the category enum differs.
    resolver: zodResolver(cfg.schema as typeof EXPENSE_KINDS.food.schema),
    defaultValues: emptyValues(),
  })
  const { errors, isSubmitting } = form.formState

  function emptyValues(): Values {
    return {
      date: defaultDateForMonth(cycle.year, cycle.month),
      paid_by: "",
      category: cfg.defaultCategory as Values["category"],
      description: "",
      amount: "",
      note: "",
    }
  }

  useEffect(() => {
    if (!open) return
    form.reset(
      expense
        ? {
            date: expense.date,
            paid_by: expense.paid_by ?? "",
            category: expense.category as Values["category"],
            description: expense.description ?? "",
            amount: String(toNumber(expense.amount)),
            note: expense.note ?? "",
          }
        : emptyValues()
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, expense])

  const onSubmit = async (raw: Values) => {
    const values = cfg.schema.parse(raw)
    if (!isDateInMonth(values.date, cycle.year, cycle.month)) {
      form.setError("date", { message: "validation.dateInMonth" })
      return
    }
    const error = errOf(await saveExpense(kind, cycle.id, raw, expense?.id))
    if (error) {
      toast.error(t(errorKey(error)))
      return
    }
    toast.success(t(`${cfg.ns}.${isEdit ? "updated" : "added"}` as TKey))
    await invalidate(cycle.id, [cfg.queryKey])
    onOpenChange(false)
  }

  const categoryOptions = cfg.categories.map((c) => ({ value: c, label: t(`${cfg.categoryPrefix}.${c}` as TKey) }))
  const memberOptions = [
    { value: "", label: t("common.noneSelected") },
    ...members.map((m) => ({ value: m.id, label: m.full_name })),
  ]

  return (
    <Dialog open={open} onOpenChange={(o) => !isSubmitting && onOpenChange(o)}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t(`${cfg.ns}.${isEdit ? "edit" : "add"}` as TKey)}</DialogTitle>
          <DialogDescription>{monthName(cycle.year, cycle.month)}</DialogDescription>
        </DialogHeader>
        <form id="expense-form" onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4" noValidate>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label={t("common.date")} htmlFor="e-date" error={errors.date?.message}>
              <Input
                id="e-date"
                type="date"
                min={monthStartISO(cycle.year, cycle.month)}
                max={monthEndISO(cycle.year, cycle.month)}
                aria-invalid={!!errors.date}
                {...form.register("date")}
              />
            </Field>
            <Field label={t("common.category")} htmlFor="e-category" error={errors.category?.message}>
              <Controller
                control={form.control}
                name="category"
                render={({ field }) => (
                  <SimpleSelect
                    id="e-category"
                    value={field.value}
                    onChange={field.onChange}
                    options={categoryOptions}
                    invalid={!!errors.category}
                  />
                )}
              />
            </Field>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label={t("common.amount")} htmlFor="e-amount" error={errors.amount?.message}>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground">৳</span>
                <Input
                  id="e-amount"
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
            <Field label={t(cfg.paidByLabel)} htmlFor="e-paid-by" optional>
              <Controller
                control={form.control}
                name="paid_by"
                render={({ field }) => (
                  <SimpleSelect
                    id="e-paid-by"
                    value={field.value}
                    onChange={field.onChange}
                    options={memberOptions}
                    placeholder={t("common.selectMember")}
                  />
                )}
              />
            </Field>
          </div>
          <Field label={t("common.description")} htmlFor="e-desc" optional error={errors.description?.message}>
            <Input id="e-desc" placeholder={t(cfg.placeholder)} {...form.register("description")} />
          </Field>
          <Field label={t("common.note")} htmlFor="e-note" optional error={errors.note?.message}>
            <Textarea id="e-note" rows={2} {...form.register("note")} />
          </Field>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" form="expense-form" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="animate-spin" />}
            {isSubmitting ? t("common.saving") : t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
