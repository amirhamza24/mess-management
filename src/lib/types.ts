// Row shapes returned by the server (src/server/queries.ts). Decimal columns arrive as
// numbers and dates as YYYY-MM-DD strings; still pass amounts through toNumber() for safety.

export type MemberRole = "manager" | "member"
export type MemberStatus = "active" | "inactive"
export type CycleStatus = "open" | "closed"
export type MonthlyMemberStatus = "active" | "removed"
export type PaymentMethod = "cash" | "bkash" | "nagad" | "bank" | "other"
export type PaymentPurpose = "mess" | "rent"
export type FoodCategory =
  | "rice" | "fish" | "meat" | "chicken" | "egg" | "vegetable" | "dal"
  | "oil" | "salt" | "spice" | "onion" | "potato" | "grocery" | "other_food"
export type OtherCategory =
  | "electricity" | "gas" | "water" | "internet" | "cleaning"
  | "repair" | "maid" | "maintenance" | "miscellaneous"

type Num = number | string

export type UserStatus = "pending" | "approved" | "rejected" | "suspended"

export interface Mess {
  name: string
  address: string | null
}

/** App account, as listed on the approvals page (managers only). */
export interface AppUser {
  id: string
  name: string
  email: string
  phone: string | null
  role: MemberRole
  status: UserStatus
  approved_at: string | null
  approved_by: string | null
  created_at: string
  member_id: string | null
}

export interface MessMember {
  id: string
  user_id: string | null
  full_name: string
  email: string | null
  phone: string | null
  avatar_url: string | null
  /** Role of the linked account; members without an account are "member". */
  role: MemberRole
  /** Approval status of the linked account, null when the member has no account. */
  account_status: UserStatus | null
  status: MemberStatus
  joined_at: string
  left_at: string | null
}

/** Public view of a mess member, readable by everyone in the mess. */
export interface RosterMember {
  id: string
  full_name: string
  avatar_url: string | null
  role: MemberRole
  status: MemberStatus
  joined_at: string
}

export interface MonthlyCycle {
  id: string
  year: number
  month: number
  status: CycleStatus
  started_at: string
  closed_at: string | null
}

export interface MonthlyMember {
  id: string
  monthly_cycle_id: string
  member_id: string
  status: MonthlyMemberStatus
}

export interface Meal {
  id: string
  monthly_cycle_id: string
  member_id: string
  date: string
  breakfast: Num
  lunch: Num
  dinner: Num
  total: Num
}

export interface FoodExpense {
  id: string
  monthly_cycle_id: string
  date: string
  paid_by: string | null
  category: FoodCategory
  description: string | null
  amount: Num
  note: string | null
  created_at: string
}

export interface Payment {
  id: string
  monthly_cycle_id: string
  member_id: string
  date: string
  amount: Num
  payment_method: PaymentMethod
  purpose: PaymentPurpose
  note: string | null
  created_at: string
}

export interface HouseRent {
  id: string
  monthly_cycle_id: string
  member_id: string
  amount: Num
  note: string | null
}

export interface OtherExpense {
  id: string
  monthly_cycle_id: string
  date: string
  category: OtherCategory
  description: string | null
  amount: Num
  paid_by: string | null
  note: string | null
  created_at: string
}

export interface SettlementRow {
  member_id: string
  full_name: string
  avatar_url: string | null
  status: MonthlyMemberStatus
  meals: number
  meal_cost: number
  rent: number
  rent_paid: number
  other_share: number
  total_cost: number
  paid: number
  /** total_cost − paid. Positive = due, negative = advance. */
  balance: number
}

export interface CategoryAmount<C extends string> {
  category: C
  amount: number
}

/** Result of the cycleSummary query (src/server/queries.ts). */
export interface CycleSummary {
  cycle_id: string
  is_manager: boolean
  my_member_id: string | null
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
  food_by_category: CategoryAmount<FoodCategory>[]
  other_by_category: CategoryAmount<OtherCategory>[]
  /** Managers get every member; members only their own row. */
  members: SettlementRow[]
}
