import type { Metadata } from "next"
import { MessesList } from "@/features/admin/messes-list"

export const metadata: Metadata = { title: "All messes" }

export default function Page() {
  return <MessesList variant="all" />
}
