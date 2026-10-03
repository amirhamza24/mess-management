import type { Metadata } from "next"
import { ExpenseModule } from "@/features/expenses/expense-module"

export const metadata: Metadata = { title: "Other Expenses" }

export default function Page() {
  return <ExpenseModule kind="other" />
}
