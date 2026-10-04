"use client"

import { useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { logout } from "@/actions/auth"
import { useConfirm } from "@/components/providers/confirm-provider"
import { useI18n } from "@/components/providers/i18n-provider"

/** Asks for confirmation, then signs out and returns to the login page. */
export function useSignOut() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const confirm = useConfirm()
  const { t } = useI18n()
  return () =>
    confirm({
      title: t("nav.logoutConfirmTitle"),
      description: t("nav.logoutConfirm"),
      confirmLabel: t("nav.logout"),
      pendingLabel: t("nav.loggingOut"),
      destructive: true,
      action: async () => {
        await logout()
        queryClient.clear()
        toast.success(t("auth.loggedOut"))
        router.replace("/login")
        router.refresh()
      },
    })
}
