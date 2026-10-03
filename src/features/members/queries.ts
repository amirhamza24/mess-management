"use client"

import { useQuery } from "@tanstack/react-query"
import { useMemo } from "react"
import { useMess } from "@/features/mess/mess-provider"
import { query } from "@/lib/api"
import { qk } from "@/lib/query-keys"
import type { MonthlyMember } from "@/lib/types"

/** Full member records incl. contact info (managers see all, members only themselves). */
export function useMembers() {
  return useQuery({ queryKey: qk.members, queryFn: () => query("members") })
}

export function useMonthlyMembers(cycleId: string | undefined) {
  return useQuery({
    queryKey: qk.monthlyMembers(cycleId ?? "none"),
    enabled: !!cycleId,
    queryFn: () => query("monthlyMembers", cycleId!),
  })
}

export interface CycleMember {
  id: string
  full_name: string
  avatar_url: string | null
  status: MonthlyMember["status"]
}

/**
 * Members taking part in a month, with names from the roster.
 * Active members first; removed members are kept so their history stays visible.
 */
export function useCycleMembers(cycleId: string | undefined) {
  const { roster, rosterLoading } = useMess()
  const query = useMonthlyMembers(cycleId)
  const members = useMemo<CycleMember[]>(() => {
    const byId = new Map(roster.map((r) => [r.id, r]))
    return (query.data ?? [])
      .map((mm) => {
        const r = byId.get(mm.member_id)
        return {
          id: mm.member_id,
          full_name: r?.full_name ?? "—",
          avatar_url: r?.avatar_url ?? null,
          status: mm.status,
        }
      })
      .sort((a, b) =>
        a.status === b.status ? a.full_name.localeCompare(b.full_name) : a.status === "active" ? -1 : 1
      )
  }, [query.data, roster])
  return { ...query, isPending: query.isPending || rosterLoading, members }
}
