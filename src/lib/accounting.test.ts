// Run with: npm test
import assert from "node:assert/strict"
import { test } from "node:test"
import { computeAccounting } from "./accounting.ts"

const member = (id: string, status: "active" | "removed" = "active") => ({
  member_id: id,
  full_name: id,
  avatar_url: null,
  status,
})

test("meal rate uses food expenses only", () => {
  const r = computeAccounting({
    members: [member("a"), member("b")],
    meals: { a: 120, b: 80 },
    rent: { a: 2000, b: 2000 },
    paid: {},
    rentPaid: {},
    foodByCategory: { rice: 20000, fish: 10000 },
    otherByCategory: { electricity: 5000 },
  })
  assert.equal(r.food_total, 30000)
  assert.equal(r.total_meals, 200)
  assert.equal(r.meal_rate, 150) // rent and other expenses are not included
  assert.equal(r.rent_total, 4000)
  assert.equal(r.other_share, 2500)
})

test("member settlement: due and advance", () => {
  const r = computeAccounting({
    members: [member("a"), member("b")],
    meals: { a: 25, b: 25 },
    rent: { a: 2000, b: 2000 },
    paid: { a: 6000, b: 1000 },
    rentPaid: { a: 2000 },
    foodByCategory: { rice: 6631.5 },
    otherByCategory: { gas: 1286 },
  })
  const a = r.members.find((m) => m.member_id === "a")!
  const b = r.members.find((m) => m.member_id === "b")!
  assert.equal(a.meal_cost, 3315.75)
  assert.equal(a.other_share, 643)
  assert.equal(a.total_cost, 5958.75)
  assert.equal(a.balance, -41.25) // advance
  assert.equal(a.rent_paid, 2000)
  assert.equal(b.balance, 4958.75) // due
  assert.equal(r.total_due, 4958.75)
  assert.equal(r.total_advance, 41.25)
  assert.equal(r.total_paid, 7000)
})

test("half meals and rounding stay exact", () => {
  const r = computeAccounting({
    members: [member("a"), member("b"), member("c")],
    meals: { a: 3, b: 4, c: 3.5 },
    rent: {},
    paid: {},
    rentPaid: {},
    foodByCategory: { rice: 2000 },
    otherByCategory: {},
  })
  assert.equal(r.total_meals, 10.5)
  assert.equal(r.meal_rate, 190.4762)
  assert.equal(r.members.find((m) => m.member_id === "a")!.meal_cost, 571.43)
})

test("removed members keep their meals but skip the other-expense share", () => {
  const r = computeAccounting({
    members: [member("a"), member("b", "removed")],
    meals: { a: 10, b: 10 },
    rent: {},
    paid: {},
    rentPaid: {},
    foodByCategory: { rice: 2000 },
    otherByCategory: { internet: 1000 },
  })
  assert.equal(r.member_count, 1)
  assert.equal(r.other_share, 1000)
  const b = r.members.find((m) => m.member_id === "b")!
  assert.equal(b.meal_cost, 1000)
  assert.equal(b.other_share, 0)
})

test("empty month", () => {
  const r = computeAccounting({
    members: [],
    meals: {},
    rent: {},
    paid: {},
    rentPaid: {},
    foodByCategory: {},
    otherByCategory: {},
  })
  assert.equal(r.meal_rate, 0)
  assert.equal(r.other_share, 0)
  assert.deepEqual(r.members, [])
})
