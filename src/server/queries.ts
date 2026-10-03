import "server-only"
import { computeAccounting } from "@/lib/accounting"
import type {
  AppUser,
  CycleSummary,
  FoodExpense,
  HouseRent,
  Meal,
  MessMember,
  MonthlyCycle,
  MonthlyMember,
  MyMess,
  OtherExpense,
  Payment,
  RosterMember,
} from "@/lib/types"
import { adminQueries } from "./admin-queries"
import { cycleOfMess, getMembership, requireMess, requireMessManager } from "./context"
import { db } from "./db"
import { serialize } from "./serialize"
import { getSession, requireUser } from "./session"

// Every read used by the client goes through these functions (exposed via
// /api/query/[name]). Each one authorises the caller itself and scopes data to
// the caller's own mess: ids sent by the client are only used after checking
// they belong to that mess. Members only see their own payments, rent and
// settlement row; contact details are manager-only.

/** Signed-in user, their membership and their mess (any status — used for status screens). */
export async function me() {
  const user = await requireUser()
  const membership = user.platform_role === "super_admin" ? null : await getMembership(user.id)
  const mess: MyMess | null = membership
    ? {
        ...serialize({
          id: membership.mess.id,
          name: membership.mess.name,
          address: membership.mess.address,
          description: membership.mess.description,
          status: membership.mess.status,
          created_at: membership.mess.created_at,
          rejection_reason: membership.mess.rejection_reason,
          rejected_at: membership.mess.rejected_at,
        }),
        is_creator: membership.mess.created_by === user.id,
      }
    : null
  return {
    user,
    member: membership
      ? { id: membership.id, role: membership.role, full_name: membership.full_name, avatar_url: membership.avatar_url }
      : null,
    mess,
  }
}

async function cycles(): Promise<MonthlyCycle[]> {
  const { mess } = await requireMess()
  const rows = await db.monthlyCycle.findMany({
    where: { mess_id: mess.id },
    omit: { mess_id: true },
    orderBy: [{ year: "desc" }, { month: "desc" }],
  })
  return serialize(rows)
}

async function roster(): Promise<RosterMember[]> {
  const { mess } = await requireMess()
  const rows = await db.member.findMany({
    where: { mess_id: mess.id },
    select: { id: true, full_name: true, avatar_url: true, status: true, joined_at: true, role: true },
    orderBy: { full_name: "asc" },
  })
  return serialize(rows)
}

async function members(): Promise<MessMember[]> {
  const { mess, user, isManager } = await requireMess()
  const rows = await db.member.findMany({
    // Members only get their own record (with contact details).
    where: isManager ? { mess_id: mess.id } : { mess_id: mess.id, user_id: user.id },
    omit: { created_at: true, updated_at: true, mess_id: true },
    include: { user: { select: { status: true } } },
    orderBy: { full_name: "asc" },
  })
  return rows.map(({ user: account, ...m }) => ({ ...serialize(m), account_status: account?.status ?? null }))
}

async function monthlyMembers(cycleId: string): Promise<MonthlyMember[]> {
  const { mess } = await requireMess()
  await cycleOfMess(cycleId, mess.id)
  return db.monthlyMember.findMany({
    where: { monthly_cycle_id: cycleId },
    select: { id: true, monthly_cycle_id: true, member_id: true, status: true },
  })
}

async function meals(cycleId: string): Promise<Meal[]> {
  const { mess } = await requireMess()
  await cycleOfMess(cycleId, mess.id)
  const rows = await db.meal.findMany({
    where: { monthly_cycle_id: cycleId },
    select: { id: true, monthly_cycle_id: true, member_id: true, date: true, breakfast: true, lunch: true, dinner: true },
    orderBy: { date: "asc" },
  })
  return serialize(rows).map((m) => ({ ...m, total: m.breakfast + m.lunch + m.dinner }))
}

async function expenses(kind: "food" | "other", cycleId: string): Promise<(FoodExpense | OtherExpense)[]> {
  const { mess } = await requireMess()
  await cycleOfMess(cycleId, mess.id)
  const args = {
    where: { monthly_cycle_id: cycleId },
    orderBy: [{ date: "desc" as const }, { created_at: "desc" as const }],
  }
  const rows = kind === "food" ? await db.foodExpense.findMany(args) : await db.otherExpense.findMany(args)
  return serialize(rows) as (FoodExpense | OtherExpense)[]
}

async function payments(
  cycleId: string,
  opts: { page: number; memberId?: string; pageSize: number }
): Promise<{ rows: Payment[]; count: number; pageSize: number }> {
  const ctx = await requireMess()
  await cycleOfMess(cycleId, ctx.mess.id)
  const size = Math.min(Math.max(opts.pageSize, 1), 100)
  const memberId = ctx.isManager ? opts.memberId : ctx.member.id
  const where = { monthly_cycle_id: cycleId, ...(memberId ? { member_id: memberId } : {}) }
  const [rows, count] = await Promise.all([
    db.payment.findMany({
      where,
      orderBy: [{ date: "desc" }, { created_at: "desc" }],
      skip: Math.max(opts.page, 0) * size,
      take: size,
    }),
    db.payment.count({ where }),
  ])
  return { rows: serialize(rows) as Payment[], count, pageSize: size }
}

