// Monthly mess accounting. Pure and framework-free so it can be unit tested.
//
//   meal rate   = food expenses ÷ total meals          (food ONLY)
//   meal cost   = member meals × meal rate
//   other share = other expenses ÷ members active in the month
//   total cost  = meal cost + house rent + other share
//   balance     = total cost − paid   (positive = due, negative = advance)
//
// House rent and other expenses never affect the meal rate.
// Money is computed in integer paisa and meals in half-meal units, so no
// floating-point drift can creep into the results.

export interface AccountingMember {
  member_id: string
  full_name: string
  avatar_url: string | null
  /** "removed" members keep their meals/payments but don't share other expenses */
  status: "active" | "removed"
}

export interface AccountingInput {
  members: AccountingMember[]
  /** total meals per member */
  meals: Record<string, number>
  /** rent owed per member */
  rent: Record<string, number>
  /** all payments per member */
  paid: Record<string, number>
  /** payments with purpose "rent" per member */
  rentPaid: Record<string, number>
  foodByCategory: Record<string, number>
  otherByCategory: Record<string, number>
}

export interface SettlementLine {
  member_id: string
  full_name: string
  avatar_url: string | null
  status: "active" | "removed"
  meals: number
  meal_cost: number
  rent: number
  rent_paid: number
  other_share: number
  total_cost: number
  paid: number
  balance: number
}

export interface Accounting {
  food_total: number
  total_meals: number
  meal_rate: number
  rent_total: number
  other_total: number
  other_share: number
  member_count: number
  total_paid: number
  total_due: number
  total_advance: number
  food_by_category: { category: string; amount: number }[]
  other_by_category: { category: string; amount: number }[]
  members: SettlementLine[]
}

const paisa = (taka: number | undefined) => Math.round((taka ?? 0) * 100)
const halves = (meals: number | undefined) => Math.round((meals ?? 0) * 2)
const taka = (p: number) => p / 100
const sum = (values: number[]) => values.reduce((a, b) => a + b, 0)

function byCategory(record: Record<string, number>) {
  return Object.entries(record)
    .map(([category, amount]) => ({ category, amount: taka(paisa(amount)) }))
    .filter((c) => c.amount !== 0)
    .sort((a, b) => b.amount - a.amount)
}

export function computeAccounting(input: AccountingInput): Accounting {
  const foodP = sum(Object.values(input.foodByCategory).map(paisa))
  const otherP = sum(Object.values(input.otherByCategory).map(paisa))
  // Meals of everyone in the month count — including removed members.
  const totalHalves = sum(Object.values(input.meals).map(halves))
  const activeCount = input.members.filter((m) => m.status === "active").length
  const otherShareP = activeCount > 0 ? Math.round(otherP / activeCount) : 0

  const members = [...input.members]
    .sort((a, b) => a.full_name.localeCompare(b.full_name))
    .map((m): SettlementLine => {
      const mh = halves(input.meals[m.member_id])
      const mealCostP = totalHalves > 0 ? Math.round((mh * foodP) / totalHalves) : 0
      const rentP = paisa(input.rent[m.member_id])
      const shareP = m.status === "active" ? otherShareP : 0
      const paidP = paisa(input.paid[m.member_id])
      const totalP = mealCostP + rentP + shareP
      return {
        member_id: m.member_id,
        full_name: m.full_name,
        avatar_url: m.avatar_url,
        status: m.status,
        meals: mh / 2,
        meal_cost: taka(mealCostP),
        rent: taka(rentP),
        rent_paid: taka(paisa(input.rentPaid[m.member_id])),
        other_share: taka(shareP),
        total_cost: taka(totalP),
        paid: taka(paidP),
        balance: taka(totalP - paidP),
      }
    })

  const balancesP = members.map((m) => paisa(m.balance))
  return {
    food_total: taka(foodP),
    total_meals: totalHalves / 2,
    // meal rate to 4 decimals: (foodP / 100) / (totalHalves / 2)
    meal_rate: totalHalves > 0 ? Math.round((foodP * 200) / totalHalves) / 10000 : 0,
    rent_total: taka(sum(Object.values(input.rent).map(paisa))),
    other_total: taka(otherP),
    other_share: taka(otherShareP),
    member_count: activeCount,
    total_paid: taka(sum(members.map((m) => paisa(m.paid)))),
    total_due: taka(sum(balancesP.filter((b) => b > 0))),
    total_advance: taka(-sum(balancesP.filter((b) => b < 0))),
    food_by_category: byCategory(input.foodByCategory),
    other_by_category: byCategory(input.otherByCategory),
    members,
  }
}
