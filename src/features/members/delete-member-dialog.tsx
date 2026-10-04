"use client"

import { useQueryClient } from "@tanstack/react-query"
import { Loader2, Trash2, TriangleAlert } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { deleteMember } from "@/actions/members"
import { Field } from "@/components/common/field"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useI18n } from "@/components/providers/i18n-provider"
import { useMess } from "@/features/mess/mess-provider"
import { errOf } from "@/lib/api"
import { errorKey } from "@/lib/errors"
import type { MessMember } from "@/lib/types"

/** Permanent delete; the manager must type the member's name to confirm. */
export function DeleteMemberDialog({
  member,
  onClose,
  onDeleted,
}: {
  member: MessMember | null
  onClose: () => void
  onDeleted?: () => void
}) {
  const { t } = useI18n()
  const queryClient = useQueryClient()
  const { refreshMess } = useMess()
  const [typed, setTyped] = useState("")
  const [pending, setPending] = useState(false)
  const matches = !!member && typed.trim().toLowerCase() === member.full_name.trim().toLowerCase()

  const close = () => {
    setTyped("")
    onClose()
  }

  const remove = async () => {
    if (!member || !matches) return
    setPending(true)
    const error = errOf(await deleteMember(member.id))
    setPending(false)
    if (error) return void toast.error(t(errorKey(error)))
    toast.success(t("members.deletedToast", { name: member.full_name }))
    close()
    onDeleted?.()
    await Promise.all([refreshMess(), queryClient.invalidateQueries()])
  }

  return (
    <AlertDialog open={!!member} onOpenChange={(o) => !o && !pending && close()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-full bg-danger-soft text-destructive">
              <TriangleAlert className="size-4" />
            </span>
            {member ? t("members.deleteTitle", { name: member.full_name }) : ""}
          </AlertDialogTitle>
          <AlertDialogDescription>{t("members.deleteWarning")}</AlertDialogDescription>
        </AlertDialogHeader>
        <form
          id="delete-member-form"
          onSubmit={(e) => {
            e.preventDefault()
            remove()
          }}
        >
          <Field label={t("members.deleteTypeName", { name: member?.full_name ?? "" })} htmlFor="delete-member-name">
            <Input
              id="delete-member-name"
              autoComplete="off"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={member?.full_name}
              disabled={pending}
            />
          </Field>
        </form>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>{t("common.cancel")}</AlertDialogCancel>
          <Button
            type="submit"
            form="delete-member-form"
            variant="destructive"
            disabled={!matches || pending}
            className="bg-destructive text-white hover:bg-destructive/90 dark:bg-destructive/80"
          >
            {pending ? <Loader2 className="animate-spin" /> : <Trash2 />}
            {pending ? t("members.deleting") : t("members.deletePermanently")}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
