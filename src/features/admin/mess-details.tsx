"use client"

import { AnimatePresence, motion } from "framer-motion"
import {
  Activity,
  ArrowLeft,
  CalendarCheck2,
  CalendarDays,
  Info,
  Loader2,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  UserCog,
  Users,
  XCircle,
} from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { EmptyState } from "@/components/common/empty-state"
import { ErrorState } from "@/components/common/error-state"
import { MemberAvatar } from "@/components/common/member-avatar"
import { MessStatusBadge } from "@/components/common/mess-status-badge"
import { FadeIn } from "@/components/common/motion"
import { CardListSkeleton } from "@/components/common/skeletons"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useI18n } from "@/components/providers/i18n-provider"
import type { TKey } from "@/i18n"
import type { AdminMessDetails, AdminPerson } from "@/lib/types"
import { cn } from "@/lib/utils"
import { ACTION_ICON, ACTION_LABEL, actionsFor, useMessActions } from "./mess-actions"
import { useAdminMess } from "./queries"

type Tab = "overview" | "manager" | "members" | "activity"

function DetailsSkeleton() {
  return (
    <div className="grid gap-5" aria-hidden>
      <Card className="gap-4 p-5 shadow-xs">
        <Skeleton className="h-6 w-56" />
        <Skeleton className="h-4 w-72" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-28" />
        </div>
      </Card>
      <Skeleton className="h-9 w-80" />
      <Card className="p-4 shadow-xs">
        <CardListSkeleton count={4} />
      </Card>
    </div>
  )
}

function Info2({ label, value, icon: Icon }: { label: string; value: React.ReactNode; icon?: typeof Info }) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {Icon && <Icon className="size-3.5" />}
        {label}
      </dt>
      <dd className="mt-1 text-sm font-medium break-words">{value || "—"}</dd>
    </div>
  )
}

function PersonCard({ person, highlight }: { person: AdminPerson; highlight?: boolean }) {
  const { t, date } = useI18n()
  return (
    <Card className={cn("gap-3 p-4 shadow-xs transition-shadow hover:shadow-sm", highlight && "ring-primary/30")}>
      <div className="flex items-center gap-3">
        <MemberAvatar name={person.name} className="size-10" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{person.name}</p>
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
            <Badge variant="secondary" className={person.role === "manager" ? "bg-accent text-accent-foreground" : undefined}>
              {t(`roles.${person.role}`)}
            </Badge>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[0.7rem] font-medium",
                person.member_status === "active" ? "bg-success-soft text-success" : "bg-muted text-muted-foreground"
              )}
            >
              {t(`members.${person.member_status}`)}
            </span>
          </div>
        </div>
      </div>
      <dl className="grid gap-1.5 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Mail className="size-3.5 shrink-0" />
          <span className="truncate text-foreground">{person.email ?? "—"}</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Phone className="size-3.5 shrink-0" />
          <span className="text-foreground">{person.phone ?? "—"}</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <CalendarDays className="size-3.5 shrink-0" />
          <span>
            {t("admin.joined")}: <span className="text-foreground">{date(person.joined_at)}</span>
          </span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <ShieldCheck className="size-3.5 shrink-0" />
          <span>
            {t("admin.accountStatus")}:{" "}
            <span className="text-foreground">
              {person.account_status ? t(`users.${person.account_status}`) : t("admin.noAccount")}
            </span>
          </span>
        </div>
      </dl>
    </Card>
  )
}

function Header({ mess }: { mess: AdminMessDetails }) {
  const { t } = useI18n()
  const { request, busyId } = useMessActions()
  const busy = busyId === mess.id
  const manager = mess.managers[0]
  const target = { id: mess.id, name: mess.name, status: mess.status, manager: manager?.name ?? mess.creator.name }

  return (
    <Card className="gap-4 p-5 shadow-xs sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{mess.name}</h1>
            <MessStatusBadge status={mess.status} />
          </div>
          <p className="mt-1 flex items-start gap-1.5 text-sm text-muted-foreground">
            <MapPin className="mt-0.5 size-3.5 shrink-0" /> {mess.address}
          </p>
          <div className="mt-3 flex items-center gap-2 text-sm">
            <MemberAvatar name={manager?.name ?? mess.creator.name} className="size-7" />
            <span className="font-medium">{manager?.name ?? mess.creator.name}</span>
            <span className="truncate text-muted-foreground">· {manager?.email ?? mess.creator.email}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {busy && <Loader2 className="size-4 animate-spin self-center text-muted-foreground" />}
          {actionsFor(mess.status).map((a) => {
            const Icon = ACTION_ICON[a]
            const danger = a === "reject" || a === "deactivate"
            return (
              <Button key={a} variant={danger ? "outline" : "default"} disabled={busy} onClick={() => request(a, target)}
                className={cn(danger && "text-destructive hover:bg-danger-soft hover:text-destructive")}>
                <Icon /> {t(ACTION_LABEL[a])}
              </Button>
            )
          })}
        </div>
      </div>
      {mess.status === "rejected" && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-danger-soft/50 px-3.5 py-2.5 text-sm">
          <XCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
          <span>
            <span className="font-medium">{t("messes.rejectionReason")}: </span>
            {mess.rejection_reason || t("messes.noReason")}
          </span>
        </div>
      )}
    </Card>
  )
}

