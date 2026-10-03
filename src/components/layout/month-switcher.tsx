"use client"

import { CalendarDays, Check, ChevronLeft, ChevronRight, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useI18n } from "@/components/providers/i18n-provider"
import { useMess } from "@/features/mess/mess-provider"
import { shiftMonth } from "@/lib/format"
import { cn } from "@/lib/utils"

/** Previous / month picker / next, plus a jump back to the current month. */
export function MonthSwitcher({ className }: { className?: string }) {
  const { t, monthName } = useI18n()
  const { period, setPeriod, cycles, cycle } = useMess()

  const now = new Date()
  const isCurrent = period.year === now.getFullYear() && period.month === now.getMonth() + 1

  const go = (delta: number) => setPeriod(shiftMonth(period.year, period.month, delta))

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <Button variant="ghost" size="icon-sm" onClick={() => go(-1)} aria-label={t("common.previousMonth")}>
        <ChevronLeft />
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="outline" size="sm" className="min-w-0 gap-2 px-2.5 font-medium sm:min-w-40">
              <CalendarDays className="text-muted-foreground" />
              <span className="truncate">{monthName(period.year, period.month)}</span>
              {cycle?.status === "closed" && <Lock className="size-3 text-muted-foreground" />}
            </Button>
          }
        />
        <DropdownMenuContent align="center" className="w-56">
          <DropdownMenuGroup>
            <DropdownMenuLabel>{t("month.status")}</DropdownMenuLabel>
            {!isCurrent && (
              <DropdownMenuItem onClick={() => setPeriod({ year: now.getFullYear(), month: now.getMonth() + 1 })}>
                <CalendarDays />
                {t("common.currentMonth")}
              </DropdownMenuItem>
            )}
          </DropdownMenuGroup>
          {cycles.length > 0 && <DropdownMenuSeparator />}
          <DropdownMenuGroup className="max-h-72 overflow-y-auto">
            {cycles.map((c) => {
              const selected = c.year === period.year && c.month === period.month
              return (
                <DropdownMenuItem key={c.id} onClick={() => setPeriod({ year: c.year, month: c.month })}>
                  <span className="flex-1">{monthName(c.year, c.month)}</span>
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.5 text-[0.65rem] font-medium",
                      c.status === "closed" ? "bg-muted text-muted-foreground" : "bg-success-soft text-success"
                    )}
                  >
                    {t(c.status === "closed" ? "month.closed" : "month.open")}
                  </span>
                  {selected && <Check className="size-3.5 text-primary" />}
                </DropdownMenuItem>
              )
            })}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <Button variant="ghost" size="icon-sm" onClick={() => go(1)} aria-label={t("common.nextMonth")}>
        <ChevronRight />
      </Button>

      {!isCurrent && (
        <Button
          variant="ghost"
          size="sm"
          className="hidden text-primary md:inline-flex"
          onClick={() => setPeriod({ year: now.getFullYear(), month: now.getMonth() + 1 })}
        >
          {t("common.thisMonth")}
        </Button>
      )}
    </div>
  )
}
