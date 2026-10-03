"use client"

import { useMemo } from "react"
import { useI18n } from "@/components/providers/i18n-provider"
import { MemberAvatar } from "@/components/common/member-avatar"
import { daysInMonth, todayISO, toNumber } from "@/lib/format"
import type { Meal, MonthlyCycle } from "@/lib/types"
import { cn } from "@/lib/utils"
import type { CycleMember } from "@/features/members/queries"

interface Cell {
  total: number
  extra: boolean
}

/**
 * Full-month meal matrix: members × days.
 * Sticky member column, sticky header and sticky total column; scrolls horizontally
 * inside its own container so the page never overflows.
 */
export function MealMatrix({
  cycle,
  members,
  meals,
  highlightMemberId,
  onDayClick,
}: {
  cycle: MonthlyCycle
  members: CycleMember[]
  meals: Meal[]
  highlightMemberId?: string
  onDayClick?: (iso: string) => void
}) {
  const { t, num, weekday, digits } = useI18n()
  const days = daysInMonth(cycle.year, cycle.month)
  const today = todayISO()
  const pad = (n: number) => String(n).padStart(2, "0")
  const isoOf = (d: number) => `${cycle.year}-${pad(cycle.month)}-${pad(d)}`

  const { grid, memberTotals, dayTotals, grand } = useMemo(() => {
    const grid = new Map<string, Map<number, Cell>>()
    const memberTotals = new Map<string, number>()
    const dayTotals = new Array<number>(days + 1).fill(0)
    let grand = 0
    for (const m of meals) {
      const day = Number(m.date.slice(8, 10))
      const total = toNumber(m.total)
      const extra = toNumber(m.breakfast) > 1 || toNumber(m.lunch) > 1 || toNumber(m.dinner) > 1
      if (!grid.has(m.member_id)) grid.set(m.member_id, new Map())
      grid.get(m.member_id)!.set(day, { total, extra })
      memberTotals.set(m.member_id, (memberTotals.get(m.member_id) ?? 0) + total)
      dayTotals[day] += total
      grand += total
    }
    return { grid, memberTotals, dayTotals, grand }
  }, [meals, days])

  const dayNumbers = Array.from({ length: days }, (_, i) => i + 1)
  const clickable = !!onDayClick

  return (
    <div className="scrollbar-thin relative max-h-[70vh] overflow-auto rounded-b-xl">
      <table className="tabular w-max min-w-full border-separate border-spacing-0 text-sm">
        <thead>
          <tr>
            <th className="sticky top-0 left-0 z-30 min-w-40 border-r border-b bg-muted px-3 py-2 text-left text-xs font-medium text-muted-foreground sm:min-w-48">
              {t("meals.member")}
            </th>
            {dayNumbers.map((d) => {
              const iso = isoOf(d)
              const isToday = iso === today
              const isFriday = new Date(cycle.year, cycle.month - 1, d).getDay() === 5
              return (
                <th
                  key={d}
                  scope="col"
                  className={cn(
                    "sticky top-0 z-20 min-w-11 border-b bg-muted px-1 py-1.5 text-center font-medium",
                    isToday && "bg-accent text-accent-foreground"
                  )}
                >
                  <button
                    type="button"
                    disabled={!clickable}
                    onClick={() => onDayClick?.(iso)}
                    className={cn("flex w-full flex-col items-center rounded-md py-0.5", clickable && "hover:bg-background/70")}
                    title={clickable ? t("meals.clickToEdit") : undefined}
                  >
                    <span className="text-xs">{digits(String(d).padStart(2, "0"))}</span>
                    <span className={cn("text-[0.6rem] font-normal", isFriday ? "text-primary" : "text-muted-foreground")}>
                      {weekday(iso)}
                    </span>
                  </button>
                </th>
              )
            })}
            <th className="sticky top-0 right-0 z-30 min-w-16 border-b border-l bg-muted px-3 py-2 text-right text-xs font-semibold">
              {t("meals.total")}
            </th>
          </tr>
        </thead>
        <tbody>
          {members.map((m) => {
            const row = grid.get(m.id)
            const mine = m.id === highlightMemberId
            return (
              <tr key={m.id} className={cn("group", m.status === "removed" && "opacity-60")}>
                <th
                  scope="row"
                  className={cn(
                    "sticky left-0 z-10 border-r border-b bg-card px-3 py-2 text-left font-medium transition-colors group-hover:bg-muted",
                    mine && "bg-accent group-hover:bg-accent"
                  )}
                >
                  <span className="flex items-center gap-2">
                    <MemberAvatar name={m.full_name} src={m.avatar_url} className="size-6 text-[0.6rem]" />
                    <span className="max-w-32 truncate">{m.full_name}</span>
                    {mine && <span className="text-[0.65rem] font-normal text-primary">({t("common.you")})</span>}
                  </span>
                </th>
                {dayNumbers.map((d) => {
                  const cell = row?.get(d)
                  const iso = isoOf(d)
                  return (
                    <td
                      key={d}
                      onClick={clickable ? () => onDayClick?.(iso) : undefined}
                      className={cn(
                        "relative border-b px-1 py-2 text-center transition-colors group-hover:bg-muted/60",
                        iso === today && "bg-accent/40",
                        mine && "bg-accent/50",
                        clickable && "cursor-pointer"
                      )}
                    >
                      {cell && cell.total > 0 ? (
                        <span className={cn(cell.extra && "font-semibold text-primary")}>{num(cell.total, 1)}</span>
                      ) : (
                        <span className="text-muted-foreground/40">{cell ? num(0) : "–"}</span>
                      )}
                      {cell?.extra && (
                        <span className="absolute top-1 right-1 size-1.5 rounded-full bg-primary" title={t("meals.extraHint")} />
                      )}
                    </td>
                  )
                })}
                <td
                  className={cn(
                    "sticky right-0 z-10 border-b border-l bg-card px-3 py-2 text-right font-semibold transition-colors group-hover:bg-muted",
                    mine && "bg-accent group-hover:bg-accent"
                  )}
                >
                  {num(memberTotals.get(m.id) ?? 0, 1)}
                </td>
              </tr>
            )
          })}
        </tbody>
        <tfoot>
          <tr>
            <th className="sticky bottom-0 left-0 z-30 border-t border-r bg-muted px-3 py-2 text-left text-xs font-semibold">
              {t("meals.dayTotal")}
            </th>
            {dayNumbers.map((d) => (
              <td key={d} className="sticky bottom-0 z-20 border-t bg-muted px-1 py-2 text-center text-xs font-medium">
                {dayTotals[d] ? num(dayTotals[d], 1) : <span className="text-muted-foreground/40">–</span>}
              </td>
            ))}
            <td className="sticky right-0 bottom-0 z-30 border-t border-l bg-accent px-3 py-2 text-right font-bold text-accent-foreground">
              {num(grand, 1)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
