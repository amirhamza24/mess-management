import type { Metadata } from "next"
import { RentPage } from "@/features/rent/rent-page"

export const metadata: Metadata = { title: "House Rent" }

export default function Page() {
  return <RentPage />
}
