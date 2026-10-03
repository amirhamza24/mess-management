import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { MessStatusView } from "@/features/mess-setup/mess-status-view"
import { me } from "@/server/queries"
import { getSession } from "@/server/session"

export const metadata: Metadata = { title: "Mess status" }

export default async function MessStatusPage() {
  const user = await getSession()
  if (!user || user.status !== "approved") redirect("/auth/signout?reason=UNAUTHENTICATED")
  if (user.platform_role === "super_admin") redirect("/admin")
  const current = await me()
  if (!current.mess || !current.member) redirect("/welcome")
  if (current.mess.status === "active") redirect("/dashboard")
  return <MessStatusView mess={current.mess} isManager={current.member.role === "manager"} />
}
