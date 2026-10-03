"use client"

import { useQuery, useQueryClient } from "@tanstack/react-query"
import { createContext, useCallback, useContext, useMemo, useState } from "react"
import { query } from "@/lib/api"
import { qk } from "@/lib/query-keys"
import type { MemberRole, MonthlyCycle, MyMess, PlatformRole, RosterMember, UserStatus } from "@/lib/types"

export interface Me {
  user: { id: string; name: string; email: string; phone: string | null; platform_role: PlatformRole; status: UserStatus }
  /** The user's membership in their mess (null when they don't belong to a mess yet). */
  member: { id: string; role: MemberRole; full_name: string; avatar_url: string | null } | null
  /** The user's mess with its status (null when none). */
  mess: MyMess | null
}

/** Me inside the app shell: the mess is guaranteed to exist and be active (checked by the server layout). */
export type ActiveMe = Me & { member: NonNullable<Me["member"]>; mess: MyMess }

/** Signed-in user + mess. Seeded from the server layout, refreshed after profile/role changes. */
export function useMe<T extends Me>(initialMe: T) {
  return useQuery({
    queryKey: qk.me,
    staleTime: 5 * 60_000,
    initialData: initialMe,
    queryFn: () => query("me") as Promise<T>,
  })
}

export interface Period {
  year: number
  month: number
}

interface MessContextValue {
  me: ActiveMe
  mess: MyMess
  /** Member id of the signed-in user ("" when not linked to a member). */
  memberId: string
  isManager: boolean
  displayName: string
  cycles: MonthlyCycle[]
  cyclesLoading: boolean
  roster: RosterMember[]
  rosterLoading: boolean
  period: Period
  setPeriod: (p: Period) => void
  /** Cycle for the selected period, or null when that month has not been started. */
  cycle: MonthlyCycle | null
  isClosed: boolean
  /** Manager and the selected month is open. */
  canEdit: boolean
  refreshMess: () => Promise<void>
}

const MessContext = createContext<MessContextValue | null>(null)

function currentPeriod(): Period {
  const d = new Date()
  return { year: d.getFullYear(), month: d.getMonth() + 1 }
}

export function MessProvider({ me, children }: { me: ActiveMe; children: React.ReactNode }) {
  const queryClient = useQueryClient()
  const isManager = me.member.role === "manager"
  const [period, setPeriod] = useState<Period>(currentPeriod)

  const cyclesQuery = useQuery({ queryKey: qk.cycles, queryFn: () => query("cycles") })
  const rosterQuery = useQuery({ queryKey: qk.roster, queryFn: () => query("roster") })

  const cycles = useMemo(() => cyclesQuery.data ?? [], [cyclesQuery.data])
  const cycle = useMemo(
    () => cycles.find((c) => c.year === period.year && c.month === period.month) ?? null,
    [cycles, period]
  )

  const refreshMess = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: qk.me }),
      queryClient.invalidateQueries({ queryKey: qk.cycles }),
      queryClient.invalidateQueries({ queryKey: qk.roster }),
      queryClient.invalidateQueries({ queryKey: qk.members }),
      queryClient.invalidateQueries({ queryKey: qk.users }),
    ])
  }, [queryClient])

  const value = useMemo<MessContextValue>(() => {
    const isClosed = cycle?.status === "closed"
    return {
      me,
      mess: me.mess,
      memberId: me.member.id,
      isManager,
      displayName: me.user.name || me.member?.full_name || me.user.email,
      cycles,
      cyclesLoading: cyclesQuery.isPending,
      roster: rosterQuery.data ?? [],
      rosterLoading: rosterQuery.isPending,
      period,
      setPeriod,
      cycle,
      isClosed,
      canEdit: isManager && !!cycle && !isClosed,
      refreshMess,
    }
  }, [me, isManager, cycles, cyclesQuery.isPending, rosterQuery.data, rosterQuery.isPending, period, cycle, refreshMess])

  return <MessContext.Provider value={value}>{children}</MessContext.Provider>
}

export function useMess() {
  const ctx = useContext(MessContext)
  if (!ctx) throw new Error("useMess must be used inside <MessProvider>")
  return ctx
}

/** Name lookup for member ids (works for managers and members via the roster). */
export function useMemberNames() {
  const { roster } = useMess()
  return useMemo(() => {
    const map = new Map(roster.map((m) => [m.id, m.full_name]))
    return (id: string | null | undefined) => (id ? map.get(id) ?? "—" : "—")
  }, [roster])
}
