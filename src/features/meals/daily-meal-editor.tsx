"use client"

import { ChevronLeft, ChevronRight, ClipboardCopy, Eraser, Loader2, Minus, Plus, Save, Users } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { EmptyState } from "@/components/common/empty-state"
import { MemberAvatar } from "@/components/common/member-avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useI18n } from "@/components/providers/i18n-provider"
import { useInvalidateCycle } from "@/features/accounts/queries"
import type { CycleMember } from "@/features/members/queries"
import { MEAL_MAX, MEAL_STEP } from "@/lib/constants"
import { errorKey } from "@/lib/errors"
import { monthEndISO, monthStartISO, parseISODate, toISODate, toNumber } from "@/lib/format"
import { qk } from "@/lib/query-keys"
import { saveDayMeals } from "@/actions/records"
import { errOf } from "@/lib/api"
import type { Meal, MonthlyCycle } from "@/lib/types"
import { cn } from "@/lib/utils"
import { isValidMealValue } from "@/lib/validation"
import { MEAL_SLOTS, type MealSlot } from "./queries"

type Entry = Record<MealSlot, string>
type Draft = Record<string, Entry>

const ZERO: Entry = { breakfast: "0", lunch: "0", dinner: "0" }

function entryFromMeal(m?: Meal): Entry {
  if (!m) return { ...ZERO }
  return {
    breakfast: String(toNumber(m.breakfast)),
    lunch: String(toNumber(m.lunch)),
    dinner: String(toNumber(m.dinner)),
  }
}

const parse = (v: string) => (v.trim() === "" ? 0 : Number(v))
const entryTotal = (e: Entry) => MEAL_SLOTS.reduce((s, k) => s + (parse(e[k]) || 0), 0)
const entryValid = (e: Entry) => MEAL_SLOTS.every((k) => isValidMealValue(parse(e[k])))

/** Stepper for a single meal slot: − value +, with decimal (0.5) support. */
function MealInput({
  value,
  onChange,
  disabled,
  label,
}: {
  value: string
  onChange: (v: string) => void
  disabled?: boolean
  label: string
}) {
  const { t, num } = useI18n()
  const n = parse(value)
  const invalid = !isValidMealValue(n)
  const step = (delta: number) => {
    const base = Number.isFinite(n) ? n : 0
    const next = Math.min(MEAL_MAX, Math.max(0, Math.round((base + delta) * 2) / 2))
    onChange(String(next))
  }
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={cn(
          "flex h-9 items-center overflow-hidden rounded-lg border bg-card transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/40",
          invalid && "border-destructive",
          disabled && "opacity-60"
        )}
      >
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled || n <= 0}
          onClick={() => step(-MEAL_STEP)}
          className="flex h-full w-8 items-center justify-center text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
          aria-label={`${label} −`}
        >
          <Minus className="size-3.5" />
        </button>
        <input
          type="text"
          inputMode="decimal"
          aria-label={label}
          aria-invalid={invalid}
          disabled={disabled}
          value={value}
          onFocus={(e) => e.currentTarget.select()}
          onChange={(e) => onChange(e.target.value.replace(/[^\d.]/g, ""))}
          className="tabular h-full w-10 bg-transparent text-center text-sm font-medium outline-none"
        />
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled || n >= MEAL_MAX}
          onClick={() => step(MEAL_STEP)}
          className="flex h-full w-8 items-center justify-center text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
          aria-label={`${label} +`}
        >
          <Plus className="size-3.5" />
        </button>
      </div>
      {/* Guest / extra meal indicator: any value above 1 for a slot */}
      <span className={cn("h-4 text-[0.65rem] font-medium", invalid ? "text-destructive" : "text-primary")}>
        {invalid ? t("meals.invalidValue") : n > 1 ? t("meals.extra", { n: num(n - 1, 1) }) : ""}
      </span>
    </div>
  )
}

