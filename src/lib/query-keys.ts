/** Central TanStack Query keys so invalidation stays consistent across modules. */
export const qk = {
  me: ["me"] as const,
  cycles: ["cycles"] as const,
  roster: ["roster"] as const,
  members: ["members"] as const,
  users: ["users"] as const,
  pendingCount: ["users", "pending-count"] as const,
  monthlyMembers: (cycleId: string) => ["monthly-members", cycleId] as const,
  summary: (cycleId: string) => ["summary", cycleId] as const,
  meals: (cycleId: string) => ["meals", cycleId] as const,
  food: (cycleId: string) => ["food", cycleId] as const,
  other: (cycleId: string) => ["other", cycleId] as const,
  payments: (cycleId: string) => ["payments", cycleId] as const,
  rents: (cycleId: string) => ["rents", cycleId] as const,
}
