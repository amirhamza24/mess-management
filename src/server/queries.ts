import "server-only"
import { computeAccounting } from "@/lib/accounting"
import type {
  AppUser,
  CycleSummary,
  FoodExpense,
  HouseRent,
  Meal,
  Mess,
  MessMember,
  MonthlyCycle,
  MonthlyMember,
  OtherExpense,
  Payment,
  RosterMember,
} from "@/lib/types"
import { db } from "./db"
import { AppError } from "./errors"
import { serialize } from "./serialize"
import { getMyMemberId, requireManager, requireUser } from "./session"

// Every read used by the client goes through these functions (exposed via
// /api/query/[name]). Each one authorises the caller itself: members only see
// their own payments, rent and settlement row; contact details are manager-only.

export const DEFAULT_MESS_NAME = "My Mess"

export async function getMess(): Promise<Mess> {
  const mess = await db.mess.findUnique({ where: { id: "main" } })
  return { name: mess?.name ?? DEFAULT_MESS_NAME, address: mess?.address ?? null }
}

async function me() {
  const user = await requireUser()
  const [member, mess] = await Promise.all([
    db.member.findUnique({ where: { user_id: user.id } }),
    getMess(),
  ])
  return {
    user,
    member: member ? serialize({ id: member.id, full_name: member.full_name, avatar_url: member.avatar_url }) : null,
    mess,
  }
}

async function cycles(): Promise<MonthlyCycle[]> {
  await requireUser()
  const rows = await db.monthlyCycle.findMany({ orderBy: [{ year: "desc" }, { month: "desc" }] })
  return serialize(rows)
}

async function roster(): Promise<RosterMember[]> {
  await requireUser()
  const rows = await db.member.findMany({
    select: { id: true, full_name: true, avatar_url: true, status: true, joined_at: true, user: { select: { role: true } } },
    orderBy: { full_name: "asc" },
  })
  return rows.map(({ user, ...m }) => ({ ...serialize(m), role: user?.role ?? "member" }))
}

async function members(): Promise<MessMember[]> {
  const user = await requireUser()
  const rows = await db.member.findMany({
    // Members only get their own record (with contact details).
    where: user.role === "manager" ? {} : { user_id: user.id },
    omit: { created_at: true, updated_at: true },
    include: { user: { select: { role: true, status: true } } },
    orderBy: { full_name: "asc" },
  })
  return rows.map(({ user: account, ...m }) => ({
    ...serialize(m),
    role: account?.role ?? "member",
    account_status: account?.status ?? null,
  }))
}

async function monthlyMembers(cycleId: string): Promise<MonthlyMember[]> {
  await requireUser()
  const rows = await db.monthlyMember.findMany({
    where: { monthly_cycle_id: cycleId },
    select: { id: true, monthly_cycle_id: true, member_id: true, status: true },
  })
  return rows
}

async function meals(cycleId: string): Promise<Meal[]> {
  await requireUser()
  const rows = await db.meal.findMany({
    where: { monthly_cycle_id: cycleId },
    select: { id: true, monthly_cycle_id: true, member_id: true, date: true, breakfast: true, lunch: true, dinner: true },
    orderBy: { date: "asc" },
  })
  return serialize(rows).map((m) => ({ ...m, total: m.breakfast + m.lunch + m.dinner }))
}

async function expenses(kind: "food" | "other", cycleId: string): Promise<(FoodExpense | OtherExpense)[]> {
  await requireUser()
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
  const user = await requireUser()
  const size = Math.min(Math.max(opts.pageSize, 1), 100)
  let memberId = opts.memberId
  if (user.role !== "manager") {
    memberId = (await getMyMemberId(user.id)) ?? "__none__"
  }
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
  const user = await requireUser()
  const memberId = user.role === "manager" ? undefined : ((await getMyMemberId(user.id)) ?? "__none__")
  const rows = await db.houseRent.findMany({
    where: { monthly_cycle_id: cycleId, ...(memberId ? { member_id: memberId } : {}) },
    select: { id: true, monthly_cycle_id: true, member_id: true, amount: true, note: true },
  })
  return serialize(rows)
}

/** Full monthly accounting. Aggregates are visible to all; per-member rows only to managers (others get their own). */
async function cycleSummary(cycleId: string): Promise<CycleSummary> {
  const user = await requireUser()
  const cycle = await db.monthlyCycle.findUnique({ where: { id: cycleId }, select: { id: true } })
  if (!cycle) throw new AppError("NOT_FOUND")
  const where = { monthly_cycle_id: cycleId }

  const [mm, mealSums, rentRows, paySums, foodCats, otherCats, myMemberId] = await Promise.all([
    db.monthlyMember.findMany({
      where,
      select: { member_id: true, status: true, member: { select: { full_name: true, avatar_url: true } } },
    }),
    db.meal.groupBy({ by: ["member_id"], where, _sum: { breakfast: true, lunch: true, dinner: true } }),
    db.houseRent.findMany({ where, select: { member_id: true, amount: true } }),
    db.payment.groupBy({ by: ["member_id", "purpose"], where, _sum: { amount: true } }),
    db.foodExpense.groupBy({ by: ["category"], where, _sum: { amount: true } }),
    db.otherExpense.groupBy({ by: ["category"], where, _sum: { amount: true } }),
    getMyMemberId(user.id),
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

  const isManager = user.role === "manager"
  return {
    ...result,
    cycle_id: cycleId,
    is_manager: isManager,
    my_member_id: myMemberId,
    members: isManager ? result.members : result.members.filter((m) => m.member_id === myMemberId),
  } as CycleSummary
}

async function users(): Promise<AppUser[]> {
  await requireManager()
  const rows = await db.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      status: true,
      approved_at: true,
      approved_by: true,
      created_at: true,
      member: { select: { id: true } },
    },
    orderBy: [{ created_at: "desc" }],
  })
  return rows.map(({ member, ...u }) => ({ ...serialize(u), member_id: member?.id ?? null }))
}

async function pendingCount(): Promise<number> {
  const user = await requireUser()
  if (user.role !== "manager") return 0
  return db.user.count({ where: { status: "pending" } })
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
}

export type Queries = typeof queries