export function DailyMealEditor({
  cycle,
  members,
  meals,
  date,
  onDateChange,
  canEdit,
}: {
  cycle: MonthlyCycle
  members: CycleMember[]
  meals: Meal[]
  date: string
  onDateChange: (iso: string) => void
  canEdit: boolean
}) {
  const { t, num, date: fmtDate, weekday } = useI18n()
  const invalidate = useInvalidateCycle()
  const minDate = monthStartISO(cycle.year, cycle.month)
  const maxDate = monthEndISO(cycle.year, cycle.month)

  const dayMeals = useMemo(() => new Map(meals.filter((m) => m.date === date).map((m) => [m.member_id, m])), [meals, date])

  // Active members, plus removed members who already have a record that day.
  const rows = useMemo(
    () => members.filter((m) => m.status === "active" || dayMeals.has(m.id)),
    [members, dayMeals]
  )

  const initial = useMemo<Draft>(() => {
    const d: Draft = {}
    for (const m of rows) d[m.id] = entryFromMeal(dayMeals.get(m.id))
    return d
  }, [rows, dayMeals])

  const [draft, setDraft] = useState<Draft>(initial)
  const [saving, setSaving] = useState(false)
  // eslint-disable-next-line react-hooks/set-state-in-effect -- reload draft when date or saved data changes
  useEffect(() => setDraft(initial), [initial])

  const dirty = rows.some((m) => MEAL_SLOTS.some((k) => parse(draft[m.id]?.[k] ?? "0") !== parse(initial[m.id]?.[k] ?? "0")))
  const allValid = rows.every((m) => entryValid(draft[m.id] ?? ZERO))

  const setValue = (memberId: string, slot: MealSlot, value: string) =>
    setDraft((d) => ({ ...d, [memberId]: { ...(d[memberId] ?? ZERO), [slot]: value } }))

  const shiftDay = (delta: number) => {
    const d = parseISODate(date)
    d.setDate(d.getDate() + delta)
    const iso = toISODate(d)
    if (iso >= minDate && iso <= maxDate) onDateChange(iso)
  }

  const copyPrevious = () => {
    const d = parseISODate(date)
    d.setDate(d.getDate() - 1)
    const prevIso = toISODate(d)
    const prev = meals.filter((m) => m.date === prevIso)
    if (prev.length === 0) {
      toast.info(t("meals.nothingToCopy"))
      return
    }
    const byMember = new Map(prev.map((m) => [m.member_id, m]))
    setDraft(Object.fromEntries(rows.map((m) => [m.id, entryFromMeal(byMember.get(m.id))])))
    toast.success(t("meals.copied", { date: fmtDate(prevIso) }))
  }

  const fillAll = () =>
    setDraft(Object.fromEntries(rows.map((m) => [m.id, m.status === "active" ? { breakfast: "1", lunch: "1", dinner: "1" } : { ...ZERO }])))
  const clearAll = () => setDraft(Object.fromEntries(rows.map((m) => [m.id, { ...ZERO }])))

  const save = async () => {
    if (!allValid) {
      toast.error(t("validation.mealValue"))
      return
    }
    setSaving(true)
    // All-zero entries clear that member's record for the day.
    const entries = rows.map((m) => {
      const e = draft[m.id] ?? ZERO
      return { member_id: m.id, breakfast: parse(e.breakfast), lunch: parse(e.lunch), dinner: parse(e.dinner) }
    })
    const error = errOf(await saveDayMeals(cycle.id, { date, entries }))
    setSaving(false)
    if (error) {
      toast.error(t(errorKey(error)) === t("errors.generic") ? t("meals.saveFailed") : t(errorKey(error)))
      return
    }
    toast.success(t("meals.saved"))
    await invalidate(cycle.id, [qk.meals])
  }

  const slotTotals = MEAL_SLOTS.map((k) => rows.reduce((s, m) => s + (parse(draft[m.id]?.[k] ?? "0") || 0), 0))
  const dayTotal = slotTotals.reduce((a, b) => a + b, 0)
  const disabled = !canEdit || saving

  if (rows.length === 0) {
    return <EmptyState icon={Users} title={t("meals.noMembers")} />
  }

  return (
    <div className="grid grid-cols-1 gap-4">
      {/* Date bar */}
      <div className="flex flex-col gap-3 border-b px-4 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => shiftDay(-1)} disabled={date <= minDate} aria-label={t("common.previous")}>
            <ChevronLeft />
          </Button>
          <div className="relative">
            <Input
              type="date"
              aria-label={t("meals.selectDate")}
              value={date}
              min={minDate}
              max={maxDate}
              onChange={(e) => e.target.value && onDateChange(e.target.value)}
              className="w-44"
            />
          </div>
          <Button variant="outline" size="icon" onClick={() => shiftDay(1)} disabled={date >= maxDate} aria-label={t("common.next")}>
            <ChevronRight />
          </Button>
          <div className="ml-1 hidden flex-col sm:flex">
            <span className="text-sm font-semibold">{fmtDate(date, "long")}</span>
            <span className="text-xs text-muted-foreground">{weekday(date)}</span>
          </div>
        </div>
        {canEdit && (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={copyPrevious} disabled={disabled}>
              <ClipboardCopy /> {t("meals.copyPrevious")}
            </Button>
            <Button variant="outline" size="sm" onClick={fillAll} disabled={disabled}>
              {t("meals.fillAll")}
            </Button>
            <Button variant="ghost" size="sm" onClick={clearAll} disabled={disabled}>
              <Eraser /> {t("meals.clearAll")}
            </Button>
          </div>
        )}
      </div>

      {/* Desktop / tablet table */}
      <div className="hidden overflow-x-auto px-4 md:block">
        <table className="tabular w-full text-sm">
          <thead>
            <tr className="text-xs text-muted-foreground">
              <th className="py-2 text-left font-medium">{t("meals.member")}</th>
              {MEAL_SLOTS.map((k) => (
                <th key={k} className="py-2 text-center font-medium">{t(`meals.${k}`)}</th>
              ))}
              <th className="py-2 pr-2 text-right font-medium">{t("meals.total")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((m) => {
              const e = draft[m.id] ?? ZERO
              return (
                <tr key={m.id} className="border-t transition-colors hover:bg-muted/40">
                  <td className="py-2.5">
                    <span className="flex items-center gap-2.5">
                      <MemberAvatar name={m.full_name} src={m.avatar_url} className="size-7" />
                      <span className="font-medium">{m.full_name}</span>
                    </span>
                  </td>
                  {MEAL_SLOTS.map((k) => (
                    <td key={k} className="px-2 pt-2.5">
                      <MealInput
                        label={`${m.full_name} ${t(`meals.${k}`)}`}
                        value={e[k]}
                        disabled={disabled}
                        onChange={(v) => setValue(m.id, k, v)}
                      />
                    </td>
                  ))}
                  <td className="py-2.5 pr-2 text-right text-base font-semibold">{num(entryTotal(e), 1)}</td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 font-semibold">
              <td className="py-3">{t("meals.dayTotal")}</td>
              {slotTotals.map((v, i) => (
                <td key={i} className="py-3 text-center">{num(v, 1)}</td>
              ))}
              <td className="py-3 pr-2 text-right text-lg text-primary">{num(dayTotal, 1)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Mobile cards */}
      <ul className="grid grid-cols-1 gap-3 px-4 md:hidden">
        {rows.map((m) => {
          const e = draft[m.id] ?? ZERO
          return (
            <li key={m.id} className="rounded-xl border p-3">
              <div className="mb-3 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <MemberAvatar name={m.full_name} src={m.avatar_url} className="size-7" />
                  <span className="font-medium">{m.full_name}</span>
                </span>
                <span className="tabular text-sm">
                  {t("meals.total")}: <strong className="text-base">{num(entryTotal(e), 1)}</strong>
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1">
                {MEAL_SLOTS.map((k) => (
                  <div key={k} className="flex flex-col items-center gap-1">
                    <span className="text-xs text-muted-foreground">{t(`meals.${k}`)}</span>
                    <MealInput
                      label={`${m.full_name} ${t(`meals.${k}`)}`}
                      value={e[k]}
                      disabled={disabled}
                      onChange={(v) => setValue(m.id, k, v)}
                    />
                  </div>
                ))}
              </div>
            </li>
          )
        })}
        <li className="tabular flex items-center justify-between rounded-xl bg-accent px-4 py-3 font-semibold text-accent-foreground">
          <span>{t("meals.dayTotal")}</span>
          <span className="text-lg">{num(dayTotal, 1)}</span>
        </li>
      </ul>

      {canEdit && (
        <div className="sticky bottom-20 z-10 flex items-center justify-end gap-3 border-t bg-card/95 px-4 py-3 backdrop-blur lg:bottom-0 rounded-b-xl">
          {dirty && <Badge variant="outline" className="border-warning/40 text-warning">{t("meals.unsaved")}</Badge>}
          <p className="mr-auto hidden text-xs text-muted-foreground sm:block">{t("meals.extraHint")}</p>
          <Button onClick={save} disabled={saving || !dirty}>
            {saving ? <Loader2 className="animate-spin" /> : <Save />}
            {saving ? t("common.saving") : t("meals.saveMeals")}
          </Button>
        </div>
      )}
    </div>
  )
}
