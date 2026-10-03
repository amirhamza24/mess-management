import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { CreateMess } from "@/features/mess-setup/create-mess"
import { me } from "@/server/queries"
import { getSession } from "@/server/session"

export const metadata: Metadata = { title: "Create your mess" }

export default async function WelcomePage() {
  const user = await getSession()
  if (!user || user.status !== "approved") redirect("/auth/signout?reason=UNAUTHENTICATED")
  if (user.platform_role === "super_admin") redirect("/admin")
  const current = await me()
  if (current.mess) redirect(current.mess.status === "active" ? "/dashboard" : "/mess-status")
  return <CreateMess userName={user.name} />
}
