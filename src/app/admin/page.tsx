import type { Metadata } from "next"
import { AdminDashboard } from "@/features/admin/admin-dashboard"
import { getSession } from "@/server/session"

export const metadata: Metadata = { title: "Platform overview" }

export default async function Page() {
  const user = await getSession()
  return <AdminDashboard name={user?.name ?? ""} />
}
