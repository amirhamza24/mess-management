"use client"

import { ChevronLeft, ChevronRight, Hash, MoreHorizontal, Pencil, Plus, Trash2, Wallet } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { ConfirmDialog } from "@/components/common/confirm-dialog"
import { EmptyState } from "@/components/common/empty-state"
import { ErrorState } from "@/components/common/error-state"
import { MemberAvatar } from "@/components/common/member-avatar"
import { FadeIn, Stagger, StaggerItem } from "@/components/common/motion"
import { PageHeader } from "@/components/common/page-header"
import { SimpleSelect } from "@/components/common/simple-select"
import { TableSkeleton } from "@/components/common/skeletons"
import { StatCard, StatGridSkeleton } from "@/components/common/stat-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useI18n } from "@/components/providers/i18n-provider"
import { useCycleSummary, useInvalidateCycle } from "@/features/accounts/queries"
import { ClosedMonthBanner, MonthGate } from "@/features/cycles/month-gate"
import { useCycleMembers } from "@/features/members/queries"
import { useMemberNames, useMess } from "@/features/mess/mess-provider"
import { errorKey } from "@/lib/errors"
import { qk } from "@/lib/query-keys"
import { deletePayment } from "@/actions/records"
import { errOf } from "@/lib/api"
import type { MonthlyCycle, Payment } from "@/lib/types"
import { PaymentFormDialog } from "./payment-form-dialog"
import { usePayments } from "./queries"

export function PaymentsPage() {
  const { t } = useI18n()
  const { isManager } = useMess()
  return (
    <FadeIn className="grid grid-cols-1 gap-5">
      <PageHeader
        title={t(isManager ? "payments.title" : "payments.myTitle")}
        description={t("payments.subtitle")}
      />
      <ClosedMonthBanner />
      <MonthGate
        fallback={
          <div className="grid grid-cols-1 gap-4">
            <StatGridSkeleton count={2} className="lg:grid-cols-2" />
            <Card className="p-0 shadow-xs">
              <TableSkeleton rows={6} cols={5} />
            </Card>
          </div>
        }
      >
        {(cycle) => <PaymentsContent key={cycle.id} cycle={cycle} />}
      </MonthGate>
    </FadeIn>
  )
}

