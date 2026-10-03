"use server"

import { z } from "zod"
import { db } from "@/server/db"
import { AppError, run } from "@/server/errors"
import { nullIfEmpty, openCycle, parse } from "@/server/guards"
import { toDbDate } from "@/server/serialize"
import { requireManager } from "@/server/session"
import { memberSchema, nonNegativeAmountSchema } from "@/lib/validation"

/** Link a member to an approved account that registered with the same email. */
async function accountFor(email: string | null) {
  if (!email) return null
  const user = await db.user.findUnique({ where: { email }, include: { member: { select: { id: true } } } })
  return user && !user.member ? user.id : null
}

export async function createMember(
  values: z.input<typeof memberSchema>,
  addTo?: { cycleId: string; rent?: number | string }
) {
  return run(async () => {
    await requireManager()
    const data = parse(memberSchema, values)
    const email = nullIfEmpty(data.email)?.toLowerCase() ?? null
    const member = await db.member.create({
      data: {
        full_name: data.full_name,
        email,
        phone: nullIfEmpty(data.phone),
        joined_at: toDbDate(data.joined_at),
        user_id: await accountFor(email),
      },
    })
    if (addTo) await addToCycle(addTo.cycleId, member.id, addTo.rent)
    return { id: member.id }
  })
}

export async function updateMember(memberId: string, values: z.input<typeof memberSchema>) {
  return run(async () => {
    await requireManager()
    const data = parse(memberSchema, values)
    const email = nullIfEmpty(data.email)?.toLowerCase() ?? null
    const current = await db.member.findUniqueOrThrow({ where: { id: memberId } })
    await db.member.update({
      where: { id: memberId },
      data: {
        full_name: data.full_name,
        email,
        phone: nullIfEmpty(data.phone),
        joined_at: toDbDate(data.joined_at),
        // Never re-assign an existing account link; only link an unlinked member.
        ...(current.user_id ? {} : { user_id: await accountFor(email) }),
      },
    })
    return null
  })
}

export async function setMemberStatus(memberId: string, status: "active" | "inactive") {
  return run(async () => {
    await requireManager()
    await db.member.update({
      where: { id: memberId },
      data: status === "inactive" ? { status, left_at: toDbDate(new Date().toISOString().slice(0, 10)) } : { status, left_at: null },
    })
    return null
  })
}

/** Adds (or re-adds) a member to a month. Rent defaults to their most recent rent. */
async function addToCycle(cycleId: string, memberId: string, rent?: number | string) {
  await openCycle(cycleId)
  const parsedRent =
    rent === undefined || rent === "" ? null : parse(z.object({ r: nonNegativeAmountSchema }), { r: rent }).r
  const lastRent =
    parsedRent ??
    (
      await db.houseRent.findFirst({
        where: { member_id: memberId, monthly_cycle_id: { not: cycleId } },
        orderBy: [{ cycle: { year: "desc" } }, { cycle: { month: "desc" } }],
        select: { amount: true },
      })
    )?.amount ??
    0

  await db.$transaction([
    db.monthlyMember.upsert({
      where: { monthly_cycle_id_member_id: { monthly_cycle_id: cycleId, member_id: memberId } },
      create: { monthly_cycle_id: cycleId, member_id: memberId },
      update: { status: "active" },
    }),
    db.houseRent.upsert({
      where: { monthly_cycle_id_member_id: { monthly_cycle_id: cycleId, member_id: memberId } },
      create: { monthly_cycle_id: cycleId, member_id: memberId, amount: lastRent },
      update: {},
    }),
    db.member.update({ where: { id: memberId }, data: { status: "active", left_at: null } }),
  ])
}

export async function addMemberToMonth(cycleId: string, memberId: string, rent?: number | string) {
  return run(async () => {
    await requireManager()
    await addToCycle(cycleId, memberId, rent)
    return null
  })
}

/** Removes a member from the month. Their meals and payments are kept. */
export async function removeMemberFromMonth(cycleId: string, memberId: string) {
  return run(async () => {
    await requireManager()
    await openCycle(cycleId)
    const { count } = await db.monthlyMember.updateMany({
      where: { monthly_cycle_id: cycleId, member_id: memberId },
      data: { status: "removed" },
    })
    if (count === 0) throw new AppError("NOT_FOUND")
    return null
  })
}
