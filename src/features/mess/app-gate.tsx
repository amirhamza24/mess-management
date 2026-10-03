"use client"

import { AppShell } from "@/components/layout/app-shell"
import { MessProvider, useMe, type Me } from "./mess-provider"

/** Provides the signed-in user + mess (seeded by the server layout) and renders the shell. */
export function AppGate({ initialMe, children }: { initialMe: Me; children: React.ReactNode }) {
  const { data: me } = useMe(initialMe)
  return (
    <MessProvider me={me}>
      <AppShell>{children}</AppShell>
    </MessProvider>
  )
}
