import type { Metadata } from "next"
import { ExpenseModule } from "@/features/expenses/expense-module"

export const metadata: Metadata = { title: "Bazar & Food" }

export default function Page() {
  return <ExpenseModule kind="food" />
}
