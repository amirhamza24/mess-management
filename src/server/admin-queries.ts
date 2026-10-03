import "server-only"
import type { Prisma } from "@prisma/client"
import type { AdminMessDetails, AdminMessFilters, AdminMessRow, AdminPerson, AdminStats } from "@/lib/types"
import { db } from "./db"
import { AppError } from "./errors"
import { serialize, toDbDate } from "./serialize"
import { requireSuperAdmin } from "./session"

// Platform-level reads for super admins only.

async function adminStats(): Promise<AdminStats> {
  await requireSuperAdmin()
  const [byStatus, managers, members] = await Promise.all([
    db.mess.groupBy({ by: ["status"], _count: { _all: true } }),
    db.member.count({ where: { role: "manager", user_id: { not: null } } }),
    db.member.count(),
  ])
  const count = (s: string) => byStatus.find((r) => r.status === s)?._count._all ?? 0
  return {
    total: byStatus.reduce((a, r) => a + r._count._all, 0),
    active: count("active"),
    inactive: count("inactive"),
    pending: count("pending"),
    rejected: count("rejected"),
    managers,
    members,
  }
}

async function adminMesses(filters: AdminMessFilters = {}): Promise<AdminMessRow[]> {
  await requireSuperAdmin()
  const q = filters.q?.trim()
  const where: Prisma.MessWhereInput = {
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.from || filters.to
      ? {
          created_at: {
            ...(filters.from ? { gte: toDbDate(filters.from) } : {}),
            // inclusive end date
            ...(filters.to ? { lt: new Date(toDbDate(filters.to).getTime() + 24 * 60 * 60 * 1000) } : {}),
          },
        }
      : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            {
              members: {
                some: {
                  role: "manager",
                  OR: [
                    { full_name: { contains: q, mode: "insensitive" } },
                    { email: { contains: q, mode: "insensitive" } },
                    { user: { email: { contains: q, mode: "insensitive" } } },
                  ],
                },
              },
            },
          ],
        }
      : {}),
  }
  const rows = await db.mess.findMany({
    where,
    select: {
      id: true,
      name: true,
      address: true,
      status: true,
      created_at: true,
      creator: { select: { name: true, email: true } },
      members: {
        where: { role: "manager" },
        select: { full_name: true, email: true, user: { select: { email: true } } },
        orderBy: { created_at: "asc" },
        take: 1,
      },
      _count: { select: { members: true } },
    },
    orderBy: { created_at: "desc" },
    take: 500,
  })
  return rows.map((m) => {
    const mgr = m.members[0]
    return {
      id: m.id,
      name: m.name,
      address: m.address,
      status: m.status,
      created_at: m.created_at.toISOString(),
      manager: mgr
        ? { name: mgr.full_name, email: mgr.user?.email ?? mgr.email }
        : { name: m.creator.name, email: m.creator.email },
      member_count: m._count.members,
    }
  })
}

async function adminMess(messId: string): Promise<AdminMessDetails> {
  await requireSuperAdmin()
  const mess = await db.mess.findUnique({
    where: { id: messId },
    include: {
      creator: { select: { name: true, email: true } },
      approver: { select: { name: true } },
      rejecter: { select: { name: true } },
      members: {
        include: { user: { select: { email: true, phone: true, status: true } } },
        orderBy: [{ role: "asc" }, { full_name: "asc" }],
      },
      activities: { orderBy: { created_at: "desc" }, take: 50 },
    },
  })
  if (!mess) throw new AppError("NOT_FOUND")

  const people: AdminPerson[] = mess.members.map((m) => ({
    id: m.id,
    name: m.full_name,
    email: m.user?.email ?? m.email,
    phone: m.phone ?? m.user?.phone ?? null,
    role: m.role,
    member_status: m.status,
    account_status: m.user?.status ?? null,
    joined_at: m.joined_at.toISOString().slice(0, 10),
  }))

  return {
    id: mess.id,
    name: mess.name,
    slug: mess.slug,
    address: mess.address,
    description: mess.description,
    status: mess.status,
    created_at: mess.created_at.toISOString(),
    updated_at: mess.updated_at.toISOString(),
    approved_at: mess.approved_at?.toISOString() ?? null,
    approved_by_name: mess.approver?.name ?? null,
    rejected_at: mess.rejected_at?.toISOString() ?? null,
    rejected_by_name: mess.rejecter?.name ?? null,
    rejection_reason: mess.rejection_reason,
    creator: mess.creator,
    managers: people.filter((p) => p.role === "manager"),
    members: people,
    activities: serialize(
      mess.activities.map(({ id, actor_name, action, note, created_at }) => ({ id, actor_name, action, note, created_at }))
    ),
  }
}

export const adminQueries = { adminStats, adminMesses, adminMess }
