"use client"

import { useQueryClient } from "@tanstack/react-query"
import {
  CalendarMinus,
  CalendarPlus,
  Eye,
  Link2,
  MoreHorizontal,
  Pencil,
  ShieldCheck,
  ShieldOff,
  UserCheck,
  UserPlus,
  Users,
  UserX,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useMemo, useState } from "react"
import { toast } from "sonner"
import { ConfirmDialog } from "@/components/common/confirm-dialog"
import { EmptyState } from "@/components/common/empty-state"
import { ErrorState } from "@/components/common/error-state"
import { MemberAvatar } from "@/components/common/member-avatar"
import { FadeIn } from "@/components/common/motion"
import { PageHeader } from "@/components/common/page-header"
import { TableSkeleton } from "@/components/common/skeletons"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useI18n } from "@/components/providers/i18n-provider"
import { useMess } from "@/features/mess/mess-provider"
import { errorKey } from "@/lib/errors"
import { qk } from "@/lib/query-keys"
import { addMemberToMonth, removeMemberFromMonth, setMemberStatus } from "@/actions/members"
import { setUserRole } from "@/actions/users"
import { errOf } from "@/lib/api"
import type { MessMember, MonthlyMember } from "@/lib/types"
import { cn } from "@/lib/utils"
import { MemberFormDialog } from "./member-form-dialog"
import { useMembers, useMonthlyMembers } from "./queries"

type PendingAction =
  | { kind: "remove"; member: MessMember }
  | { kind: "status"; member: MessMember }
  | null

