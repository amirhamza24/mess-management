import { redirect } from "next/navigation"
import { AppGate } from "@/features/mess/app-gate"
import { getMess } from "@/server/queries"
import { getSession } from "@/server/session"
import { db } from "@/server/db"

// Server-side gate: the session must belong to an approved account. The
// initial user/mess data is passed down so the shell renders without a round trip.
export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await getSession()
  if (!user) redirect("/auth/signout?reason=UNAUTHENTICATED")
  if (user.status !== "approved") redirect(`/auth/signout?reason=ACCOUNT_${user.status.toUpperCase()}`)

  const [member, mess] = await Promise.all([
    db.member.findUnique({ where: { user_id: user.id }, select: { id: true, full_name: true, avatar_url: true } }),
    getMess(),
  ])

  return <AppGate initialMe={{ user, member, mess }}>{children}</AppGate>
}
