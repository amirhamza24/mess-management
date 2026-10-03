"use client"

import { Calculator, Hash, Info, MoreHorizontal, Pencil, Plus, Trash2, Users, Wallet } from "lucide-react"
import { useMemo, useState } from "react"
import { toast } from "sonner"
import { ConfirmDialog } from "@/components/common/confirm-dialog"
import { EmptyState } from "@/components/common/empty-state"
import { ErrorState } from "@/components/common/error-state"
import { FadeIn, Stagger, StaggerItem } from "@/components/common/motion"
import { PageHeader } from "@/components/common/page-header"
import { SimpleSelect } from "@/components/common/simple-select"
import { StatCard, StatGridSkeleton } from "@/components/common/stat-card"
import { CardListSkeleton } from "@/components/common/skeletons"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useI18n } from "@/components/providers/i18n-provider"
import { useCycleSummary, useInvalidateCycle } from "@/features/accounts/queries"
import { ClosedMonthBanner, MonthGate } from "@/features/cycles/month-gate"
import { useCycleMembers } from "@/features/members/queries"
import { useMemberNames, useMess } from "@/features/mess/mess-provider"
import type { TKey } from "@/i18n"
import { errorKey } from "@/lib/errors"
import { toNumber } from "@/lib/format"
import { deleteExpense } from "@/actions/records"
import { errOf } from "@/lib/api"
import type { MonthlyCycle } from "@/lib/types"
import { EXPENSE_KINDS, type ExpenseKind } from "./config"
import { ExpenseFormDialog } from "./expense-form-dialog"
import { useExpenses, type ExpenseRow } from "./queries"

export function ExpenseModule({ kind }: { kind: ExpenseKind }) {
  const { t } = useI18n()
  const cfg = EXPENSE_KINDS[kind]
  return (
    <FadeIn className="grid grid-cols-1 gap-5">
      <PageHeader title={t(`${cfg.ns}.title` as TKey)} description={t(`${cfg.ns}.subtitle` as TKey)} />
      <ClosedMonthBanner />
      <MonthGate
        fallback={
          <div className="grid grid-cols-1 gap-4">
            <StatGridSkeleton count={3} className="lg:grid-cols-3" />
            <Card className="p-4 shadow-xs">
              <CardListSkeleton count={4} />
            </Card>
          </div>
        }
      >
        {(cycle) => <ExpenseContent key={cycle.id} kind={kind} cycle={cycle} />}
      </MonthGate>
    </FadeIn>
  )
}

