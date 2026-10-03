"use server"

import { logActivity } from "@/server/context"
import { db } from "@/server/db"
import { AppError, run } from "@/server/errors"
import { nullIfEmpty, parse } from "@/server/guards"
import { requireSuperAdmin } from "@/server/session"
import { rejectMessSchema } from "@/lib/validation"

// Platform actions — super admins only. Status transitions:
//   pending  → active (approve) | rejected (reject)
//   rejected → active (approve)
//   active   ⇄ inactive

async function loadMess(messId: string) {
  const mess = await db.mess.findUnique({ where: { id: messId }, select: { id: true, status: true } })
  if (!mess) throw new AppError("NOT_FOUND")
  return mess
}

export async function approveMess(messId: string) {
  return run(async () => {
    const admin = await requireSuperAdmin()
    const mess = await loadMess(messId)
    if (mess.status !== "pending" && mess.status !== "rejected") throw new AppError("VALIDATION")
    await db.mess.update({
      where: { id: messId },
      data: {
        status: "active",
        approved_by: admin.id,
        approved_at: new Date(),
        rejected_by: null,
        rejected_at: null,
        rejection_reason: null,
      },
    })
    await logActivity(messId, admin, "approved")
    return { status: "active" as const }
  })
}

export async function rejectMess(messId: string, values: { reason?: string }) {
  return run(async () => {
    const admin = await requireSuperAdmin()
    const { reason } = parse(rejectMessSchema, values)
    const mess = await loadMess(messId)
    if (mess.status !== "pending") throw new AppError("VALIDATION")
    await db.mess.update({
      where: { id: messId },
      data: {
        status: "rejected",
        rejected_by: admin.id,
        rejected_at: new Date(),
        rejection_reason: nullIfEmpty(reason),
      },
    })
    await logActivity(messId, admin, "rejected", nullIfEmpty(reason))
    return { status: "rejected" as const }
  })
}

export async function setMessActive(messId: string, active: boolean) {
  return run(async () => {
    const admin = await requireSuperAdmin()
    const mess = await loadMess(messId)
    const from = active ? "inactive" : "active"
    if (mess.status !== from) throw new AppError("VALIDATION")
    const status = active ? "active" : "inactive"
    await db.mess.update({ where: { id: messId }, data: { status } })
    await logActivity(messId, admin, active ? "activated" : "deactivated")
    return { status }
  })
}
