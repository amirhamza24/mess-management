"use client"

import { motion } from "framer-motion"
import { Eye, Loader2, Mail, MoreHorizontal, Users } from "lucide-react"
import Link from "next/link"
import { MemberAvatar } from "@/components/common/member-avatar"
import { MessStatusBadge } from "@/components/common/mess-status-badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useI18n } from "@/components/providers/i18n-provider"
import type { AdminMessRow } from "@/lib/types"
import { cn } from "@/lib/utils"
import { ACTION_ICON, ACTION_LABEL, actionsFor, useMessActions, type MessAction } from "./mess-actions"

function RowActions({ mess, compact }: { mess: AdminMessRow; compact?: boolean }) {
  const { t } = useI18n()
  const { request, busyId } = useMessActions()
  const actions = actionsFor(mess.status)
  const busy = busyId === mess.id
  const target = { id: mess.id, name: mess.name, status: mess.status, manager: mess.manager?.name }
  const primary: MessAction | undefined = mess.status === "pending" ? "approve" : undefined
  const PrimaryIcon = primary ? ACTION_ICON[primary] : null

  return (
    <div className={cn("flex items-center justify-end gap-1.5", compact && "border-t pt-3")}>
      {busy && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
      {compact && (
        <Button variant="outline" size="sm" className="mr-auto" nativeButton={false} render={<Link href={`/admin/messes/${mess.id}`} />}>
          <Eye /> {t("admin.view")}
        </Button>
      )}
      {primary && (
        <Button size="sm" disabled={busy} onClick={() => request(primary, target)}>
          {PrimaryIcon && <PrimaryIcon />}
          {t(ACTION_LABEL[primary])}
        </Button>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="icon-sm" disabled={busy} aria-label={t("admin.colActions")}>
              <MoreHorizontal />
            </Button>
          }
        />
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem render={<Link href={`/admin/messes/${mess.id}`} />}>
            <Eye /> {t("admin.view")}
          </DropdownMenuItem>
          {actions.length > 0 && <DropdownMenuSeparator />}
          {actions.map((a) => {
            const Icon = ACTION_ICON[a]
            return (
              <DropdownMenuItem
                key={a}
                variant={a === "reject" || a === "deactivate" ? "destructive" : "default"}
                onClick={() => request(a, target)}
              >
                <Icon /> {t(ACTION_LABEL[a])}
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

/** Mess list: table on desktop, cards on mobile. `variant="pending"` shows the manager email column. */
export function MessTable({ rows, variant = "all" }: { rows: AdminMessRow[]; variant?: "all" | "pending" }) {
  const { t, date, num } = useI18n()

  return (
    <>
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="pl-4">{t("admin.colMess")}</TableHead>
              <TableHead>{t("admin.colManager")}</TableHead>
              {variant === "pending" ? (
                <TableHead>{t("admin.colManagerEmail")}</TableHead>
              ) : (
                <TableHead className="text-right">{t("admin.colMembers")}</TableHead>
              )}
              <TableHead>{t("admin.colCreated")}</TableHead>
              <TableHead>{t("admin.colStatus")}</TableHead>
              <TableHead className="pr-4 text-right">{t("admin.colActions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((m, i) => (
              <motion.tr
                key={m.id}
                layout="position"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: Math.min(i, 10) * 0.025 }}
                className="border-b transition-colors hover:bg-muted/40"
              >
                <TableCell className="max-w-64 pl-4">
                  <Link href={`/admin/messes/${m.id}`} className="block truncate font-medium hover:text-primary">
                    {m.name}
                  </Link>
                  <span className="block truncate text-xs text-muted-foreground">{m.address}</span>
                </TableCell>
                <TableCell>
                  <span className="flex items-center gap-2">
                    <MemberAvatar name={m.manager?.name ?? "?"} className="size-7" />
                    <span className="max-w-40 truncate">{m.manager?.name ?? "—"}</span>
                  </span>
                </TableCell>
                {variant === "pending" ? (
                  <TableCell className="max-w-56 truncate text-muted-foreground">{m.manager?.email ?? "—"}</TableCell>
                ) : (
                  <TableCell className="tabular text-right">{num(m.member_count)}</TableCell>
                )}
                <TableCell className="text-muted-foreground">{date(m.created_at.slice(0, 10))}</TableCell>
                <TableCell>
                  <MessStatusBadge status={m.status} />
                </TableCell>
                <TableCell className="pr-4">
                  <RowActions mess={m} />
                </TableCell>
              </motion.tr>
            ))}
          </TableBody>
        </Table>
      </div>

      <ul className="divide-y md:hidden">
        {rows.map((m) => (
          <li key={m.id} className="px-4 py-4">
            <div className="flex items-start justify-between gap-3">
              <Link href={`/admin/messes/${m.id}`} className="min-w-0">
                <span className="block truncate font-medium">{m.name}</span>
                <span className="block truncate text-xs text-muted-foreground">{m.address}</span>
              </Link>
              <MessStatusBadge status={m.status} />
            </div>
            <div className="mt-3 grid gap-1.5 text-sm text-muted-foreground">
              <span className="flex items-center gap-2">
                <MemberAvatar name={m.manager?.name ?? "?"} className="size-5 text-[0.55rem]" />
                <span className="truncate text-foreground">{m.manager?.name ?? "—"}</span>
              </span>
              {m.manager?.email && (
                <span className="flex items-center gap-2 truncate">
                  <Mail className="size-3.5 shrink-0" /> {m.manager.email}
                </span>
              )}
              <span className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <Users className="size-3.5" /> {num(m.member_count)}
                </span>
                <span>{date(m.created_at.slice(0, 10))}</span>
              </span>
            </div>
            <div className="mt-3">
              <RowActions mess={m} compact />
            </div>
          </li>
        ))}
      </ul>
    </>
  )
}
