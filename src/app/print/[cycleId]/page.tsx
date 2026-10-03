import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { PrintReport } from "@/features/reports/print-report"
import { getMess } from "@/server/queries"
import { db } from "@/server/db"
import { getSession } from "@/server/session"

export const metadata: Metadata = { title: "Monthly report" }

export default async function Page({ params }: PageProps<"/print/[cycleId]">) {
  const user = await getSession()
  if (!user || user.status !== "approved") redirect("/auth/signout?reason=UNAUTHENTICATED")
  const [{ cycleId }, member, mess] = await Promise.all([
    params,
    db.member.findUnique({ where: { user_id: user.id }, select: { id: true, full_name: true, avatar_url: true } }),
    getMess(),
  ])
  return <PrintReport cycleId={cycleId} initialMe={{ user, member, mess }} />
}
