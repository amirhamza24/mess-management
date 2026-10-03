"use client"

import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query"
import { useCallback } from "react"
import { query } from "@/lib/api"
import type { AdminMessFilters } from "@/lib/types"

export const adminKeys = {
  all: ["admin"] as const,
  stats: ["admin", "stats"] as const,
  messes: (filters: AdminMessFilters) => ["admin", "messes", filters] as const,
  mess: (id: string) => ["admin", "mess", id] as const,
}

export function useAdminStats() {
  return useQuery({ queryKey: adminKeys.stats, queryFn: () => query("adminStats") })
}

export function useAdminMesses(filters: AdminMessFilters) {
  return useQuery({
    queryKey: adminKeys.messes(filters),
    queryFn: () => query("adminMesses", filters),
    placeholderData: keepPreviousData,
  })
}

export function useAdminMess(messId: string) {
  return useQuery({ queryKey: adminKeys.mess(messId), queryFn: () => query("adminMess", messId) })
}

/** Refresh every admin view after a status change (lists, stats, details). */
export function useInvalidateAdmin() {
  const queryClient = useQueryClient()
  return useCallback(() => queryClient.invalidateQueries({ queryKey: adminKeys.all }), [queryClient])
}
