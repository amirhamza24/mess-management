"use server"

import { z } from "zod"
import { db } from "@/server/db"
import { AppError, run } from "@/server/errors"
import { assertNotLastManager, parse } from "@/server/guards"
import { hashPassword, requireManager } from "@/server/session"
import { passwordSchema } from "@/lib/validation"

/**
 * Approve a registration (or re-activate a suspended account). The user is
 * linked to an existing mess member with the same email, or a new member is created.
 */
export async function approveUser(userId: string) {
  return run(async () => {
    const manager = await requireManager()
    await db.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: userId },
        data: { status: "approved", approved_at: new Date(), approved_by: manager.name },
        include: { member: true },
      })
      if (user.member) return
      const existing = await tx.member.findUnique({ where: { email: user.email } })
      if (existing && !existing.user_id) {
        await tx.member.update({ where: { id: existing.id }, data: { user_id: user.id } })
      } else if (!existing) {
        await tx.member.create({
          data: { user_id: user.id, full_name: user.name, email: user.email, phone: user.phone },
        })
      }
    })
    return null
  })
}

/** Reject a pending registration or suspend an approved account. */
export async function setUserBlocked(userId: string, status: "rejected" | "suspended") {
  return run(async () => {
    const manager = await requireManager()
    if (userId === manager.id) throw new AppError("FORBIDDEN")
    const user = await db.user.findUniqueOrThrow({ where: { id: userId } })
    if (user.role === "manager" && user.status === "approved") await assertNotLastManager(userId)
    await db.user.update({ where: { id: userId }, data: { status, approved_at: null, approved_by: null } })
    return null
  })
}

/** Managers can make any approved user a manager or a member at any time. */
export async function setUserRole(userId: string, role: "manager" | "member") {
  return run(async () => {
    await requireManager()
    if (role === "member") await assertNotLastManager(userId)
    await db.user.update({ where: { id: userId }, data: { role } })
    return null
  })
}

export async function resetUserPassword(userId: string, password: string) {
  return run(async () => {
    await requireManager()
    const parsed = parse(z.object({ password: passwordSchema }), { password })
    await db.user.update({ where: { id: userId }, data: { password: hashPassword(parsed.password) } })
    return null
  })
}

/** Remove a rejected / never-approved registration completely. */
export async function deleteRegistration(userId: string) {
  return run(async () => {
    await requireManager()
    const user = await db.user.findUniqueOrThrow({ where: { id: userId }, include: { member: true } })
    if (user.status === "approved" || user.member) throw new AppError("IN_USE")
    await db.user.delete({ where: { id: userId } })
    return null
  })
}