export function MessDetails({ messId }: { messId: string }) {
  const { t, date, num } = useI18n()
  const query = useAdminMess(messId)
  const [tab, setTab] = useState<Tab>("overview")
  const mess = query.data

  const dateTime = (iso: string | null) => (iso ? date(iso.slice(0, 10), "long") : "—")

  return (
    <FadeIn className="grid grid-cols-1 gap-5">
      <div>
        <Button variant="ghost" size="sm" className="-ml-2 text-muted-foreground" nativeButton={false} render={<Link href="/admin/messes" />}>
          <ArrowLeft /> {t("admin.back")}
        </Button>
      </div>

      {query.isPending ? (
        <DetailsSkeleton />
      ) : query.isError || !mess ? (
        <Card className="shadow-xs">
          {(query.error as { code?: string } | null)?.code === "NOT_FOUND" ? (
            <EmptyState icon={Info} title={t("admin.notFound")} />
          ) : (
            <ErrorState error={query.error} onRetry={() => query.refetch()} />
          )}
        </Card>
      ) : (
        <>
          <Header mess={mess} />
          <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)} className="gap-4">
            <TabsList className="h-9 w-full overflow-x-auto sm:w-fit">
              <TabsTrigger value="overview" className="px-3"><Info /> {t("admin.tabOverview")}</TabsTrigger>
              <TabsTrigger value="manager" className="px-3"><UserCog /> {t("admin.tabManager")}</TabsTrigger>
              <TabsTrigger value="members" className="px-3">
                <Users /> {t("admin.tabMembers")} <span className="text-xs text-muted-foreground">{num(mess.members.length)}</span>
              </TabsTrigger>
              <TabsTrigger value="activity" className="px-3"><Activity /> {t("admin.tabActivity")}</TabsTrigger>
            </TabsList>

            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={tab}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
              >
                {tab === "overview" && (
                  <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <Info2 label={t("messes.name")} value={mess.name} />
                    <Info2 label={t("messes.address")} value={mess.address} icon={MapPin} />
                    <Info2 label={t("messes.statusLabel")} value={<MessStatusBadge status={mess.status} />} />
                    <Info2 label={t("messes.createdOn")} value={dateTime(mess.created_at)} icon={CalendarDays} />
                    <Info2
                      label={t("admin.approvedDate")}
                      value={mess.approved_at ? `${dateTime(mess.approved_at)}${mess.approved_by_name ? ` · ${t("admin.by", { name: mess.approved_by_name })}` : ""}` : "—"}
                      icon={CalendarCheck2}
                    />
                    <Info2 label={t("admin.totalMembers")} value={num(mess.members.length)} icon={Users} />
                    <Info2 label={t("admin.colManager")} value={mess.managers.map((m) => m.name).join(", ") || "—"} icon={UserCog} />
                    <Info2 label={t("admin.createdBy")} value={`${mess.creator.name} · ${mess.creator.email}`} />
                    {mess.rejected_at && (
                      <Info2
                        label={t("admin.rejectedDate")}
                        value={`${dateTime(mess.rejected_at)}${mess.rejected_by_name ? ` · ${t("admin.by", { name: mess.rejected_by_name })}` : ""}`}
                        icon={XCircle}
                      />
                    )}
                    <div className="sm:col-span-2 lg:col-span-3">
                      <Info2 label={t("messes.description")} value={mess.description} />
                    </div>
                  </dl>
                )}

                {tab === "manager" &&
                  (mess.managers.length === 0 ? (
                    <Card className="shadow-xs">
                      <EmptyState icon={UserCog} title={t("admin.noManager")} className="py-10" />
                    </Card>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {mess.managers.map((m) => (
                        <PersonCard key={m.id} person={m} highlight />
                      ))}
                    </div>
                  ))}

                {tab === "members" &&
                  (mess.members.length === 0 ? (
                    <Card className="shadow-xs">
                      <EmptyState icon={Users} title={t("admin.noMembers")} className="py-10" />
                    </Card>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {mess.members.map((m) => (
                        <PersonCard key={m.id} person={m} />
                      ))}
                    </div>
                  ))}

                {tab === "activity" && (
                  <Card className="p-5 shadow-xs">
                    {mess.activities.length === 0 ? (
                      <EmptyState icon={Activity} title={t("admin.noActivity")} className="py-8" />
                    ) : (
                      <ol className="relative grid gap-5 border-l pl-5">
                        {mess.activities.map((a) => (
                          <li key={a.id} className="relative">
                            <span className="absolute top-1 -left-[1.6rem] size-2.5 rounded-full bg-primary ring-4 ring-card" />
                            <p className="text-sm font-medium">
                              {t(`admin.act_${a.action}` as TKey) === `admin.act_${a.action}` ? a.action : t(`admin.act_${a.action}` as TKey)}
                              {a.note && <span className="font-normal text-muted-foreground"> — {a.note}</span>}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {t("admin.by", { name: a.actor_name })} · {date(a.created_at.slice(0, 10), "long")}
                            </p>
                          </li>
                        ))}
                      </ol>
                    )}
                  </Card>
                )}
              </motion.div>
            </AnimatePresence>
          </Tabs>
        </>
      )}
    </FadeIn>
  )
}