async function rents(cycleId: string): Promise<HouseRent[]> {
  const ctx = await requireMess()
  await cycleOfMess(cycleId, ctx.mess.id)
  const rows = await db.houseRent.findMany({
    where: { monthly_cycle_id: cycleId, ...(ctx.isManager ? {} : { member_id: ctx.member.id }) },
    select: { id: true, monthly_cycle_id: true, member_id: true, amount: true, note: true },
  })
  return serialize(rows)
}

/** Full monthly accounting. Aggregates are visible to all; per-member rows only to managers (others get their own). */
async function cycleSummary(cycleId: string): Promise<CycleSummary> {
  const ctx = await requireMess()
  await cycleOfMess(cycleId, ctx.mess.id)
  const where = { monthly_cycle_id: cycleId }

  const [mm, mealSums, rentRows, paySums, foodCats, otherCats] = await Promise.all([
    db.monthlyMember.findMany({
      where,
      select: { member_id: true, status: true, member: { select: { full_name: true, avatar_url: true } } },
    }),
    db.meal.groupBy({ by: ["member_id"], where, _sum: { breakfast: true, lunch: true, dinner: true } }),
    db.houseRent.findMany({ where, select: { member_id: true, amount: true } }),
    db.payment.groupBy({ by: ["member_id", "purpose"], where, _sum: { amount: true } }),
    db.foodExpense.groupBy({ by: ["category"], where, _sum: { amount: true } }),
    db.otherExpense.groupBy({ by: ["category"], where, _sum: { amount: true } }),
  ])

  const num = (v: unknown) => (v == null ? 0 : Number(v))
  const meals: Record<string, number> = {}
  for (const r of mealSums) meals[r.member_id] = num(r._sum.breakfast) + num(r._sum.lunch) + num(r._sum.dinner)
  const rent: Record<string, number> = {}
  for (const r of rentRows) rent[r.member_id] = num(r.amount)
  const paid: Record<string, number> = {}
  const rentPaid: Record<string, number> = {}
  for (const r of paySums) {
    paid[r.member_id] = (paid[r.member_id] ?? 0) + num(r._sum.amount)
    if (r.purpose === "rent") rentPaid[r.member_id] = (rentPaid[r.member_id] ?? 0) + num(r._sum.amount)
  }

  const result = computeAccounting({
    members: mm.map((m) => ({
      member_id: m.member_id,
      full_name: m.member.full_name,
      avatar_url: m.member.avatar_url,
      status: m.status,
    })),
    meals,
    rent,
    paid,
    rentPaid,
    foodByCategory: Object.fromEntries(foodCats.map((c) => [c.category, num(c._sum.amount)])),
    otherByCategory: Object.fromEntries(otherCats.map((c) => [c.category, num(c._sum.amount)])),
  })

  return {
    ...result,
    cycle_id: cycleId,
    is_manager: ctx.isManager,
    my_member_id: ctx.member.id,
    members: ctx.isManager ? result.members : result.members.filter((m) => m.member_id === ctx.member.id),
  } as CycleSummary
}

/** Accounts of this mess plus pending requests to join it (managers only). */
async function users(): Promise<AppUser[]> {
  const { mess } = await requireMessManager()
  const rows = await db.user.findMany({
    where: {
      platform_role: "user",
      OR: [{ requested_mess_id: mess.id }, { member: { mess_id: mess.id } }],
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      status: true,
      approved_at: true,
      approved_by: true,
      created_at: true,
      member: { select: { id: true, role: true, mess_id: true } },
    },
    orderBy: [{ created_at: "desc" }],
  })
  return rows.map(({ member, ...u }) => ({
    ...serialize(u),
    role: member?.mess_id === mess.id ? member.role : "member",
    member_id: member?.mess_id === mess.id ? member.id : null,
  }))
}

async function pendingCount(): Promise<number> {
  const session = await getSession()
  if (!session || session.platform_role === "super_admin") return 0
  const membership = await getMembership(session.id)
  if (!membership || membership.role !== "manager" || membership.mess.status !== "active") return 0
  return db.user.count({ where: { status: "pending", requested_mess_id: membership.mess.id } })
}

/** Public: active messes matching a name, for the "join a mess" picker on registration. */
async function searchMesses(q: string): Promise<{ id: string; name: string; address: string }[]> {
  const term = (q ?? "").trim()
  if (term.length < 2) return []
  return db.mess.findMany({
    where: { status: "active", name: { contains: term, mode: "insensitive" } },
    select: { id: true, name: true, address: true },
    orderBy: { name: "asc" },
    take: 8,
  })
}

export const queries = {
  me,
  cycles,
  roster,
  members,
  monthlyMembers,
  meals,
  expenses,
  payments,
  rents,
  cycleSummary,
  users,
  pendingCount,
  searchMesses,
  ...adminQueries,
}

export type Queries = typeof queries
