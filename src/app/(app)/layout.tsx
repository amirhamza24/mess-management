import { redirect } from "next/navigation"
import { AppGate } from "@/features/mess/app-gate"
import { me } from "@/server/queries"
import { getSession } from "@/server/session"

// Server-side gate for the mess app: approved account → belongs to a mess →
// mess is ACTIVE. Super admins use /admin. Every query/action re-checks this too.
export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await getSession()
  if (!user) redirect("/auth/signout?reason=UNAUTHENTICATED")
  if (user.status !== "approved") redirect(`/auth/signout?reason=ACCOUNT_${user.status.toUpperCase()}`)
  if (user.platform_role === "super_admin") redirect("/admin")

  const current = await me()
  if (!current.member || !current.mess) redirect("/welcome")
  if (current.mess.status !== "active") redirect("/mess-status")

  return <AppGate initialMe={{ ...current, member: current.member, mess: current.mess }}>{children}</AppGate>
}
