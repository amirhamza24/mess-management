import type { Metadata } from "next"
import { MemberDetails } from "@/features/members/member-details"

export const metadata: Metadata = { title: "Member details" }

export default async function Page({ params }: PageProps<"/members/[id]">) {
  const { id } = await params
  return <MemberDetails id={id} />
}
