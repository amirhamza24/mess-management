"use client"

import { useQuery } from "@tanstack/react-query"
import { Loader2, Users } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { Field } from "@/components/common/field"
import { MemberAvatar } from "@/components/common/member-avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { useI18n } from "@/components/providers/i18n-provider"
import { useMembers } from "@/features/members/queries"
import { useMess } from "@/features/mess/mess-provider"
import { errorKey } from "@/lib/errors"
import { qk } from "@/lib/query-keys"
import { startMonth } from "@/actions/cycles"
import { errOf, query } from "@/lib/api"

/** Manager starts a monthly cycle, choosing who stays this month. */
export function StartMonthDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { t, monthName, money } = useI18n()
  const { period, cycles, refreshMess } = useMess()
  const membersQuery = useMembers()

  // Members of the most recent earlier month are pre-selected ("carry previous members").
  const previousCycle = useMemo(
    () =>
      cycles.find((c) => c.year < period.year || (c.year === period.year && c.month < period.month)) ?? null,
    [cycles, period]
  )
  const previousMembers = useQuery({
    queryKey: qk.monthlyMembers(previousCycle?.id ?? "none"),
    enabled: open && !!previousCycle,
    queryFn: () => query("monthlyMembers", previousCycle!.id),
  })

  const members = useMemo(() => membersQuery.data ?? [], [membersQuery.data])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [rent, setRent] = useState("")
  const [pending, setPending] = useState(false)
  const loading = membersQuery.isPending || (!!previousCycle && previousMembers.isPending)

  useEffect(() => {
    if (!open || loading) return
    const carried = new Set(
      (previousMembers.data ?? []).filter((m) => m.status === "active").map((m) => m.member_id)
    )
    const initial = members
      .filter((m) => (carried.size ? carried.has(m.id) && m.status === "active" : m.status === "active"))
      .map((m) => m.id)
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initialise selection when the dialog opens
    setSelected(new Set(initial))
  }, [open, loading, members, previousMembers.data])

  const toggle = (id: string, on: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (on) next.add(id)
      else next.delete(id)
      return next
    })

  const start = async () => {
    if (selected.size === 0) {
      toast.error(t("month.selectAtLeastOne"))
      return
    }
    const defaultRent = Number(rent)
    if (!Number.isFinite(defaultRent) || defaultRent < 0) {
      toast.error(t("validation.amountNonNegative"))
      return
    }
    setPending(true)
    const error = errOf(
      await startMonth({ year: period.year, month: period.month, memberIds: [...selected], defaultRent })
    )
    setPending(false)
    if (error) {
      toast.error(t(errorKey(error)))
      return
    }
    toast.success(t("month.started", { month: monthName(period.year, period.month) }))
    await refreshMess()
    onOpenChange(false)
  }

  const sorted = [...members].sort((a, b) =>
    a.status === b.status ? a.full_name.localeCompare(b.full_name) : a.status === "active" ? -1 : 1
  )

  return (
    <Dialog open={open} onOpenChange={(o) => !pending && onOpenChange(o)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("month.startTitle")}</DialogTitle>
          <DialogDescription>{t("month.startDesc")}</DialogDescription>
        </DialogHeader>

        <div className="rounded-lg bg-accent/60 px-3 py-2 text-sm">
          <span className="text-muted-foreground">{t("month.month")}: </span>
          <span className="font-semibold text-accent-foreground">{monthName(period.year, period.month)}</span>
        </div>

        <div className="grid gap-2">
          <p className="text-[0.8rem] font-medium">{t("month.startMembers")}</p>
          <div className="scrollbar-thin max-h-64 overflow-y-auto rounded-lg border">
            {loading ? (
              <div className="space-y-2 p-3">
                {Array.from({ length: 4 }, (_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : sorted.length === 0 ? (
              <div className="flex flex-col items-center gap-2 p-6 text-center text-sm text-muted-foreground">
                <Users className="size-5" />
                {t("month.noMembersYet")}
              </div>
            ) : (
              sorted.map((m) => (
                <label
                  key={m.id}
                  className="flex cursor-pointer items-center gap-3 border-b px-3 py-2.5 last:border-0 hover:bg-muted/50"
                >
                  <Checkbox checked={selected.has(m.id)} onCheckedChange={(v) => toggle(m.id, v === true)} />
                  <MemberAvatar name={m.full_name} src={m.avatar_url} className="size-7" />
                  <span className="flex-1 truncate text-sm">{m.full_name}</span>
                  {m.status === "inactive" && (
                    <span className="text-xs text-muted-foreground">{t("members.inactive")}</span>
                  )}
                </label>
              ))
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {selected.size} / {members.length}
          </p>
        </div>

        <Field label={t("month.defaultRent")} htmlFor="default-rent" hint={t("month.defaultRentHint")}>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground">৳</span>
            <Input
              id="default-rent"
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              value={rent}
              onChange={(e) => setRent(e.target.value)}
              className="pl-7"
            />
          </div>
          {Number(rent) > 0 && selected.size > 0 && (
            <p className="text-xs text-muted-foreground">
              {t("rent.totalRent")}: ≈ {money(Number(rent) * selected.size)}
            </p>
          )}
        </Field>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            {t("common.cancel")}
          </Button>
          <Button onClick={start} disabled={pending || loading || members.length === 0}>
            {pending && <Loader2 className="animate-spin" />}
            {pending ? t("month.starting") : t("month.start")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
