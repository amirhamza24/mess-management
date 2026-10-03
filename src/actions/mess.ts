"use server"

import { Prisma } from "@prisma/client"
import type { z } from "zod"
import { getMembership, logActivity, messNameKey, messSlug, requireMessManager } from "@/server/context"
import { db } from "@/server/db"
import { AppError, run } from "@/server/errors"
import { nullIfEmpty, parse } from "@/server/guards"
import { requireUser } from "@/server/session"
import { messSchema } from "@/lib/validation"

function isNameConflict(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002"
}

async function assertNameFree(name: string, exceptMessId?: string) {
  const existing = await db.mess.findUnique({ where: { name_key: messNameKey(name) }, select: { id: true } })
  if (existing && existing.id !== exceptMessId) throw new AppError("MESS_NAME_TAKEN")
}

/**
 * Creates a mess for the signed-in user, who becomes its manager. The mess
 * starts as PENDING until a super admin approves it. Mess + manager membership
 * are created in one transaction; the manager role is assigned here only.
 */
export async function createMess(values: z.input<typeof messSchema>) {
  return run(async () => {
    const user = await requireUser()
    if (user.platform_role === "super_admin") throw new AppError("FORBIDDEN")
    if (await getMembership(user.id)) throw new AppError("ALREADY_IN_MESS")
    const data = parse(messSchema, values)
    await assertNameFree(data.name)

    try {
      const mess = await db.$transaction(async (tx) => {
        const created = await tx.mess.create({
          data: {
            name: data.name.trim().replace(/\s+/g, " "),
            name_key: messNameKey(data.name),
            slug: messSlug(data.name),
            address: data.address,
            description: nullIfEmpty(data.description),
            status: "pending",
            created_by: user.id,
          },
        })
        await tx.member.create({
          data: {
            mess_id: created.id,
            user_id: user.id,
            role: "manager",
            full_name: user.name,
            email: user.email,
            phone: user.phone,
          },
        })
        // A pending join request elsewhere no longer applies.
        await tx.user.update({ where: { id: user.id }, data: { requested_mess_id: null } })
        await tx.messActivity.create({
          data: { mess_id: created.id, actor_id: user.id, actor_name: user.name, action: "created" },
        })
        return created
      })
      return { id: mess.id, name: mess.name, created_at: mess.created_at.toISOString() }
    } catch (error) {
      if (isNameConflict(error)) throw new AppError("MESS_NAME_TAKEN")
      throw error
    }
  })
}

/** Manager edits their own (active) mess. */
export async function updateMess(values: z.input<typeof messSchema>) {
  return run(async () => {
    const ctx = await requireMessManager()
    const data = parse(messSchema, values)
    await assertNameFree(data.name, ctx.mess.id)
    try {
      await db.mess.update({
        where: { id: ctx.mess.id },
        data: {
          name: data.name.trim().replace(/\s+/g, " "),
          name_key: messNameKey(data.name),
          address: data.address,
          description: nullIfEmpty(data.description),
        },
      })
    } catch (error) {
      if (isNameConflict(error)) throw new AppError("MESS_NAME_TAKEN")
      throw error
    }
    await logActivity(ctx.mess.id, ctx.user, "updated")
    return null
  })
}

/**
 * After a rejection, the creator can discard the rejected mess and start over.
 * Only possible while the mess holds no accounting data.
 */
export async function discardRejectedMess() {
  return run(async () => {
    const user = await requireUser()
    const membership = await getMembership(user.id)
    if (!membership) throw new AppError("NO_MESS")
    const { mess } = membership
    if (mess.status !== "rejected" || mess.created_by !== user.id) throw new AppError("FORBIDDEN")
    const cycles = await db.monthlyCycle.count({ where: { mess_id: mess.id } })
    if (cycles > 0) throw new AppError("IN_USE")
    await db.mess.delete({ where: { id: mess.id } })
    return null
  })
}