function PaymentsContent({ cycle }: { cycle: MonthlyCycle }) {
  const { t, money, num, date } = useI18n()
  const { isManager, canEdit, memberId } = useMess()
  const nameOf = useMemberNames()
  const invalidate = useInvalidateCycle()
  const summary = useCycleSummary(cycle.id)
  const { members } = useCycleMembers(cycle.id)

  const [page, setPage] = useState(0)
  const [memberFilter, setMemberFilter] = useState("")
  const query = usePayments(cycle.id, { page, memberId: memberFilter || undefined })

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Payment | null>(null)
  const [deleting, setDeleting] = useState<Payment | null>(null)
  const [busy, setBusy] = useState(false)

  const rows = query.data?.rows ?? []
  const count = query.data?.count ?? 0
  const pages = Math.max(1, Math.ceil(count / (query.data?.pageSize ?? 20)))
  const myRow = summary.data?.members.find((m) => m.member_id === memberId)
  const received = isManager ? summary.data?.total_paid ?? 0 : myRow?.paid ?? 0

  const openAdd = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const remove = async () => {
    if (!deleting) return
    setBusy(true)
    const error = errOf(await deletePayment(deleting.id))
    setBusy(false)
    if (error) return void toast.error(t(errorKey(error)))
    toast.success(t("payments.deleted"))
    setDeleting(null)
    await invalidate(cycle.id, [qk.payments, qk.rents])
  }

  const actions = (p: Payment) =>
    canEdit && (
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="icon-sm" aria-label={t("common.actions")}>
              <MoreHorizontal />
            </Button>
          }
        />
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={() => {
              setEditing(p)
              setFormOpen(true)
            }}
          >
            <Pencil /> {t("common.edit")}
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onClick={() => setDeleting(p)}>
            <Trash2 /> {t("common.delete")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )

  const purposeBadge = (p: Payment) => (
    <Badge variant="secondary" className={p.purpose === "rent" ? "bg-warning-soft text-warning" : undefined}>
      {t(p.purpose === "rent" ? "payments.purposeRent" : "payments.purposeMess")}
    </Badge>
  )

  return (
    <div className="grid grid-cols-1 gap-5">
      {summary.isPending ? (
        <StatGridSkeleton count={2} className="lg:grid-cols-2" />
      ) : (
        <Stagger className="grid grid-cols-2 gap-3">
          <StaggerItem>
            <StatCard icon={Wallet} tone="success" label={t("payments.totalReceived")} value={received} format={(n) => money(n)} />
          </StaggerItem>
          <StaggerItem>
            <StatCard icon={Hash} label={t("bazar.entries")} value={count} format={(n) => num(Math.round(n))} />
          </StaggerItem>
        </Stagger>
      )}

      <Card className="gap-0 p-0 shadow-xs">
        {(isManager || canEdit) && (
          <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
            {isManager ? (
              <SimpleSelect
                value={memberFilter}
                onChange={(v) => {
                  setMemberFilter(v)
                  setPage(0)
                }}
                options={[{ value: "", label: t("common.all") }, ...members.map((m) => ({ value: m.id, label: m.full_name }))]}
                className="sm:w-56"
              />
            ) : (
              <span />
            )}
            {canEdit && (
              <Button onClick={openAdd}>
                <Plus /> {t("payments.add")}
              </Button>
            )}
          </div>
        )}

        {query.isPending ? (
          <TableSkeleton rows={6} cols={5} />
        ) : query.isError ? (
          <ErrorState error={query.error} onRetry={() => query.refetch()} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={Wallet}
            title={t("payments.empty")}
            description={isManager ? t("payments.emptyManager") : undefined}
            action={
              canEdit && (
                <Button onClick={openAdd}>
                  <Plus /> {t("payments.add")}
                </Button>
              )
            }
          />
        ) : (
          <>
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="pl-4">{t("common.date")}</TableHead>
                    <TableHead>{t("common.member")}</TableHead>
                    <TableHead>{t("payments.method")}</TableHead>
                    <TableHead>{t("payments.purpose")}</TableHead>
                    <TableHead>{t("common.note")}</TableHead>
                    <TableHead className="text-right">{t("common.amount")}</TableHead>
                    {canEdit && <TableHead className="w-12 pr-4" />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="pl-4 text-muted-foreground">{date(p.date)}</TableCell>
                      <TableCell>
                        <span className="flex items-center gap-2 font-medium">
                          <MemberAvatar name={nameOf(p.member_id)} className="size-6 text-[0.6rem]" />
                          {nameOf(p.member_id)}
                        </span>
                      </TableCell>
                      <TableCell>{t(`paymentMethods.${p.payment_method}`)}</TableCell>
                      <TableCell>{purposeBadge(p)}</TableCell>
                      <TableCell className="max-w-48 truncate text-muted-foreground">{p.note ?? "—"}</TableCell>
                      <TableCell className="tabular text-right font-semibold text-success">{money(p.amount)}</TableCell>
                      {canEdit && <TableCell className="pr-4 text-right">{actions(p)}</TableCell>}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <ul className="divide-y md:hidden">
              {rows.map((p) => (
                <li key={p.id} className="flex items-center gap-3 px-4 py-3">
                  <MemberAvatar name={nameOf(p.member_id)} className="size-9" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{nameOf(p.member_id)}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {date(p.date)} · {t(`paymentMethods.${p.payment_method}`)}
                    </p>
                    <div className="mt-1">{purposeBadge(p)}</div>
                  </div>
                  <span className="tabular text-sm font-semibold text-success">{money(p.amount)}</span>
                  {actions(p)}
                </li>
              ))}
            </ul>
            {pages > 1 && (
              <div className="flex items-center justify-between border-t px-4 py-3 text-sm">
                <span className="text-muted-foreground">{t("common.page", { page: num(page + 1), pages: num(pages) })}</span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page === 0 || query.isFetching} onClick={() => setPage((p) => p - 1)}>
                    <ChevronLeft /> {t("common.previous")}
                  </Button>
                  <Button variant="outline" size="sm" disabled={page + 1 >= pages || query.isFetching} onClick={() => setPage((p) => p + 1)}>
                    {t("common.next")} <ChevronRight />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      {canEdit && (
        <PaymentFormDialog
          cycle={cycle}
          members={members}
          open={formOpen}
          onOpenChange={setFormOpen}
          payment={editing}
        />
      )}
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={t("payments.deleteConfirmTitle")}
        description={t("payments.deleteConfirm")}
        confirmLabel={t("common.delete")}
        destructive
        pending={busy}
        onConfirm={remove}
      />
    </div>
  )
}
