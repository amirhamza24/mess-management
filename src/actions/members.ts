"use server"

import { z } from "zod"
import { requireMessManager } from "@/server/context"
import { db } from "@/server/db"
import { AppError, run } from "@/server/errors"
import { nullIfEmpty, openCycle, parse } from "@/server/guards"
import { toDbDate } from "@/server/serialize"
import { memberSchema, nonNegativeAmountSchema } from "@/lib/validation"

// Mess members (people living in the mess). All operations are limited to the
// manager's own mess. Accounts are linked only through approved join requests
// (src/actions/users.ts) — typing someone's email never grants them access.

async function memberOfMess(memberId: string, messId: string) {
  const member = await db.member.findFirst({ where: { id: memberId, mess_id: messId } })
  if (!member) throw new AppError("NOT_FOUND")
  return member
}

export async function createMember(
  values: z.input<typeof memberSchema>,
  addTo?: { cycleId: string; rent?: number | string }
) {
  return run(async () => {
    const ctx = await requireMessManager()
    const data = parse(memberSchema, values)
    const member = await db.member.create({
      data: {
        mess_id: ctx.mess.id,
        full_name: data.full_name,
        email: nullIfEmpty(data.email)?.toLowerCase() ?? null,
        phone: nullIfEmpty(data.phone),
        joined_at: toDbDate(data.joined_at),
      },
    })
    if (addTo) await addToCycle(ctx.mess.id, addTo.cycleId, member.id, addTo.rent)
    return { id: member.id }
  })
}

export async function updateMember(memberId: string, values: z.input<typeof memberSchema>) {
  return run(async () => {
    const ctx = await requireMessManager()
    const data = parse(memberSchema, values)
    await memberOfMess(memberId, ctx.mess.id)
    await db.member.update({
      where: { id: memberId },
      data: {
        full_name: data.full_name,
        email: nullIfEmpty(data.email)?.toLowerCase() ?? null,
        phone: nullIfEmpty(data.phone),
        joined_at: toDbDate(data.joined_at),
      },
    })
    return null
  })
}

export async function setMemberStatus(memberId: string, status: "active" | "inactive") {
  return run(async () => {
    const ctx = await requireMessManager()
    await memberOfMess(memberId, ctx.mess.id)
    await db.member.update({
      where: { id: memberId },
      data:
        status === "inactive"
          ? { status, left_at: toDbDate(new Date().toISOString().slice(0, 10)) }
          : { status, left_at: null },
    })
    return null
  })
}

/** Adds (or re-adds) a member to a month. Rent defaults to their most recent rent. */
async function addToCycle(messId: string, cycleId: string, memberId: string, rent?: number | string) {
  await openCycle(cycleId, messId)
  await memberOfMess(memberId, messId)
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
    const ctx = await requireMessManager()
    await addToCycle(ctx.mess.id, cycleId, memberId, rent)
    return null
  })
}

/** Removes a member from the month. Their meals and payments are kept. */
export async function removeMemberFromMonth(cycleId: string, memberId: string) {
  return run(async () => {
    const ctx = await requireMessManager()
    await openCycle(cycleId, ctx.mess.id)
    const { count } = await db.monthlyMember.updateMany({
      where: { monthly_cycle_id: cycleId, member_id: memberId },
      data: { status: "removed" },
    })
    if (count === 0) throw new AppError("NOT_FOUND")
    return null
  })
}
