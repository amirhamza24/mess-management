"use client"

import { useQuery } from "@tanstack/react-query"
import { zodResolver } from "@hookform/resolvers/zod"
import { CheckCircle2, History, Home, Info, Loader2, MoreHorizontal, Pencil, Wallet, Clock } from "lucide-react"
import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import type { z } from "zod"
import { EmptyState } from "@/components/common/empty-state"
import { ErrorState } from "@/components/common/error-state"
import { Field } from "@/components/common/field"
import { MemberAvatar } from "@/components/common/member-avatar"
import { FadeIn, Stagger, StaggerItem } from "@/components/common/motion"
import { PageHeader } from "@/components/common/page-header"
import { TableSkeleton } from "@/components/common/skeletons"
import { StatCard, StatGridSkeleton } from "@/components/common/stat-card"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { useConfirmSave } from "@/components/providers/confirm-provider"
import { useI18n } from "@/components/providers/i18n-provider"
import { useCycleSummary, useInvalidateCycle } from "@/features/accounts/queries"
import { ClosedMonthBanner, MonthGate } from "@/features/cycles/month-gate"
import { useCycleMembers } from "@/features/members/queries"
import { useMemberNames, useMess } from "@/features/mess/mess-provider"
import { PaymentFormDialog } from "@/features/payments/payment-form-dialog"
import { errorKey } from "@/lib/errors"
import { toNumber } from "@/lib/format"
import { qk } from "@/lib/query-keys"
import { setAllRent, updateRent } from "@/actions/records"
import { errOf, query } from "@/lib/api"
import type { HouseRent, MonthlyCycle } from "@/lib/types"
import { cn } from "@/lib/utils"
import { rentSchema } from "@/lib/validation"

type RentStatus = "paid" | "partial" | "unpaid"

function rentStatus(amount: number, paid: number): RentStatus {
  if (amount <= 0 || paid >= amount - 0.005) return "paid"
  return paid > 0 ? "partial" : "unpaid"
}

function useRents(cycleId: string) {
  return useQuery({
    queryKey: qk.rents(cycleId),
    queryFn: () => query("rents", cycleId),
  })
}

export function RentPage() {
  const { t } = useI18n()
  return (
    <FadeIn className="grid grid-cols-1 gap-5">
      <PageHeader title={t("rent.title")} description={t("rent.subtitle")} />
      <ClosedMonthBanner />
      <MonthGate
        fallback={
          <div className="grid grid-cols-1 gap-4">
            <StatGridSkeleton count={3} className="lg:grid-cols-3" />
            <Card className="p-0 shadow-xs">
              <TableSkeleton rows={5} cols={5} />
            </Card>
          </div>
        }
      >
        {(cycle) => <RentContent key={cycle.id} cycle={cycle} />}
      </MonthGate>
    </FadeIn>
  )
}

function StatusBadge({ status }: { status: RentStatus }) {
  const { t } = useI18n()
  const styles = {
    paid: "bg-success-soft text-success",
    partial: "bg-warning-soft text-warning",
    unpaid: "bg-danger-soft text-destructive",
  }[status]
  const Icon = status === "paid" ? CheckCircle2 : Clock
  const label = { paid: "rent.statusPaid", partial: "rent.statusPartial", unpaid: "rent.statusUnpaid" } as const
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", styles)}>
      <Icon className="size-3" /> {t(label[status])}
    </span>
  )
}