export function MembersPage() {
  const { t, monthName, date } = useI18n()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { isManager, cycle, mess, refreshMess, memberId } = useMess()
  const membersQuery = useMembers()
  const monthQuery = useMonthlyMembers(cycle?.id)

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<MessMember | null>(null)
  const [action, setAction] = useState<PendingAction>(null)
  const [busy, setBusy] = useState(false)

  const monthStatus = useMemo(() => {
    const map = new Map<string, MonthlyMember["status"]>()
    for (const mm of monthQuery.data ?? []) map.set(mm.member_id, mm.status)
    return map
  }, [monthQuery.data])

  if (!isManager) {
    return <EmptyState icon={ShieldOff} title={t("errors.permission")} />
  }

  const members = membersQuery.data ?? []
  const month = cycle ? monthName(cycle.year, cycle.month) : ""
  const monthOpen = cycle?.status === "open"

  const afterMonthChange = async () => {
    if (!cycle) return
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: qk.monthlyMembers(cycle.id) }),
      queryClient.invalidateQueries({ queryKey: qk.rents(cycle.id) }),
      queryClient.invalidateQueries({ queryKey: qk.summary(cycle.id) }),
    ])
  }

  const run = async (fn: () => Promise<{ ok: true; data: unknown } | { ok: false; error: string }>, success: string) => {
    setBusy(true)
    const error = errOf(await fn())
    setBusy(false)
    if (error) {
      toast.error(t(errorKey(error)))
      return false
    }
    toast.success(success)
    return true
  }

  const addToMonth = async (m: MessMember) => {
    if (!cycle) return
    const ok = await run(
      () => addMemberToMonth(cycle.id, m.id),
      t("members.addedToMonth", { name: m.full_name, month })
    )
    if (ok) await Promise.all([afterMonthChange(), refreshMess()])
  }

  const confirmAction = async () => {
    if (!action) return
    const m = action.member
    if (action.kind === "remove" && cycle) {
      const ok = await run(
        () => removeMemberFromMonth(cycle.id, m.id),
        t("members.removedFromMonthToast", { name: m.full_name, month })
      )
      if (ok) await afterMonthChange()
    } else if (action.kind === "status") {
      const deactivate = m.status === "active"
      const ok = await run(
        () => setMemberStatus(m.id, deactivate ? "inactive" : "active"),
        t("members.statusChanged")
      )
      if (ok) await refreshMess()
    }
    setAction(null)
  }

  const toggleRole = async (m: MessMember) => {
    if (!m.user_id) return
    const userId = m.user_id
    const ok = await run(
      () => setUserRole(userId, m.role === "manager" ? "member" : "manager"),
      t("members.roleChanged")
    )
    if (ok) await refreshMess()
  }

  const openAdd = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const monthBadge = (m: MessMember) => {
    if (!cycle) return null
    const s = monthStatus.get(m.id)
    if (s === "active")
      return <Badge className="bg-success-soft text-success">{t("members.inMonth")}</Badge>
    if (s === "removed")
      return <Badge variant="secondary">{t("members.removedFromMonth")}</Badge>
    return <Badge variant="outline" className="text-muted-foreground">{t("members.notInMonth")}</Badge>
  }

  const actionsMenu = (m: MessMember) => {
    const s = monthStatus.get(m.id)
    return (
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="icon-sm" aria-label={t("common.actions")}>
              <MoreHorizontal />
            </Button>
          }
        />
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onClick={() => router.push(`/members/${m.id}`)}>
            <Eye /> {t("common.view")}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              setEditing(m)
              setFormOpen(true)
            }}
          >
            <Pencil /> {t("common.edit")}
          </DropdownMenuItem>
          {cycle && monthOpen && (
            <>
              <DropdownMenuSeparator />
              {s === "active" ? (
                <DropdownMenuItem onClick={() => setAction({ kind: "remove", member: m })}>
                  <CalendarMinus /> {t("members.removeFromMonth")}
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={() => addToMonth(m)}>
                  <CalendarPlus /> {t("members.addToMonth")}
                </DropdownMenuItem>
              )}
            </>
          )}
          <DropdownMenuSeparator />
          {m.user_id && m.account_status === "approved" && m.id !== memberId && (
            <DropdownMenuItem onClick={() => toggleRole(m)}>
              <ShieldCheck /> {t(m.role === "manager" ? "members.makeMember" : "members.makeManager")}
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            variant={m.status === "active" ? "destructive" : "default"}
            onClick={() => setAction({ kind: "status", member: m })}
          >
            {m.status === "active" ? <UserX /> : <UserCheck />}
            {t(m.status === "active" ? "members.deactivate" : "members.activate")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  return (
    <FadeIn className="grid grid-cols-1 gap-5">
      <PageHeader
        title={t("members.title")}
        description={`${t("members.subtitle")} · ${mess.name}`}
        actions={
          <Button onClick={openAdd}>
            <UserPlus /> {t("members.add")}
          </Button>
        }
      />

      <Card className="gap-0 overflow-hidden p-0 shadow-xs">
        {membersQuery.isPending ? (
          <TableSkeleton rows={5} cols={6} />
        ) : membersQuery.isError ? (
          <ErrorState error={membersQuery.error} onRetry={() => membersQuery.refetch()} />
        ) : members.length === 0 ? (
          <EmptyState
            icon={Users}
            title={t("members.empty")}
            description={t("members.emptyHint")}
            action={
              <Button onClick={openAdd}>
                <UserPlus /> {t("members.add")}
              </Button>
            }
          />
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="pl-4">{t("members.fullName")}</TableHead>
                    <TableHead>{t("members.phone")}</TableHead>
                    <TableHead>{t("members.joiningDate")}</TableHead>
                    <TableHead>{t("members.role")}</TableHead>
                    <TableHead>{t("members.status")}</TableHead>
                    {cycle && <TableHead>{month}</TableHead>}
                    <TableHead className="w-12 pr-4" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((m) => (
                    <TableRow key={m.id} className={cn(m.status === "inactive" && "opacity-60")}>
                      <TableCell className="pl-4">
                        <button
                          type="button"
                          onClick={() => router.push(`/members/${m.id}`)}
                          className="flex items-center gap-3 text-left"
                        >
                          <MemberAvatar name={m.full_name} src={m.avatar_url} />
                          <span className="min-w-0">
                            <span className="flex items-center gap-1.5 font-medium hover:text-primary">
                              {m.full_name}
                              {m.user_id && <Link2 className="size-3 text-muted-foreground" aria-label={t("members.linked")} />}
                            </span>
                            <span className="block truncate text-xs text-muted-foreground">{m.email ?? t("members.notLinked")}</span>
                          </span>
                        </button>
                      </TableCell>
                      <TableCell className="tabular text-muted-foreground">{m.phone ?? "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{date(m.joined_at)}</TableCell>
                      <TableCell>
                        <Badge variant={m.role === "manager" ? "default" : "secondary"} className={m.role === "manager" ? "bg-accent text-accent-foreground" : undefined}>
                          {t(`roles.${m.role}`)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1.5 text-sm">
                          <span className={cn("size-1.5 rounded-full", m.status === "active" ? "bg-success" : "bg-muted-foreground")} />
                          {t(`members.${m.status}`)}
                        </span>
                      </TableCell>
                      {cycle && <TableCell>{monthBadge(m)}</TableCell>}
                      <TableCell className="pr-4 text-right">{actionsMenu(m)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile cards */}
            <ul className="divide-y md:hidden">
              {members.map((m) => (
                <li key={m.id} className={cn("flex items-center gap-3 px-4 py-3", m.status === "inactive" && "opacity-60")}>
                  <button type="button" onClick={() => router.push(`/members/${m.id}`)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                    <MemberAvatar name={m.full_name} src={m.avatar_url} className="size-9" />
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{m.full_name}</span>
                      <span className="mt-1 flex flex-wrap items-center gap-1.5">
                        {m.role === "manager" && <Badge className="bg-accent text-accent-foreground">{t("roles.manager")}</Badge>}
                        {monthBadge(m)}
                      </span>
                    </span>
                  </button>
                  {actionsMenu(m)}
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>

      <MemberFormDialog open={formOpen} onOpenChange={setFormOpen} member={editing} />

      <ConfirmDialog
        open={action?.kind === "remove"}
        onOpenChange={(o) => !o && setAction(null)}
        title={action ? t("members.removeConfirmTitle", { name: action.member.full_name, month }) : ""}
        description={t("members.removeConfirm")}
        confirmLabel={t("members.removeFromMonth")}
        destructive
        pending={busy}
        onConfirm={confirmAction}
      />
      <ConfirmDialog
        open={action?.kind === "status"}
        onOpenChange={(o) => !o && setAction(null)}
        title={
          action?.member.status === "active"
            ? t("members.deactivateConfirmTitle", { name: action.member.full_name })
            : t("members.activate")
        }
        description={action?.member.status === "active" ? t("members.deactivateConfirm") : undefined}
        destructive={action?.member.status === "active"}
        pending={busy}
        onConfirm={confirmAction}
      />
    </FadeIn>
  )
}
