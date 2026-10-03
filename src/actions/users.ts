"use server"

import { z } from "zod"
import { logActivity, requireMessManager, type MessContext } from "@/server/context"
import { db } from "@/server/db"
import { AppError, run } from "@/server/errors"
import { assertNotLastManager, parse } from "@/server/guards"
import { hashPassword } from "@/server/session"
import { passwordSchema } from "@/lib/validation"

// Account management by a mess manager. Every action is limited to accounts
// that belong to the manager's own mess or have asked to join it.

async function loadTarget(ctx: MessContext, userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    include: { member: { select: { id: true, mess_id: true, role: true } } },
  })
  const inMess = user?.member?.mess_id === ctx.mess.id
  const requested = user?.requested_mess_id === ctx.mess.id
  if (!user || user.platform_role !== "user" || (!inMess && !requested)) throw new AppError("NOT_FOUND")
  return { user, member: inMess ? user.member : null }
}

/**
 * Approve a join request (or re-activate a suspended account). The account is
 * linked to an existing member with the same email in this mess, or a new member is created.
 */
export async function approveUser(userId: string) {
  return run(async () => {
    const ctx = await requireMessManager()
    const { user, member } = await loadTarget(ctx, userId)
    if (user.member && !member) throw new AppError("ALREADY_IN_MESS")
    await db.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { status: "approved", approved_at: new Date(), approved_by: ctx.user.name, requested_mess_id: null },
      })
      if (member) return
      const existing = await tx.member.findFirst({ where: { mess_id: ctx.mess.id, email: user.email, user_id: null } })
      if (existing) {
        await tx.member.update({ where: { id: existing.id }, data: { user_id: user.id, status: "active", left_at: null } })
      } else {
        await tx.member.create({
          data: { mess_id: ctx.mess.id, user_id: user.id, full_name: user.name, email: user.email, phone: user.phone },
        })
      }
    })
    if (!member) await logActivity(ctx.mess.id, ctx.user, "member_joined", user.name)
    return null
  })
}

/** Reject a join request or suspend an account of this mess. */
export async function setUserBlocked(userId: string, status: "rejected" | "suspended") {
  return run(async () => {
    const ctx = await requireMessManager()
    if (userId === ctx.user.id) throw new AppError("FORBIDDEN")
    const { member } = await loadTarget(ctx, userId)
    if (member?.role === "manager") await assertNotLastManager(ctx.mess.id, member.id)
    await db.user.update({ where: { id: userId }, data: { status, approved_at: null, approved_by: null } })
    return null
  })
}

/** Managers can make any approved account of their mess a manager or a member at any time. */
export async function setUserRole(userId: string, role: "manager" | "member") {
  return run(async () => {
    const ctx = await requireMessManager()
    const { user, member } = await loadTarget(ctx, userId)
    if (!member || user.status !== "approved") throw new AppError("VALIDATION")
    if (role === "member") await assertNotLastManager(ctx.mess.id, member.id)
    await db.member.update({ where: { id: member.id }, data: { role } })
    await logActivity(ctx.mess.id, ctx.user, role === "manager" ? "role_manager" : "role_member", user.name)
    return null
  })
}

export async function resetUserPassword(userId: string, password: string) {
  return run(async () => {
    const ctx = await requireMessManager()
    await loadTarget(ctx, userId)
    const parsed = parse(z.object({ password: passwordSchema }), { password })
    await db.user.update({ where: { id: userId }, data: { password: hashPassword(parsed.password) } })
    return null
  })
}

/** Remove a pending / rejected request to join this mess. */
export async function deleteRegistration(userId: string) {
  return run(async () => {
    const ctx = await requireMessManager()
    const { user, member } = await loadTarget(ctx, userId)
    if (user.status === "approved" || member || user.member) throw new AppError("IN_USE")
    await db.user.delete({ where: { id: userId } })
    return null
  })
}
