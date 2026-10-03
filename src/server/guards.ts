import "server-only"
import type { z } from "zod"
import { db } from "./db"
import { AppError } from "./errors"
import { monthRange } from "./serialize"

/** Monthly records may only change while their month is open — and only in the caller's own mess. */
export async function openCycle(cycleId: string, messId: string) {
  const cycle = await db.monthlyCycle.findFirst({ where: { id: cycleId, mess_id: messId } })
  if (!cycle) throw new AppError("NOT_FOUND")
  if (cycle.status === "closed") throw new AppError("MONTH_CLOSED")
  return cycle
}

export function assertDateInCycle(cycle: { year: number; month: number }, iso: string) {
  const { start, end } = monthRange(cycle.year, cycle.month)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso) || iso < start || iso > end) throw new AppError("DATE_OUTSIDE_MONTH")
}

/** Members referenced by a monthly record must belong to that month. */
export async function assertMembersInCycle(cycleId: string, memberIds: (string | null | undefined)[]) {
  const ids = [...new Set(memberIds.filter((id): id is string => !!id))]
  if (ids.length === 0) return
  const count = await db.monthlyMember.count({ where: { monthly_cycle_id: cycleId, member_id: { in: ids } } })
  if (count !== ids.length) throw new AppError("MEMBER_NOT_IN_MONTH")
}

export function parse<S extends z.ZodType>(schema: S, values: unknown): z.output<S> {
  const result = schema.safeParse(values)
  if (!result.success) throw new AppError("VALIDATION")
  return result.data
}

/** A mess must always keep at least one manager with an approved account. */
export async function assertNotLastManager(messId: string, exceptMemberId: string) {
  const others = await db.member.count({
    where: {
      mess_id: messId,
      id: { not: exceptMemberId },
      role: "manager",
      user: { status: "approved" },
    },
  })
  if (others === 0) throw new AppError("LAST_MANAGER")
}

export const nullIfEmpty = (v: string | null | undefined) => {
  const t = v?.trim()
  return t ? t : null
}
