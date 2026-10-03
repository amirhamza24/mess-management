import type { Metadata } from "next"
import { MessDetails } from "@/features/admin/mess-details"

export const metadata: Metadata = { title: "Mess details" }

export default async function Page({ params }: PageProps<"/admin/messes/[messId]">) {
  const { messId } = await params
  return <MessDetails messId={messId} />
}
