"use client"

import { useQuery } from "@tanstack/react-query"
import { query } from "@/lib/api"
import { qk } from "@/lib/query-keys"

/** All meal rows of a month (everyone in the mess can read them). */
export function useMeals(cycleId: string | undefined) {
  return useQuery({
    queryKey: qk.meals(cycleId ?? "none"),
    enabled: !!cycleId,
    queryFn: () => query("meals", cycleId!),
  })
}

export const MEAL_SLOTS = ["breakfast", "lunch", "dinner"] as const
export type MealSlot = (typeof MEAL_SLOTS)[number]
