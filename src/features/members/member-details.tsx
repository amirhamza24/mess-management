"use client"

import { useQueries } from "@tanstack/react-query"
import { ArrowLeft, CalendarDays, History, Mail, Pencil, Phone, ShieldOff } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { BalanceAmount } from "@/components/common/balance"
import { EmptyState } from "@/components/common/empty-state"
import { ErrorState } from "@/components/common/error-state"
import { MemberAvatar } from "@/components/common/member-avatar"
import { FadeIn } from "@/components/common/motion"
import { TableSkeleton } from "@/components/common/skeletons"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useI18n } from "@/components/providers/i18n-provider"
import { fetchCycleSummary } from "@/features/accounts/queries"
import { useMess } from "@/features/mess/mess-provider"
import { qk } from "@/lib/query-keys"
import { cn } from "@/lib/utils"
import { MemberFormDialog } from "./member-form-dialog"
import { useMembers } from "./queries"

const HISTORY_MONTHS = 12

export function MemberDetails({ id }: { id: string }) {
  const { t, money, num, date, monthName } = useI18n()
  const { isManager, memberId, cycles, cyclesLoading } = useMess()
  const membersQuery = useMembers()
  const [editOpen, setEditOpen] = useState(false)
  const allowed = isManager || id === memberId

  const recent = cycles.slice(0, HISTORY_MONTHS)
  const summaries = useQueries({
    queries: recent.map((c) => ({
      queryKey: qk.summary(c.id),
      queryFn: () => fetchCycleSummary(c.id),
      enabled: allowed,
    })),
  })

  if (!allowed) return <EmptyState icon={ShieldOff} title={t("errors.permission")} />

  const member = membersQuery.data?.find((m) => m.id === id)
  const historyLoading = cyclesLoading || summaries.some((s) => s.isPending)
  const historyError = summaries.find((s) => s.isError)?.error
  const rows = recent
    .map((c, i) => ({ cycle: c, row: summaries[i]?.data?.members.find((m) => m.member_id === id) }))
    .filter((r) => r.row)

  const totals = rows.reduce(
    (acc, { row }) => ({
      meals: acc.meals + row!.meals,
      total: acc.total + row!.total_cost,
      paid: acc.paid + row!.paid,
    }),
    { meals: 0, total: 0, paid: 0 }
  )

  return (
    <FadeIn className="grid grid-cols-1 gap-5">
      <div>
        <Button variant="ghost" size="sm" className="-ml-2 text-muted-foreground" nativeButton={false} render={<Link href={isManager ? "/members" : "/dashboard"} />}>
          <ArrowLeft /> {t("common.back")}
        </Button>
      </div>

      <Card className="p-5 shadow-xs">
        {membersQuery.isPending ? (
          <div className="flex items-center gap-4">
            <Skeleton className="size-14 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-56" />
            </div>
          </div>
        ) : !member ? (
          <p className="text-sm text-muted-foreground">{t("members.notFound")}</p>
        ) : (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <MemberAvatar name={member.full_name} src={member.avatar_url} className="size-14 text-base" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-semibold tracking-tight">{member.full_name}</h1>
                <Badge variant="secondary" className={member.role === "manager" ? "bg-accent text-accent-foreground" : undefined}>
                  {t(`roles.${member.role}`)}
                </Badge>
                <Badge variant="outline" className={cn(member.status === "active" ? "text-success" : "text-muted-foreground")}>
                  {t(`members.${member.status}`)}
                </Badge>
              </div>
              <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5"><Mail className="size-3.5" />{member.email ?? "—"}</span>
                <span className="inline-flex items-center gap-1.5"><Phone className="size-3.5" />{member.phone ?? "—"}</span>
                <span className="inline-flex items-center gap-1.5"><CalendarDays className="size-3.5" />{t("members.joiningDate")}: {date(member.joined_at)}</span>
              </div>
            </div>
            {isManager && (
              <Button variant="outline" onClick={() => setEditOpen(true)}>
                <Pencil /> {t("common.edit")}
              </Button>
            )}
          </div>
        )}
      </Card>

      <Card className="gap-0 p-0 shadow-xs">
        <CardHeader className="border-b py-4">
          <CardTitle className="flex items-center gap-2">
            <History className="size-4 text-primary" /> {t("members.history")}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {historyLoading ? (
            <TableSkeleton rows={4} cols={8} />
          ) : historyError ? (
            <ErrorState error={historyError} />
          ) : rows.length === 0 ? (
            <EmptyState icon={History} title={t("members.historyEmpty")} className="py-10" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="pl-4">{t("common.date")}</TableHead>
                  <TableHead className="text-right">{t("accounts.meals")}</TableHead>
                  <TableHead className="text-right">{t("accounts.mealCost")}</TableHead>
                  <TableHead className="text-right">{t("accounts.rent")}</TableHead>
                  <TableHead className="text-right">{t("accounts.otherShare")}</TableHead>
                  <TableHead className="text-right">{t("accounts.totalCost")}</TableHead>
                  <TableHead className="text-right">{t("accounts.paid")}</TableHead>
                  <TableHead className="pr-4 text-right">{t("accounts.balance")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(({ cycle, row }) => (
                  <TableRow key={cycle.id}>
                    <TableCell className="pl-4 font-medium">
                      {monthName(cycle.year, cycle.month)}
                      {cycle.status === "closed" && (
                        <span className="ml-2 text-xs font-normal text-muted-foreground">{t("month.closed")}</span>
                      )}
                    </TableCell>
                    <TableCell className="tabular text-right">{num(row!.meals, 1)}</TableCell>
                    <TableCell className="tabular text-right">{money(row!.meal_cost)}</TableCell>
                    <TableCell className="tabular text-right">{money(row!.rent)}</TableCell>
                    <TableCell className="tabular text-right">{money(row!.other_share)}</TableCell>
                    <TableCell className="tabular text-right font-medium">{money(row!.total_cost)}</TableCell>
                    <TableCell className="tabular text-right">{money(row!.paid)}</TableCell>
                    <TableCell className="pr-4 text-right"><BalanceAmount balance={row!.balance} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell className="pl-4 font-semibold">{t("accounts.totals")}</TableCell>
                  <TableCell className="tabular text-right font-semibold">{num(totals.meals, 1)}</TableCell>
                  <TableCell colSpan={3} />
                  <TableCell className="tabular text-right font-semibold">{money(totals.total)}</TableCell>
                  <TableCell className="tabular text-right font-semibold">{money(totals.paid)}</TableCell>
                  <TableCell className="pr-4 text-right"><BalanceAmount balance={totals.total - totals.paid} /></TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          )}
        </CardContent>
      </Card>

      {isManager && member && <MemberFormDialog open={editOpen} onOpenChange={setEditOpen} member={member} />}
    </FadeIn>
  )
}
