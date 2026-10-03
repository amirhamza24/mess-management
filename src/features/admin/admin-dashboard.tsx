"use client"

import { Ban, Building2, CheckCircle2, Clock3, ShieldCheck, UserCog, Users, XCircle } from "lucide-react"
import Link from "next/link"
import { Rings } from "@/components/brand/rings"
import { EmptyState } from "@/components/common/empty-state"
import { ErrorState } from "@/components/common/error-state"
import { FadeIn, Stagger, StaggerItem } from "@/components/common/motion"
import { TableSkeleton } from "@/components/common/skeletons"
import { StatCard, StatGridSkeleton } from "@/components/common/stat-card"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { useI18n } from "@/components/providers/i18n-provider"
import type { AdminStats, MessStatus } from "@/lib/types"
import { cn } from "@/lib/utils"
import { MessTable } from "./mess-table"
import { useAdminMesses, useAdminStats } from "./queries"

const STATUS_BAR: { status: MessStatus; className: string }[] = [
  { status: "active", className: "bg-success" },
  { status: "pending", className: "bg-warning" },
  { status: "inactive", className: "bg-muted-foreground/50" },
  { status: "rejected", className: "bg-destructive" },
]

function StatusBreakdown({ stats }: { stats: AdminStats }) {
  const { t, num } = useI18n()
  const total = Math.max(stats.total, 1)
  return (
    <Card className="gap-4 p-5 shadow-xs">
      <p className="text-sm font-medium">{t("admin.statTotal")}</p>
      <div className="flex h-2.5 overflow-hidden rounded-full bg-muted" role="img" aria-label={t("admin.statTotal")}>
        {STATUS_BAR.map((s) => (
          <div
            key={s.status}
            className={cn("h-full transition-[width] duration-700 ease-out", s.className)}
            style={{ width: `${(stats[s.status] / total) * 100}%` }}
          />
        ))}
      </div>
      <ul className="grid grid-cols-2 gap-2 text-sm">
        {STATUS_BAR.map((s) => (
          <li key={s.status} className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 text-muted-foreground">
              <span className={cn("size-2 rounded-full", s.className)} />
              {t(`messes.status_${s.status}`)}
            </span>
            <span className="tabular font-medium">{num(stats[s.status])}</span>
          </li>
        ))}
      </ul>
    </Card>
  )
}

export function AdminDashboard({ name }: { name: string }) {
  const { t, num } = useI18n()
  const stats = useAdminStats()
  const pending = useAdminMesses({ status: "pending" })
  const s = stats.data
  const fmt = (n: number) => num(Math.round(n))

  const cards = s
    ? [
        { icon: Building2, label: t("admin.statTotal"), value: s.total, tone: "primary" as const },
        { icon: CheckCircle2, label: t("admin.statActive"), value: s.active, tone: "success" as const },
        { icon: Ban, label: t("admin.statInactive"), value: s.inactive, tone: "default" as const },
        { icon: Clock3, label: t("admin.statPending"), value: s.pending, tone: "warning" as const },
        { icon: XCircle, label: t("admin.statRejected"), value: s.rejected, tone: "danger" as const },
        { icon: UserCog, label: t("admin.statManagers"), value: s.managers, tone: "default" as const },
        { icon: Users, label: t("admin.statMembers"), value: s.members, tone: "default" as const },
      ]
    : []

  return (
    <FadeIn className="grid grid-cols-1 gap-5">
      <Card className="relative overflow-hidden border-0 bg-brand-deep p-5 text-white shadow-sm ring-0 sm:p-6">
        <Rings size={420} intensity="medium" tone="light" className="-top-36 -right-24" />
        <div className="relative">
          <p className="flex items-center gap-1.5 text-sm text-white/70">
            <ShieldCheck className="size-4" /> {t("admin.superAdmin")} · {name}
          </p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight sm:text-2xl">{t("admin.title")}</h1>
          <p className="mt-1 text-sm text-white/75">{t("admin.subtitle")}</p>
        </div>
      </Card>

      {stats.isPending ? (
        <StatGridSkeleton count={8} />
      ) : stats.isError ? (
        <Card className="shadow-xs">
          <ErrorState error={stats.error} onRetry={() => stats.refetch()} />
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
          <Stagger className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {cards.map((c) => (
              <StaggerItem key={c.label}>
                <StatCard icon={c.icon} label={c.label} value={c.value} tone={c.tone} format={fmt} />
              </StaggerItem>
            ))}
          </Stagger>
          {s && <StatusBreakdown stats={s} />}
        </div>
      )}

      <Card className="gap-0 overflow-hidden p-0 shadow-xs">
        <CardHeader className="flex-row items-center justify-between border-b py-4">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Clock3 className="size-4 text-warning" /> {t("admin.recentPending")}
          </CardTitle>
          <Link href="/admin/messes/pending" className="text-xs font-medium text-primary hover:underline">
            {t("admin.viewAll")}
          </Link>
        </CardHeader>
        {pending.isPending ? (
          <TableSkeleton rows={3} cols={6} />
        ) : pending.isError ? (
          <ErrorState error={pending.error} onRetry={() => pending.refetch()} />
        ) : (pending.data ?? []).length === 0 ? (
          <EmptyState icon={Clock3} title={t("admin.noPendingTitle")} description={t("admin.noPendingDesc")} className="py-10" />
        ) : (
          <MessTable rows={(pending.data ?? []).slice(0, 5)} variant="pending" />
        )}
      </Card>
    </FadeIn>
  )
}
