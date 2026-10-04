"use client"

import { createContext, useCallback, useContext, useRef, useState } from "react"
import { ConfirmDialog } from "@/components/common/confirm-dialog"
import { useI18n } from "./i18n-provider"

export interface ConfirmOptions {
  title: React.ReactNode
  description?: React.ReactNode
  confirmLabel?: React.ReactNode
  /** Shown on the confirm button while `action` runs (e.g. "Saving..."). */
  pendingLabel?: React.ReactNode
  destructive?: boolean
  /** Runs after the user confirms; the dialog stays open with a loading label until it settles. */
  action?: () => Promise<unknown> | unknown
}

type Confirm = (options: ConfirmOptions) => Promise<boolean>

const ConfirmContext = createContext<Confirm | null>(null)

/** App-wide confirmation dialog: `await confirm({ title, action })` resolves true when confirmed. */
export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null)
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const resolver = useRef<((ok: boolean) => void) | null>(null)

  const settle = (ok: boolean) => {
    resolver.current?.(ok)
    resolver.current = null
    setOpen(false)
  }

  const confirm = useCallback<Confirm>((next) => {
    resolver.current?.(false)
    setOptions(next)
    setPending(false)
    setOpen(true)
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve
    })
  }, [])

  const onConfirm = async () => {
    if (options?.action) {
      setPending(true)
      try {
        await options.action()
      } finally {
        setPending(false)
      }
    }
    settle(true)
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <ConfirmDialog
        open={open}
        onOpenChange={(o) => !o && settle(false)}
        title={options?.title ?? ""}
        description={options?.description}
        confirmLabel={pending && options?.pendingLabel ? options.pendingLabel : options?.confirmLabel}
        destructive={options?.destructive}
        pending={pending}
        onConfirm={onConfirm}
      />
    </ConfirmContext.Provider>
  )
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext)
  if (!ctx) throw new Error("useConfirm must be used inside <ConfirmProvider>")
  return ctx
}

/**
 * Confirmation for form saves: `confirmSave(() => persist(values))` asks "Save changes?"
 * and runs the save with a "Saving..." label. Pass overrides for a more specific title.
 */
export function useConfirmSave() {
  const confirm = useConfirm()
  const { t } = useI18n()
  return (action: () => Promise<unknown> | unknown, overrides?: Partial<Omit<ConfirmOptions, "action">>) =>
    void confirm({
      title: t("confirm.saveTitle"),
      description: t("confirm.saveDesc"),
      confirmLabel: t("common.save"),
      pendingLabel: t("common.saving"),
      ...overrides,
      action,
    })
}
