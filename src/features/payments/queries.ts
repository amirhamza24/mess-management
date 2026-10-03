"use client"

import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { query } from "@/lib/api"
import { PAGE_SIZE } from "@/lib/constants"
import { qk } from "@/lib/query-keys"

/** Paginated payments of a month. The server limits members to their own payments. */
export function usePayments(cycleId: string | undefined, opts: { page: number; memberId?: string; pageSize?: number }) {
  const pageSize = opts.pageSize ?? PAGE_SIZE
  return useQuery({
    queryKey: [...qk.payments(cycleId ?? "none"), opts.page, opts.memberId ?? "all", pageSize],
    enabled: !!cycleId,
    placeholderData: keepPreviousData,
    queryFn: () => query("payments", cycleId!, { page: opts.page, memberId: opts.memberId, pageSize }),
  })
}
