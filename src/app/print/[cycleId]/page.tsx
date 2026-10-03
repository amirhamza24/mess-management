import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { PrintReport } from "@/features/reports/print-report"
import { me } from "@/server/queries"
import { getSession } from "@/server/session"

export const metadata: Metadata = { title: "Monthly report" }

export default async function Page({ params }: PageProps<"/print/[cycleId]">) {
  const user = await getSession()
  if (!user || user.status !== "approved") redirect("/auth/signout?reason=UNAUTHENTICATED")
  const [{ cycleId }, current] = await Promise.all([params, me()])
  if (!current.member || !current.mess || current.mess.status !== "active") redirect("/mess-status")
  return <PrintReport cycleId={cycleId} initialMe={{ ...current, member: current.member, mess: current.mess }} />
}
