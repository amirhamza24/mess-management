"use client"

import { AnimatePresence, motion } from "framer-motion"
import { CalendarRange, Search, X } from "lucide-react"
import { useEffect, useState } from "react"
import type { DateRange } from "react-day-picker"
import { bn as bnLocale, enUS } from "react-day-picker/locale"
import { SimpleSelect } from "@/components/common/simple-select"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useI18n } from "@/components/providers/i18n-provider"
import { parseISODate, toISODate } from "@/lib/format"
import type { AdminMessFilters, MessStatus } from "@/lib/types"
import { cn } from "@/lib/utils"

const STATUSES: MessStatus[] = ["active", "inactive", "pending", "rejected"]

function useDebounced<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delay)
    return () => window.clearTimeout(id)
  }, [value, delay])
  return debounced
}

/** Created-date range picker: Popover + Calendar (month/year dropdowns, keyboard accessible). */
function DateRangeFilter({
  from,
  to,
  onChange,
}: {
  from?: string
  to?: string
  onChange: (range: { from?: string; to?: string }) => void
}) {
  const { t, lang, date } = useI18n()
  const [open, setOpen] = useState(false)
  const selected: DateRange | undefined = from ? { from: parseISODate(from), to: to ? parseISODate(to) : undefined } : undefined
  const label = from ? (to && to !== from ? `${date(from)} – ${date(to)}` : date(from)) : t("admin.pickRange")

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            className={cn("w-full justify-start font-normal sm:w-auto sm:min-w-56", !from && "text-muted-foreground")}
          >
            <CalendarRange />
            <span className="truncate">{label}</span>
          </Button>
        }
      />
      <PopoverContent align="end" className="w-auto p-0">
        <Calendar
          mode="range"
          numberOfMonths={2}
          captionLayout="dropdown"
          startMonth={new Date(2024, 0)}
          endMonth={new Date(new Date().getFullYear() + 1, 11)}
          defaultMonth={selected?.from ?? new Date(new Date().getFullYear(), new Date().getMonth() - 1)}
          selected={selected}
          onSelect={(range) =>
            onChange({
              from: range?.from ? toISODate(range.from) : undefined,
              to: range?.to ? toISODate(range.to) : undefined,
            })
          }
          locale={lang === "bn" ? bnLocale : enUS}
          className="[&_.rdp-months]:flex-col sm:[&_.rdp-months]:flex-row"
        />
        {from && (
          <div className="flex justify-end border-t p-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                onChange({})
                setOpen(false)
              }}
            >
              {t("admin.clearFilters")}
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}

/**
 * Search + status + date filters with removable chips. Emits debounced filters.
 * `lockedStatus` hides the status filter (pending page).
 */
export function MessFilters({
  value,
  onChange,
  lockedStatus,
}: {
  value: AdminMessFilters
  onChange: (filters: AdminMessFilters) => void
  lockedStatus?: boolean
}) {
  const { t, date } = useI18n()
  const [search, setSearch] = useState(value.q ?? "")
  const debounced = useDebounced(search)

  useEffect(() => {
    if ((value.q ?? "") !== debounced) onChange({ ...value, q: debounced })
    // only react to the debounced search text
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced])

  const chips: { key: string; label: string; clear: () => void }[] = []
  if (value.q) chips.push({ key: "q", label: t("admin.chipSearch", { value: value.q }), clear: () => setSearch("") })
  if (value.status && !lockedStatus)
    chips.push({
      key: "status",
      label: t("admin.chipStatus", { value: t(`messes.status_${value.status}`) }),
      clear: () => onChange({ ...value, status: "" }),
    })
  if (value.from)
    chips.push({
      key: "date",
      label: t("admin.chipDate", {
        value: value.to && value.to !== value.from ? `${date(value.from)} – ${date(value.to)}` : date(value.from),
      }),
      clear: () => onChange({ ...value, from: undefined, to: undefined }),
    })

  return (
    <div className="grid gap-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("admin.searchPlaceholder")}
            aria-label={t("admin.searchPlaceholder")}
            className="pr-9 pl-9"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute top-1/2 right-2 flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label={t("common.close")}
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
        {!lockedStatus && (
          <SimpleSelect
            value={value.status ?? ""}
            onChange={(v) => onChange({ ...value, status: v as MessStatus | "" })}
            options={[
              { value: "", label: t("admin.allStatuses") },
              ...STATUSES.map((s) => ({ value: s, label: t(`messes.status_${s}`) })),
            ]}
            className="sm:w-44"
          />
        )}
        <DateRangeFilter from={value.from} to={value.to} onChange={(r) => onChange({ ...value, ...r })} />
      </div>

      <AnimatePresence initial={false}>
        {chips.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18 }}
            className="flex flex-wrap items-center gap-2 overflow-hidden"
          >
            <AnimatePresence initial={false}>
              {chips.map((c) => (
                <motion.button
                  key={c.key}
                  type="button"
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.15 }}
                  onClick={c.clear}
                  className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-accent px-2.5 py-1 text-xs font-medium text-accent-foreground transition-colors hover:bg-accent/70"
                >
                  {c.label}
                  <X className="size-3" />
                </motion.button>
              ))}
            </AnimatePresence>
            <Button
              variant="link"
              size="sm"
              className="h-auto px-1 text-xs"
              onClick={() => {
                setSearch("")
                onChange(lockedStatus ? { status: value.status } : {})
              }}
            >
              {t("admin.clearFilters")}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
