"use client"

import { Building2, Clock3, SearchX } from "lucide-react"
import { useState } from "react"
import { EmptyState } from "@/components/common/empty-state"
import { ErrorState } from "@/components/common/error-state"
import { FadeIn } from "@/components/common/motion"
import { PageHeader } from "@/components/common/page-header"
import { TableSkeleton } from "@/components/common/skeletons"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useI18n } from "@/components/providers/i18n-provider"
import type { AdminMessFilters } from "@/lib/types"
import { MessFilters } from "./mess-filters"
import { MessTable } from "./mess-table"
import { useAdminMesses } from "./queries"

/** /admin/messes and /admin/messes/pending */
export function MessesList({ variant }: { variant: "all" | "pending" }) {
  const { t, num } = useI18n()
  const pendingOnly = variant === "pending"
  const [filters, setFilters] = useState<AdminMessFilters>(pendingOnly ? { status: "pending" } : {})
  const query = useAdminMesses(filters)
  const rows = query.data ?? []
  const filtered = !!(filters.q || filters.from || (!pendingOnly && filters.status))

  return (
    <FadeIn className="grid grid-cols-1 gap-5">
      <PageHeader
        title={t(pendingOnly ? "admin.pendingTitle" : "admin.messesTitle")}
        description={t(pendingOnly ? "admin.pendingSubtitle" : "admin.messesSubtitle")}
      />

      <Card className="gap-0 overflow-hidden p-0 shadow-xs">
        <div className="border-b p-4">
          <MessFilters value={filters} onChange={setFilters} lockedStatus={pendingOnly} />
        </div>
        <div className="flex items-center justify-between border-b bg-muted/20 px-4 py-2 text-xs text-muted-foreground">
          <span>{t("admin.results", { count: num(rows.length) })}</span>
          {query.isFetching && !query.isPending && <span className="animate-pulse">{t("common.loading")}</span>}
        </div>

        {query.isPending ? (
          <TableSkeleton rows={6} cols={6} />
        ) : query.isError ? (
          <ErrorState error={query.error} onRetry={() => query.refetch()} />
        ) : rows.length === 0 ? (
          filtered ? (
            <EmptyState
              icon={SearchX}
              title={t("admin.emptyTitle")}
              description={t("admin.emptyDesc")}
              action={
                <Button variant="outline" onClick={() => setFilters(pendingOnly ? { status: "pending" } : {})}>
                  {t("admin.clearFilters")}
                </Button>
              }
            />
          ) : pendingOnly ? (
            <EmptyState icon={Clock3} title={t("admin.noPendingTitle")} description={t("admin.noPendingDesc")} />
          ) : (
            <EmptyState icon={Building2} title={t("admin.emptyTitle")} description={t("admin.emptyAll")} />
          )
        ) : (
          <div className={query.isFetching ? "opacity-70 transition-opacity" : "transition-opacity"}>
            <MessTable rows={rows} variant={variant} />
          </div>
        )}
      </Card>
    </FadeIn>
  )
}
