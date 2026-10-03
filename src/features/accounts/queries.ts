"use client"

import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useCallback } from "react"
import { query } from "@/lib/api"
import { qk } from "@/lib/query-keys"

export function fetchCycleSummary(cycleId: string) {
  return query("cycleSummary", cycleId)
}

/**
 * Monthly accounting computed on the server (src/lib/accounting.ts):
 * meal rate uses food expenses only; rent and other expenses are separate.
 */
export function useCycleSummary(cycleId: string | undefined) {
  return useQuery({
    queryKey: qk.summary(cycleId ?? "none"),
    enabled: !!cycleId,
    queryFn: () => fetchCycleSummary(cycleId!),
  })
}

/** Invalidate a cycle's data after a mutation; the summary is always refreshed. */
export function useInvalidateCycle() {
  const queryClient = useQueryClient()
  return useCallback(
    (cycleId: string, keys: ((id: string) => readonly unknown[])[] = []) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: qk.summary(cycleId) }),
        ...keys.map((k) => queryClient.invalidateQueries({ queryKey: k(cycleId) })),
      ]),
    [queryClient]
  )
}
