"use client"

import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
  Check,
  KeyRound,
  Loader2,
  MoreHorizontal,
  RotateCcw,
  ShieldCheck,
  ShieldOff,
  Trash2,
  UserCheck,
  UserMinus,
  X,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useMemo, useState } from "react"
import { toast } from "sonner"
import { approveUser, deleteRegistration, resetUserPassword, setUserBlocked, setUserRole } from "@/actions/users"
import { ConfirmDialog } from "@/components/common/confirm-dialog"
import { EmptyState } from "@/components/common/empty-state"
import { ErrorState } from "@/components/common/error-state"
import { Field } from "@/components/common/field"
import { MemberAvatar } from "@/components/common/member-avatar"
import { FadeIn } from "@/components/common/motion"
import { PageHeader } from "@/components/common/page-header"
import { PasswordInput } from "@/components/common/password-input"
import { CardListSkeleton } from "@/components/common/skeletons"
import { Badge } from "@/components/ui/badge"
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useI18n } from "@/components/providers/i18n-provider"
import { useMess } from "@/features/mess/mess-provider"
import { errOf, query } from "@/lib/api"
import { errorKey } from "@/lib/errors"
import { qk } from "@/lib/query-keys"
import type { AppUser, UserStatus } from "@/lib/types"
import { cn } from "@/lib/utils"

type Filter = "pending" | "approved" | "blocked" | "all"
type Pending = { kind: "reject" | "suspend" | "delete"; user: AppUser } | null

const STATUS_STYLE: Record<UserStatus, string> = {
  pending: "bg-warning-soft text-warning",
  approved: "bg-success-soft text-success",
  rejected: "bg-danger-soft text-destructive",
  suspended: "bg-muted text-muted-foreground",
}