function ExpenseContent({ kind, cycle }: { kind: ExpenseKind; cycle: MonthlyCycle }) {
  const { t, money, num, date: fmtDate, weekday } = useI18n()
  const cfg = EXPENSE_KINDS[kind]
  const { canEdit, isManager } = useMess()
  const nameOf = useMemberNames()
  const invalidate = useInvalidateCycle()
  const query = useExpenses(kind, cycle.id)
  const summary = useCycleSummary(cycle.id)
  const { members } = useCycleMembers(cycle.id)

  const [category, setCategory] = useState("")
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<ExpenseRow | null>(null)
  const [deleting, setDeleting] = useState<ExpenseRow | null>(null)
  const [busy, setBusy] = useState(false)

  const rows = useMemo(() => query.data ?? [], [query.data])
  const filtered = category ? rows.filter((r) => r.category === category) : rows
  const total = rows.reduce((s, r) => s + toNumber(r.amount), 0)

  // Group by date (newest first) with daily totals.
  const groups = useMemo(() => {
    const map = new Map<string, ExpenseRow[]>()
    for (const r of filtered) map.set(r.date, [...(map.get(r.date) ?? []), r])
    return [...map.entries()].map(([d, items]) => ({
      date: d,
      items,
      total: items.reduce((s, r) => s + toNumber(r.amount), 0),
    }))
  }, [filtered])

  const byCategory = useMemo(() => {
    const map = new Map<string, number>()
    for (const r of rows) map.set(r.category, (map.get(r.category) ?? 0) + toNumber(r.amount))
    return [...map.entries()].sort((a, b) => b[1] - a[1])
  }, [rows])

  const openAdd = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const remove = async () => {
    if (!deleting) return
    setBusy(true)
    const error = errOf(await deleteExpense(kind, deleting.id))
    setBusy(false)
    if (error) {
      toast.error(t(errorKey(error)))
      return
    }
    toast.success(t(`${cfg.ns}.deleted` as TKey))
    setDeleting(null)
    await invalidate(cycle.id, [cfg.queryKey])
  }

  const catLabel = (c: string) => t(`${cfg.categoryPrefix}.${c}` as TKey)
  const s = summary.data

  return (
    <div className="grid grid-cols-1 gap-5">
      {query.isPending ? (
        <StatGridSkeleton count={3} className="lg:grid-cols-3" />
      ) : (
        <Stagger className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          <StaggerItem className="col-span-2 lg:col-span-1">
            <StatCard icon={Wallet} tone="primary" label={t(cfg.totalLabel)} value={total} format={(n) => money(n)} />
          </StaggerItem>
          <StaggerItem>
            <StatCard icon={Hash} label={t("bazar.entries")} value={rows.length} format={(n) => num(Math.round(n))} />
          </StaggerItem>
          <StaggerItem>
            {kind === "food" ? (
              <StatCard
                icon={Calculator}
                tone="success"
                label={t("bazar.mealRate")}
                value={s?.meal_rate ?? 0}
                format={(n) => money(n, { fixed: true })}
              />
            ) : (
              <StatCard
                icon={Users}
                tone="warning"
                label={t("expenses.perMember")}
                value={s?.other_share ?? 0}
                format={(n) => money(n)}
              />
            )}
          </StaggerItem>
        </Stagger>
      )}

      <div className="flex items-start gap-2 rounded-lg bg-accent/50 px-3.5 py-2.5 text-sm text-accent-foreground">
        <Info className="mt-0.5 size-4 shrink-0" />
        {t(cfg.ruleLabel)}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_18rem]">
        <Card className="gap-0 p-0 shadow-xs">
          <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
            <SimpleSelect
              value={category}
              onChange={setCategory}
              options={[{ value: "", label: t("common.all") }, ...cfg.categories.map((c) => ({ value: c, label: catLabel(c) }))]}
              className="sm:w-52"
            />
            {canEdit && (
              <Button onClick={openAdd}>
                <Plus /> {t(`${cfg.ns}.add` as TKey)}
              </Button>
            )}
          </div>

          {query.isPending ? (
            <div className="p-4">
              <CardListSkeleton count={4} />
            </div>
          ) : query.isError ? (
            <ErrorState error={query.error} onRetry={() => query.refetch()} />
          ) : groups.length === 0 ? (
            <EmptyState
              icon={cfg.icon}
              title={t(`${cfg.ns}.empty` as TKey)}
              description={isManager ? t(`${cfg.ns}.emptyManager` as TKey) : undefined}
              action={
                canEdit && (
                  <Button onClick={openAdd}>
                    <Plus /> {t(`${cfg.ns}.add` as TKey)}
                  </Button>
                )
              }
            />
          ) : (
            <div className="divide-y">
              {groups.map((g) => (
                <section key={g.date}>
                  <header className="flex items-center justify-between bg-muted/40 px-4 py-2 text-xs">
                    <span className="font-medium">
                      {fmtDate(g.date, "long")} <span className="text-muted-foreground">· {weekday(g.date)}</span>
                    </span>
                    <span className="tabular font-semibold">
                      {t("bazar.dailyTotal")}: {money(g.total)}
                    </span>
                  </header>
                  <ul className="divide-y">
                    {g.items.map((r) => (
                      <li key={r.id} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/30">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                          <cfg.icon className="size-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {catLabel(r.category)}
                            {r.description && <span className="font-normal text-muted-foreground"> — {r.description}</span>}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {r.paid_by ? `${t(cfg.paidByLabel)}: ${nameOf(r.paid_by)}` : ""}
                            {r.note ? `${r.paid_by ? " · " : ""}${r.note}` : ""}
                          </p>
                        </div>
                        <span className="tabular text-sm font-semibold">{money(r.amount)}</span>
                        {canEdit && (
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
                                  setEditing(r)
                                  setFormOpen(true)
                                }}
                              >
                                <Pencil /> {t("common.edit")}
                              </DropdownMenuItem>
                              <DropdownMenuItem variant="destructive" onClick={() => setDeleting(r)}>
                                <Trash2 /> {t("common.delete")}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </Card>

        <Card className="h-fit gap-3 shadow-xs">
          <CardHeader>
            <CardTitle className="text-sm">{t("bazar.byCategory")}</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3">
            {byCategory.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("empty.noData")}</p>
            ) : (
              byCategory.map(([c, amount]) => (
                <div key={c} className="grid gap-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span>{catLabel(c)}</span>
                    <span className="tabular font-medium">{money(amount)}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary/80" style={{ width: `${total ? (amount / total) * 100 : 0}%` }} />
                  </div>
                </div>
              ))
            )}
            {byCategory.length > 0 && (
              <div className="mt-1 flex items-center justify-between border-t pt-3 text-sm font-semibold">
                <span>{t("common.total")}</span>
                <span className="tabular">{money(total)}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {canEdit && (
        <ExpenseFormDialog
          kind={kind}
          cycle={cycle}
          members={members.filter((m) => m.status === "active")}
          open={formOpen}
          onOpenChange={setFormOpen}
          expense={editing}
        />
      )}
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={t(`${cfg.ns}.deleteConfirmTitle` as TKey)}
        description={t(`${cfg.ns}.deleteConfirm` as TKey)}
        confirmLabel={t("common.delete")}
        destructive
        pending={busy}
        onConfirm={remove}
      />
    </div>
  )
}
