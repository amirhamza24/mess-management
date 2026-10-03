"use client"

import { useQuery } from "@tanstack/react-query"
import { query } from "@/lib/api"
import type { FoodExpense, OtherExpense } from "@/lib/types"
import { EXPENSE_KINDS, type ExpenseKind } from "./config"

export type ExpenseRow = FoodExpense | OtherExpense

export function useExpenses(kind: ExpenseKind, cycleId: string | undefined) {
  return useQuery({
    queryKey: EXPENSE_KINDS[kind].queryKey(cycleId ?? "none"),
    enabled: !!cycleId,
    queryFn: () => query("expenses", kind, cycleId!),
  })
}
