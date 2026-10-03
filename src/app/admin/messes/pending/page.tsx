import type { Metadata } from "next"
import { MessesList } from "@/features/admin/messes-list"

export const metadata: Metadata = { title: "Pending approvals" }

export default function Page() {
  return <MessesList variant="pending" />
}
