"use server"

import { z } from "zod"
import { db } from "@/server/db"
import { run } from "@/server/errors"
import { assertDateInCycle, assertMembersInCycle, nullIfEmpty, openCycle, parse } from "@/server/guards"
import { toDbDate } from "@/server/serialize"
import { requireManager } from "@/server/session"
import {
  foodExpenseSchema,
  isValidMealValue,
  messSchema,
  nonNegativeAmountSchema,
  otherExpenseSchema,
  paymentSchema,
  rentSchema,
} from "@/lib/validation"

// Mutations for monthly records. Every action: manager only, month must be
// open, dates inside the month, referenced members part of the month.

// ---- Meals ---------------------------------------------------------------

const mealValue = z.number().refine(isValidMealValue)
const dayMealsSchema = z.object({
  date: z.string(),
  entries: z.array(z.object({ member_id: z.string(), breakfast: mealValue, lunch: mealValue, dinner: mealValue })),
})

/** Saves one day's meals. All-zero entries remove that member's record for the day. */
export async function saveDayMeals(cycleId: string, values: z.input<typeof dayMealsSchema>) {
  return run(async () => {
    await requireManager()
    const { date, entries } = parse(dayMealsSchema, values)
    const cycle = await openCycle(cycleId)
    assertDateInCycle(cycle, date)
    await assertMembersInCycle(cycleId, entries.map((e) => e.member_id))
    const day = toDbDate(date)

    await db.$transaction(
      entries.map((e) => {
        const key = { monthly_cycle_id_member_id_date: { monthly_cycle_id: cycleId, member_id: e.member_id, date: day } }
        if (e.breakfast + e.lunch + e.dinner === 0) {
          return db.meal.deleteMany({ where: { monthly_cycle_id: cycleId, member_id: e.member_id, date: day } })
        }
        const values = { breakfast: e.breakfast, lunch: e.lunch, dinner: e.dinner }
        return db.meal.upsert({
          where: key,
          create: { monthly_cycle_id: cycleId, member_id: e.member_id, date: day, ...values },
          update: values,
        })
      })
    )
    return null
  })
}

// ---- Food & other expenses ------------------------------------------------

export async function saveExpense(
  kind: "food" | "other",
  cycleId: string,
  values: z.input<typeof foodExpenseSchema> | z.input<typeof otherExpenseSchema>,
  id?: string
) {
  return run(async () => {
    await requireManager()
    const data = kind === "food" ? parse(foodExpenseSchema, values) : parse(otherExpenseSchema, values)
    const cycle = await openCycle(cycleId)
    assertDateInCycle(cycle, data.date)
    const paidBy = nullIfEmpty(data.paid_by)
    await assertMembersInCycle(cycleId, [paidBy])
    const row = {
      date: toDbDate(data.date),
      paid_by: paidBy,
      description: nullIfEmpty(data.description),
      amount: data.amount,
      note: nullIfEmpty(data.note),
    }
    if (kind === "food") {
      const category = data.category as z.output<typeof foodExpenseSchema>["category"]
      if (id) {
        await openCycle((await db.foodExpense.findUniqueOrThrow({ where: { id } })).monthly_cycle_id)
        await db.foodExpense.update({ where: { id }, data: { ...row, category, monthly_cycle_id: cycleId } })
      } else await db.foodExpense.create({ data: { ...row, category, monthly_cycle_id: cycleId } })
    } else {
      const category = data.category as z.output<typeof otherExpenseSchema>["category"]
      if (id) {
        await openCycle((await db.otherExpense.findUniqueOrThrow({ where: { id } })).monthly_cycle_id)
        await db.otherExpense.update({ where: { id }, data: { ...row, category, monthly_cycle_id: cycleId } })
      } else await db.otherExpense.create({ data: { ...row, category, monthly_cycle_id: cycleId } })
    }
    return null
  })
}

export async function deleteExpense(kind: "food" | "other", id: string) {
  return run(async () => {
    await requireManager()
    if (kind === "food") {
      const row = await db.foodExpense.findUniqueOrThrow({ where: { id } })
      await openCycle(row.monthly_cycle_id)
      await db.foodExpense.delete({ where: { id } })
    } else {
      const row = await db.otherExpense.findUniqueOrThrow({ where: { id } })
      await openCycle(row.monthly_cycle_id)
      await db.otherExpense.delete({ where: { id } })
    }
    return null
  })
}

// ---- Payments -------------------------------------------------------------

export async function savePayment(cycleId: string, values: z.input<typeof paymentSchema>, id?: string) {
  return run(async () => {
    await requireManager()
    const data = parse(paymentSchema, values)
    const cycle = await openCycle(cycleId)
    assertDateInCycle(cycle, data.date)
    await assertMembersInCycle(cycleId, [data.member_id])
    const row = {
      member_id: data.member_id,
      date: toDbDate(data.date),
      amount: data.amount,
      payment_method: data.payment_method,
      purpose: data.purpose,
      note: nullIfEmpty(data.note),
    }
    if (id) {
      await openCycle((await db.payment.findUniqueOrThrow({ where: { id } })).monthly_cycle_id)
      await db.payment.update({ where: { id }, data: { ...row, monthly_cycle_id: cycleId } })
    } else {
      await db.payment.create({ data: { ...row, monthly_cycle_id: cycleId } })
    }
    return null
  })
}

export async function deletePayment(id: string) {
  return run(async () => {
    await requireManager()
    const row = await db.payment.findUniqueOrThrow({ where: { id } })
    await openCycle(row.monthly_cycle_id)
    await db.payment.delete({ where: { id } })
    return null
  })
}

// ---- House rent -----------------------------------------------------------

export async function updateRent(rentId: string, values: z.input<typeof rentSchema>) {
  return run(async () => {
    await requireManager()
    const data = parse(rentSchema, values)
    const rent = await db.houseRent.findUniqueOrThrow({ where: { id: rentId } })
    await openCycle(rent.monthly_cycle_id)
    await db.houseRent.update({ where: { id: rentId }, data: { amount: data.amount, note: nullIfEmpty(data.note) } })
    return null
  })
}

export async function setAllRent(cycleId: string, amount: number | string) {
  return run(async () => {
    await requireManager()
    const { a } = parse(z.object({ a: nonNegativeAmountSchema }), { a: amount })
    await openCycle(cycleId)
    await db.houseRent.updateMany({ where: { monthly_cycle_id: cycleId }, data: { amount: a } })
    return null
  })
}

// ---- Mess settings --------------------------------------------------------

export async function updateMess(values: z.input<typeof messSchema>) {
  return run(async () => {
    await requireManager()
    const data = parse(messSchema, values)
    const row = { name: data.name, address: nullIfEmpty(data.address) }
    await db.mess.upsert({ where: { id: "main" }, create: row, update: row })
    return null
  })
}
