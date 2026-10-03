"use client"

import { useEffect } from "react"
import { AppShell } from "@/components/layout/app-shell"
import { MessProvider, useMe, type ActiveMe, type Me } from "./mess-provider"

function isActiveMe(me: Me | undefined): me is ActiveMe {
  return !!me?.member && me.mess?.status === "active"
}

/** Provides the signed-in user + mess (seeded by the server layout) and renders the shell. */
export function AppGate({ initialMe, children }: { initialMe: ActiveMe; children: React.ReactNode }) {
  const { data } = useMe<Me>(initialMe)
  const active = isActiveMe(data)

  // The mess was deactivated (or membership removed) while the app was open.
  useEffect(() => {
    if (!active) window.location.assign(data?.member ? "/mess-status" : "/welcome")
  }, [active, data?.member])

  return (
    <MessProvider me={active ? data : initialMe}>
      <AppShell>{children}</AppShell>
    </MessProvider>
  )
}
