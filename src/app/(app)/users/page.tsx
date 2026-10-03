import type { Metadata } from "next"
import { UsersPage } from "@/features/users/users-page"

export const metadata: Metadata = { title: "Approvals" }

export default function Page() {
  return <UsersPage />
}