export function UsersPage() {
  const { t, date } = useI18n()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { isManager, me } = useMess()
  const usersQuery = useQuery({ queryKey: qk.users, queryFn: () => query("users"), enabled: isManager })
  const users = useMemo(() => usersQuery.data ?? [], [usersQuery.data])

  const pendingCount = users.filter((u) => u.status === "pending").length
  const [filter, setFilter] = useState<Filter | null>(null)
  // Default to the pending list when someone is waiting.
  const active: Filter = filter ?? (pendingCount > 0 ? "pending" : "approved")

  const [confirm, setConfirm] = useState<Pending>(null)
  const [resetFor, setResetFor] = useState<AppUser | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  if (!isManager) return <EmptyState icon={ShieldOff} title={t("errors.permission")} />

  const counts: Record<Filter, number> = {
    pending: pendingCount,
    approved: users.filter((u) => u.status === "approved").length,
    blocked: users.filter((u) => u.status === "rejected" || u.status === "suspended").length,
    all: users.length,
  }
  const visible = users.filter((u) =>
    active === "all" ? true : active === "blocked" ? u.status === "rejected" || u.status === "suspended" : u.status === active
  )

  const refresh = async (affectsSelf = false) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: qk.users }),
      queryClient.invalidateQueries({ queryKey: qk.members }),
      queryClient.invalidateQueries({ queryKey: qk.roster }),
    ])
    if (affectsSelf) {
      await queryClient.invalidateQueries({ queryKey: qk.me })
      router.refresh()
    }
  }

  const act = async (
    user: AppUser,
    fn: () => Promise<{ ok: true; data: unknown } | { ok: false; error: string }>,
    success: string
  ) => {
    setBusyId(user.id)
    const error = errOf(await fn())
    setBusyId(null)
    if (error) {
      toast.error(t(errorKey(error)))
      return false
    }
    toast.success(success)
    await refresh(user.id === me.user.id)
    return true
  }

  const roleName = (role: AppUser["role"]) => t(`roles.${role}`)

  const runConfirm = async () => {
    if (!confirm) return
    const { kind, user } = confirm
    if (kind === "delete") await act(user, () => deleteRegistration(user.id), t("users.deletedToast"))
    else
      await act(
        user,
        () => setUserBlocked(user.id, kind === "reject" ? "rejected" : "suspended"),
        t(kind === "reject" ? "users.rejectedToast" : "users.suspendedToast", { name: user.name })
      )
    setConfirm(null)
  }

  const filters: { value: Filter; label: string }[] = [
    { value: "pending", label: t("users.pending") },
    { value: "approved", label: t("users.approved") },
    { value: "blocked", label: `${t("users.suspended")} / ${t("users.rejected")}` },
    { value: "all", label: t("users.all") },
  ]

  return (
    <FadeIn className="grid grid-cols-1 gap-5">
      <PageHeader title={t("users.title")} description={t("users.subtitle")} />

      <div role="tablist" className="flex w-full flex-wrap gap-1 rounded-lg bg-muted p-1 sm:w-fit">
        {filters.map((f) => (
          <button
            key={f.value}
            type="button"
            role="tab"
            aria-selected={active === f.value}
            onClick={() => setFilter(f.value)}
            className={cn(
              "inline-flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors sm:flex-none",
              active === f.value ? "bg-card text-foreground shadow-xs ring-1 ring-border" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {f.label}
            <span
              className={cn(
                "rounded-full px-1.5 text-[0.7rem] leading-5",
                f.value === "pending" && counts.pending > 0 ? "bg-primary text-primary-foreground" : "bg-background/70"
              )}
            >
              {counts[f.value]}
            </span>
          </button>
        ))}
      </div>

      <Card className="gap-0 p-0 shadow-xs">
        {usersQuery.isPending ? (
          <div className="p-4">
            <CardListSkeleton count={4} />
          </div>
        ) : usersQuery.isError ? (
          <ErrorState error={usersQuery.error} onRetry={() => usersQuery.refetch()} />
        ) : visible.length === 0 ? (
          <EmptyState icon={UserCheck} title={t("users.empty")} />
        ) : (
          <ul className="divide-y">
            {visible.map((u) => {
              const self = u.id === me.user.id
              const busy = busyId === u.id
              return (
                <li key={u.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <MemberAvatar name={u.name} className="size-10" />
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-2 font-medium">
                        <span className="truncate">{u.name}</span>
                        {self && <span className="text-xs font-normal text-primary">({t("users.you")})</span>}
                        <span className={cn("rounded-full px-2 py-0.5 text-[0.7rem] font-medium", STATUS_STYLE[u.status])}>
                          {t(`users.${u.status}`)}
                        </span>
                        {u.status === "approved" && (
                          <Badge variant="secondary" className={u.role === "manager" ? "bg-accent text-accent-foreground" : undefined}>
                            {roleName(u.role)}
                          </Badge>
                        )}
                      </p>
                      <p className="truncate text-sm text-muted-foreground">
                        {u.email}
                        {u.phone ? ` · ${u.phone}` : ""}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t("users.requested", { date: date(u.created_at.slice(0, 10)) })}
                        {u.approved_by && u.status === "approved" ? ` · ${t("users.approvedBy", { name: u.approved_by })}` : ""}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2">
                    {busy && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
                    {(u.status === "pending" || u.status === "rejected") && (
                      <Button
                        size="sm"
                        disabled={busy}
                        onClick={() => act(u, () => approveUser(u.id), t("users.approvedToast", { name: u.name }))}
                      >
                        <Check /> {t("users.approve")}
                      </Button>
                    )}
                    {u.status === "pending" && (
                      <Button size="sm" variant="outline" disabled={busy} onClick={() => setConfirm({ kind: "reject", user: u })}>
                        <X /> {t("users.reject")}
                      </Button>
                    )}
                    {u.status === "suspended" && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() => act(u, () => approveUser(u.id), t("users.approvedToast", { name: u.name }))}
                      >
                        <RotateCcw /> {t("users.reactivate")}
                      </Button>
                    )}

                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button variant="ghost" size="icon-sm" disabled={busy} aria-label={t("common.actions")}>
                            <MoreHorizontal />
                          </Button>
                        }
                      />
                      <DropdownMenuContent align="end" className="w-52">
                        {u.status === "approved" && (
                          <DropdownMenuItem
                            onClick={() => {
                              const role = u.role === "manager" ? "member" : "manager"
                              act(u, () => setUserRole(u.id, role), t("users.roleToast", { name: u.name, role: roleName(role) }))
                            }}
                          >
                            <ShieldCheck /> {t(u.role === "manager" ? "users.makeMember" : "users.makeManager")}
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => setResetFor(u)}>
                          <KeyRound /> {t("users.resetPassword")}
                        </DropdownMenuItem>
                        {u.status === "approved" && !self && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem variant="destructive" onClick={() => setConfirm({ kind: "suspend", user: u })}>
                              <UserMinus /> {t("users.suspend")}
                            </DropdownMenuItem>
                          </>
                        )}
                        {(u.status === "pending" || u.status === "rejected") && !u.member_id && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem variant="destructive" onClick={() => setConfirm({ kind: "delete", user: u })}>
                              <Trash2 /> {t("users.deleteRegistration")}
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </Card>

      <ConfirmDialog
        open={!!confirm}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={
          confirm
            ? t(
                confirm.kind === "reject"
                  ? "users.rejectConfirmTitle"
                  : confirm.kind === "suspend"
                    ? "users.suspendConfirmTitle"
                    : "users.deleteConfirmTitle",
                { name: confirm.user.name }
              )
            : ""
        }
        description={
          confirm
            ? t(confirm.kind === "reject" ? "users.rejectConfirm" : confirm.kind === "suspend" ? "users.suspendConfirm" : "users.deleteConfirm")
            : undefined
        }
        confirmLabel={
          confirm ? t(confirm.kind === "reject" ? "users.reject" : confirm.kind === "suspend" ? "users.suspend" : "common.delete") : undefined
        }
        destructive
        pending={!!confirm && busyId === confirm.user.id}
        onConfirm={runConfirm}
      />

      <ResetPasswordDialog user={resetFor} onClose={() => setResetFor(null)} />
    </FadeIn>
  )
}

function ResetPasswordDialog({ user, onClose }: { user: AppUser | null; onClose: () => void }) {
  const { t } = useI18n()
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | undefined>()
  const [pending, setPending] = useState(false)

  const close = () => {
    setPassword("")
    setError(undefined)
    onClose()
  }

  const submit = async () => {
    if (!user) return
    if (password.length < 8) return setError("validation.passwordMin")
    setPending(true)
    const code = errOf(await resetUserPassword(user.id, password))
    setPending(false)
    if (code) return void toast.error(t(errorKey(code)))
    toast.success(t("users.passwordToast", { name: user.name }))
    close()
  }

  return (
    <Dialog open={!!user} onOpenChange={(o) => !o && !pending && close()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{user ? t("users.resetPasswordTitle", { name: user.name }) : ""}</DialogTitle>
          <DialogDescription>{t("users.resetPasswordDesc")}</DialogDescription>
        </DialogHeader>
        <form
          id="reset-password-form"
          onSubmit={(e) => {
            e.preventDefault()
            submit()
          }}
        >
          <Field label={t("auth.newPassword")} htmlFor="rp-password" error={error}>
            <PasswordInput
              id="rp-password"
              autoComplete="new-password"
              value={password}
              aria-invalid={!!error}
              onChange={(e) => {
                setPassword(e.target.value)
                setError(undefined)
              }}
            />
          </Field>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={close} disabled={pending}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" form="reset-password-form" disabled={pending}>
            {pending && <Loader2 className="animate-spin" />}
            {t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
