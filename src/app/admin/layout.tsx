import { redirect } from "next/navigation"
import { AdminShell } from "@/features/admin/admin-shell"
import { getSession } from "@/server/session"

// Platform admin area: super admins only (every admin query/action re-checks this).
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const user = await getSession()
  if (!user) redirect("/auth/signout?reason=UNAUTHENTICATED")
  if (user.status !== "approved") redirect(`/auth/signout?reason=ACCOUNT_${user.status.toUpperCase()}`)
  if (user.platform_role !== "super_admin") redirect("/dashboard")
  return <AdminShell user={{ name: user.name, email: user.email }}>{children}</AdminShell>
}
