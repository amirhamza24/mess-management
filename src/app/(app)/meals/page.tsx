import type { Metadata } from "next"
import { MealsPage } from "@/features/meals/meals-page"

export const metadata: Metadata = { title: "Meals" }

export default function Page() {
  return <MealsPage />
}
