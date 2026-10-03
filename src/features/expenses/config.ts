import { ShoppingBasket, Receipt, type LucideIcon } from "lucide-react"
import type { TKey } from "@/i18n"
import { FOOD_CATEGORIES, OTHER_CATEGORIES } from "@/lib/constants"
import { qk } from "@/lib/query-keys"
import { foodExpenseSchema, otherExpenseSchema } from "@/lib/validation"

/**
 * Food (bazar) and other expenses share one UI module. They are stored in
 * separate tables and only food expenses feed the meal rate (see src/lib/accounting.ts).
 */
export const EXPENSE_KINDS = {
  food: {
    queryKey: qk.food,
    categories: FOOD_CATEGORIES as readonly string[],
    categoryPrefix: "foodCategories",
    ns: "bazar",
    paidByLabel: "bazar.buyer" as TKey,
    totalLabel: "bazar.totalFood" as TKey,
    ruleLabel: "bazar.onlyFoodNote" as TKey,
    placeholder: "bazar.placeholderDesc" as TKey,
    icon: ShoppingBasket as LucideIcon,
    schema: foodExpenseSchema,
    defaultCategory: "rice",
  },
  other: {
    queryKey: qk.other,
    categories: OTHER_CATEGORIES as readonly string[],
    categoryPrefix: "otherCategories",
    ns: "expenses",
    paidByLabel: "expenses.paidBy" as TKey,
    totalLabel: "expenses.totalOther" as TKey,
    ruleLabel: "expenses.neverMealRate" as TKey,
    placeholder: "expenses.placeholderDesc" as TKey,
    icon: Receipt as LucideIcon,
    schema: otherExpenseSchema,
    defaultCategory: "electricity",
  },
} as const

export type ExpenseKind = keyof typeof EXPENSE_KINDS
