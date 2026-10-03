import type { FoodCategory, OtherCategory, PaymentMethod, PaymentPurpose } from "./types"

export const FOOD_CATEGORIES = [
  "rice", "fish", "meat", "chicken", "egg", "vegetable", "dal",
  "oil", "salt", "spice", "onion", "potato", "grocery", "other_food",
] as const satisfies readonly FoodCategory[]

export const OTHER_CATEGORIES = [
  "electricity", "gas", "water", "internet", "cleaning",
  "repair", "maid", "maintenance", "miscellaneous",
] as const satisfies readonly OtherCategory[]

export const PAYMENT_METHODS = ["cash", "bkash", "nagad", "bank", "other"] as const satisfies readonly PaymentMethod[]
export const PAYMENT_PURPOSES = ["mess", "rent"] as const satisfies readonly PaymentPurpose[]

/** Allowed values per meal slot: 0 – 20 in steps of 0.5. */
export const MEAL_MAX = 20
export const MEAL_STEP = 0.5

export const PAGE_SIZE = 20