function RentContent({ cycle }: { cycle: MonthlyCycle }) {
  const { t, money } = useI18n()
  const { isManager, canEdit, memberId } = useMess()
  const nameOf = useMemberNames()
  const rentsQuery = useRents(cycle.id)
  const summary = useCycleSummary(cycle.id)
  const { members } = useCycleMembers(cycle.id)

  const [editing, setEditing] = useState<HouseRent | null>(null)
  const [setAllOpen, setSetAllOpen] = useState(false)
  const [payFor, setPayFor] = useState<{ memberId: string; amount: number } | null>(null)

  const paidByMember = useMemo(
    () => new Map((summary.data?.members ?? []).map((m) => [m.member_id, m.rent_paid])),
    [summary.data]
  )

  const rows = useMemo(
    () =>
      (rentsQuery.data ?? [])
        .map((r) => {
          const amount = toNumber(r.amount)
          const paid = paidByMember.get(r.member_id) ?? 0
          return { rent: r, name: nameOf(r.member_id), amount, paid, due: Math.max(0, amount - paid), status: rentStatus(amount, paid) }
        })
        .sort((a, b) => a.name.localeCompare(b.name)),
    [rentsQuery.data, paidByMember, nameOf]
  )

  const totalRent = summary.data?.rent_total ?? 0
  const collected = rows.reduce((s, r) => s + Math.min(r.paid, r.amount), 0)
  const loading = rentsQuery.isPending || summary.isPending

  return (
    <div className="grid grid-cols-1 gap-5">
      {loading ? (
        <StatGridSkeleton count={3} className="lg:grid-cols-3" />
      ) : (
        <Stagger className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          <StaggerItem className="col-span-2 lg:col-span-1">
            <StatCard
              icon={Home}
              tone="primary"
              label={isManager ? t("rent.totalRent") : t("rent.myRent")}
              value={isManager ? totalRent : rows[0]?.amount ?? 0}
              format={(n) => money(n)}
            />
          </StaggerItem>
          <StaggerItem>
            <StatCard icon={Wallet} tone="success" label={t("rent.collected")} value={collected} format={(n) => money(n)} />
          </StaggerItem>
          <StaggerItem>
            <StatCard
              icon={Clock}
              tone="danger"
              label={t("rent.remaining")}
              value={rows.reduce((s, r) => s + r.due, 0)}
              format={(n) => money(n)}
            />
          </StaggerItem>
        </Stagger>
      )}

      <div className="flex items-start gap-2 rounded-lg bg-accent/50 px-3.5 py-2.5 text-sm text-accent-foreground">
        <Info className="mt-0.5 size-4 shrink-0" />
        {t("rent.neverMealRate")}
      </div>

      <Card className="gap-0 p-0 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b p-4">
          <p className="text-sm font-medium">
            {isManager ? `${t("rent.totalRent")}: ` : ""}
            {isManager && <span className="tabular font-semibold">{money(totalRent)}</span>}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" nativeButton={false} render={<Link href={`/members/${memberId}`} />}>
              <History /> {t("rent.history")}
            </Button>
            {canEdit && rows.length > 0 && (
              <Button size="sm" onClick={() => setSetAllOpen(true)}>
                {t("rent.setAll")}
              </Button>
            )}
          </div>
        </div>

        {loading ? (
          <TableSkeleton rows={5} cols={5} />
        ) : rentsQuery.isError ? (
          <ErrorState error={rentsQuery.error} onRetry={() => rentsQuery.refetch()} />
        ) : rows.length === 0 ? (
          <EmptyState icon={Home} title={t("rent.empty")} />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="pl-4">{t("common.member")}</TableHead>
                <TableHead className="text-right">{t("rent.rentAmount")}</TableHead>
                <TableHead className="text-right">{t("rent.paid")}</TableHead>
                <TableHead className="hidden text-right sm:table-cell">{t("rent.due")}</TableHead>
                <TableHead>{t("rent.status")}</TableHead>
                {canEdit && <TableHead className="w-12 pr-4" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.rent.id}>
                  <TableCell className="pl-4">
                    <span className="flex items-center gap-2 font-medium">
                      <MemberAvatar name={r.name} className="size-7" />
                      <span className="max-w-36 truncate">{r.name}</span>
                    </span>
                    {r.rent.note && <span className="mt-0.5 block text-xs text-muted-foreground">{r.rent.note}</span>}
                  </TableCell>
                  <TableCell className="tabular text-right font-semibold">{money(r.amount)}</TableCell>
                  <TableCell className="tabular text-right text-success">{money(r.paid)}</TableCell>
                  <TableCell className="tabular hidden text-right text-destructive sm:table-cell">{r.due > 0 ? money(r.due) : "—"}</TableCell>
                  <TableCell><StatusBadge status={r.status} /></TableCell>
                  {canEdit && (
                    <TableCell className="pr-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button variant="ghost" size="icon-sm" aria-label={t("common.actions")}>
                              <MoreHorizontal />
                            </Button>
                          }
                        />
                        <DropdownMenuContent align="end" className="w-52">
                          <DropdownMenuItem onClick={() => setEditing(r.rent)}>
                            <Pencil /> {t("rent.editRent")}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setPayFor({ memberId: r.rent.member_id, amount: r.due })}>
                            <Wallet /> {t("rent.recordPayment")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
            {rows.length > 1 && (
              <TableFooter>
                <TableRow>
                  <TableCell className="pl-4 font-semibold">{t("common.total")}</TableCell>
                  <TableCell className="tabular text-right font-semibold">{money(rows.reduce((s, r) => s + r.amount, 0))}</TableCell>
                  <TableCell className="tabular text-right font-semibold text-success">{money(rows.reduce((s, r) => s + r.paid, 0))}</TableCell>
                  <TableCell className="tabular hidden text-right font-semibold text-destructive sm:table-cell">
                    {money(rows.reduce((s, r) => s + r.due, 0))}
                  </TableCell>
                  <TableCell colSpan={canEdit ? 2 : 1} />
                </TableRow>
              </TableFooter>
            )}
          </Table>
        )}
      </Card>

      {canEdit && (
        <>
          <EditRentDialog cycle={cycle} rent={editing} onClose={() => setEditing(null)} name={editing ? nameOf(editing.member_id) : ""} />
          <SetAllRentDialog cycle={cycle} open={setAllOpen} onOpenChange={setSetAllOpen} count={rows.length} />
          <PaymentFormDialog
            cycle={cycle}
            members={members}
            open={!!payFor}
            onOpenChange={(o) => !o && setPayFor(null)}
            preset={payFor ? { memberId: payFor.memberId, purpose: "rent", amount: payFor.amount || undefined } : undefined}
          />
        </>
      )}
    </div>
  )
}

type RentValues = z.input<typeof rentSchema>

function EditRentDialog({ cycle, rent, name, onClose }: { cycle: MonthlyCycle; rent: HouseRent | null; name: string; onClose: () => void }) {
  const { t } = useI18n()
  const confirmSave = useConfirmSave()
  const invalidate = useInvalidateCycle()
  const form = useForm<RentValues>({ resolver: zodResolver(rentSchema), defaultValues: { amount: "", note: "" } })
  const { errors, isSubmitting } = form.formState

  useEffect(() => {
    if (rent) form.reset({ amount: String(toNumber(rent.amount)), note: rent.note ?? "" })
  }, [rent, form])

  const onSubmit = (raw: RentValues) => confirmSave(() => persist(raw))

  const persist = async (raw: RentValues) => {
    const error = errOf(await updateRent(rent!.id, raw))
    if (error) return void toast.error(t(errorKey(error)))
    toast.success(t("rent.updated"))
    await invalidate(cycle.id, [qk.rents])
    onClose()
  }

  return (
    <Dialog open={!!rent} onOpenChange={(o) => !o && !isSubmitting && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("rent.editRent")}</DialogTitle>
          <DialogDescription>{name}</DialogDescription>
        </DialogHeader>
        <form id="rent-form" onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4" noValidate>
          <Field label={t("rent.rentAmount")} htmlFor="r-amount" error={errors.amount?.message}>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground">৳</span>
              <Input id="r-amount" type="number" inputMode="decimal" step="any" min={0} className="tabular pl-7" aria-invalid={!!errors.amount} {...form.register("amount")} />
            </div>
          </Field>
          <Field label={t("common.note")} htmlFor="r-note" optional error={errors.note?.message}>
            <Textarea id="r-note" rows={2} {...form.register("note")} />
          </Field>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>{t("common.cancel")}</Button>
          <Button type="submit" form="rent-form" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="animate-spin" />}
            {t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function SetAllRentDialog({
  cycle,
  open,
  onOpenChange,
  count,
}: {
  cycle: MonthlyCycle
  open: boolean
  onOpenChange: (o: boolean) => void
  count: number
}) {
  const { t, money } = useI18n()
  const confirmSave = useConfirmSave()
  const invalidate = useInvalidateCycle()
  const [amount, setAmount] = useState("")
  const [pending, setPending] = useState(false)
  const value = Number(amount)
  const valid = amount !== "" && Number.isFinite(value) && value >= 0

  const apply = () => {
    if (!valid) return
    confirmSave(persist, {
      title: t("confirm.setAllRentTitle", { amount: money(value) }),
      description: t("rent.setAllDesc"),
      confirmLabel: t("rent.setAll"),
    })
  }

  const persist = async () => {
    setPending(true)
    const error = errOf(await setAllRent(cycle.id, value))
    setPending(false)
    if (error) return void toast.error(t(errorKey(error)))
    toast.success(t("rent.updated"))
    await invalidate(cycle.id, [qk.rents])
    setAmount("")
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !pending && onOpenChange(o)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("rent.setAllTitle")}</DialogTitle>
          <DialogDescription>{t("rent.setAllDesc")}</DialogDescription>
        </DialogHeader>
        <Field label={t("rent.rentAmount")} htmlFor="r-all" error={amount !== "" && !valid ? "validation.amountNonNegative" : undefined}>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground">৳</span>
            <Input id="r-all" type="number" inputMode="decimal" step="any" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} className="tabular pl-7" />
          </div>
        </Field>
        {valid && (
          <p className="text-sm text-muted-foreground">
            {t("rent.totalRent")}: <span className="tabular font-semibold text-foreground">{money(value * count)}</span>
          </p>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>{t("common.cancel")}</Button>
          <Button onClick={apply} disabled={!valid || pending}>
            {pending && <Loader2 className="animate-spin" />}
            {t("rent.apply")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
