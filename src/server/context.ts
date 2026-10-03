import "server-only"
import { cache } from "react"
import { db } from "./db"
import { AppError } from "./errors"
import { requireUser, type SessionUser } from "./session"

// Tenant context. Every mess-scoped query and action derives the mess from the
// signed-in user's membership — never from ids sent by the client — and checks
// the mess status before touching data:
//   user → membership → mess → status → role

export interface MessContext {
  user: SessionUser
  member: { id: string; role: "manager" | "member"; full_name: string; avatar_url: string | null }
  mess: { id: string; name: string; address: string; description: string | null }
  isManager: boolean
}

/** The signed-in user's membership with its mess (any status), or null. */
export const getMembership = cache(async (userId: string) =>
  db.member.findUnique({
    where: { user_id: userId },
    select: {
      id: true,
      role: true,
      full_name: true,
      avatar_url: true,
      mess: {
        select: {
          id: true,
          name: true,
          address: true,
          description: true,
          status: true,
          created_at: true,
          rejection_reason: true,
          rejected_at: true,
          created_by: true,
        },
      },
    },
  })
)

const STATUS_ERROR = {
  pending: "MESS_PENDING",
  inactive: "MESS_INACTIVE",
  rejected: "MESS_REJECTED",
} as const

/**
 * Requires an approved user who belongs to an ACTIVE mess.
 * Pass `{ manager: true }` for manager-only operations.
 */
export async function requireMess(opts: { manager?: boolean } = {}): Promise<MessContext> {
  const user = await requireUser()
  if (user.platform_role === "super_admin") throw new AppError("FORBIDDEN")
  const membership = await getMembership(user.id)
  if (!membership) throw new AppError("NO_MESS")
  const { mess } = membership
  if (mess.status !== "active") throw new AppError(STATUS_ERROR[mess.status])
  const isManager = membership.role === "manager"
  if (opts.manager && !isManager) throw new AppError("FORBIDDEN")
  return {
    user,
    member: { id: membership.id, role: membership.role, full_name: membership.full_name, avatar_url: membership.avatar_url },
    mess: { id: mess.id, name: mess.name, address: mess.address, description: mess.description },
    isManager,
  }
}

export const requireMessManager = () => requireMess({ manager: true })

/** Loads a cycle only if it belongs to the caller's mess (otherwise NOT_FOUND — never leak other messes). */
export async function cycleOfMess(cycleId: string, messId: string) {
  const cycle = await db.monthlyCycle.findFirst({ where: { id: cycleId, mess_id: messId } })
  if (!cycle) throw new AppError("NOT_FOUND")
  return cycle
}

/** Records a platform-level activity entry for a mess. */
export function logActivity(
  messId: string,
  actor: { id: string; name: string } | null,
  action: string,
  note?: string | null
) {
  return db.messActivity.create({
    data: { mess_id: messId, actor_id: actor?.id ?? null, actor_name: actor?.name ?? "System", action, note: note ?? null },
  })
}

/** Lower-cased, whitespace-collapsed name used for the unique index. */
export function messNameKey(name: string) {
  return name.trim().replace(/\s+/g, " ").toLowerCase()
}

export function messSlug(name: string) {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
  return `${base || "mess"}-${Math.random().toString(36).slice(2, 8)}`
}
