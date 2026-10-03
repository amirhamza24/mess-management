"use server"

import { z } from "zod"
import { db } from "@/server/db"
import { AppError, run } from "@/server/errors"
import { parse } from "@/server/guards"
import { cycleOfMess, requireMessManager } from "@/server/context"
import { nonNegativeAmountSchema } from "@/lib/validation"

const startSchema = z.object({
  year: z.number().int().min(2000).max(2100),
  month: z.number().int().min(1).max(12),
  memberIds: z.array(z.string()).min(1),
  defaultRent: nonNegativeAmountSchema,
})

/**
 * Starts a monthly cycle with the selected members. Each member's rent is
 * carried over from their latest previous month, or the default rent.
 */
export async function startMonth(values: z.input<typeof startSchema>) {
  return run(async () => {
    const ctx = await requireMessManager()
    const messId = ctx.mess.id
    if (!values.memberIds?.length) throw new AppError("NO_MEMBERS")
    const { year, month, memberIds, defaultRent } = parse(startSchema, values)
    if (await db.monthlyCycle.findUnique({ where: { mess_id_year_month: { mess_id: messId, year, month } } }))
      throw new AppError("MONTH_EXISTS")

    // Only members of the caller's own mess can be added.
    const members = await db.member.findMany({ where: { id: { in: memberIds }, mess_id: messId }, select: { id: true } })
    if (members.length === 0) throw new AppError("NO_MEMBERS")

    const cycle = await db.$transaction(async (tx) => {
      const created = await tx.monthlyCycle.create({ data: { mess_id: messId, year, month } })
      for (const { id } of members) {
        const last = await tx.houseRent.findFirst({
          where: {
            member_id: id,
            cycle: { mess_id: messId, OR: [{ year: { lt: year } }, { year, month: { lt: month } }] },
          },
          orderBy: [{ cycle: { year: "desc" } }, { cycle: { month: "desc" } }],
          select: { amount: true },
        })
        await tx.monthlyMember.create({ data: { monthly_cycle_id: created.id, member_id: id } })
        await tx.houseRent.create({
          data: { monthly_cycle_id: created.id, member_id: id, amount: last?.amount ?? defaultRent },
        })
      }
      await tx.member.updateMany({
        where: { id: { in: members.map((m) => m.id) }, status: { not: "active" } },
        data: { status: "active", left_at: null },
      })
      return created
    })
    return { id: cycle.id }
  })
}

export async function setMonthStatus(cycleId: string, status: "open" | "closed") {
  return run(async () => {
    const ctx = await requireMessManager()
    await cycleOfMess(cycleId, ctx.mess.id)
    await db.monthlyCycle.update({
      where: { id: cycleId },
      data: { status, closed_at: status === "closed" ? new Date() : null },
    })
    return null
  })
}
