import type { Lang } from "@/i18n"

// Bangladesh uses lakh grouping (1,50,000); en-IN gives the same grouping with Latin digits.
const LOCALES: Record<Lang, string> = { en: "en-IN", bn: "bn-BD" }

export function localeOf(lang: Lang) {
  return LOCALES[lang]
}

const numberCache = new Map<string, Intl.NumberFormat>()
function nf(lang: Lang, min: number, max: number) {
  const key = `${lang}-${min}-${max}`
  let f = numberCache.get(key)
  if (!f) {
    f = new Intl.NumberFormat(LOCALES[lang], { minimumFractionDigits: min, maximumFractionDigits: max })
    numberCache.set(key, f)
  }
  return f
}

export function toNumber(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value ?? 0)
  return Number.isFinite(n) ? n : 0
}

/** ৳1,250 or ৳1,250.50 — shows decimals only when they exist. */
export function formatMoney(value: unknown, lang: Lang, opts: { fixed?: boolean } = {}) {
  const n = toNumber(value)
  const formatted = nf(lang, opts.fixed ? 2 : 0, 2).format(Math.abs(n))
  return `${n < 0 ? "-" : ""}৳${formatted}`
}

export function formatNumber(value: unknown, lang: Lang, maxFraction = 2) {
  return nf(lang, 0, maxFraction).format(toNumber(value))
}

/** Converts Latin digits in a string to Bangla digits when needed. */
export function localizeDigits(text: string, lang: Lang) {
  if (lang !== "bn") return text
  return text.replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[Number(d)])
}

// ---- Dates ---------------------------------------------------------------
// Dates are stored as "YYYY-MM-DD" strings and always handled as local dates.

export function parseISODate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number)
  return new Date(y, m - 1, d)
}

export function toISODate(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

export function todayISO() {
  return toISODate(new Date())
}

export function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate()
}

export function monthStartISO(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}-01`
}

export function monthEndISO(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(daysInMonth(year, month)).padStart(2, "0")}`
}

export function isDateInMonth(iso: string, year: number, month: number) {
  return iso >= monthStartISO(year, month) && iso <= monthEndISO(year, month)
}

/** Default date for a form in the given month: today if inside it, else the 1st. */
export function defaultDateForMonth(year: number, month: number) {
  const today = todayISO()
  return isDateInMonth(today, year, month) ? today : monthStartISO(year, month)
}

export function formatMonth(year: number, month: number, lang: Lang) {
  return new Intl.DateTimeFormat(LOCALES[lang], { month: "long", year: "numeric" }).format(
    new Date(year, month - 1, 1)
  )
}

export function formatDate(iso: string, lang: Lang, style: "short" | "long" = "short") {
  return new Intl.DateTimeFormat(LOCALES[lang], {
    day: "2-digit",
    month: style === "long" ? "long" : "short",
    year: "numeric",
  }).format(parseISODate(iso))
}

export function formatWeekday(iso: string, lang: Lang) {
  return new Intl.DateTimeFormat(LOCALES[lang], { weekday: "short" }).format(parseISODate(iso))
}

export function shiftMonth(year: number, month: number, delta: number) {
  const d = new Date(year, month - 1 + delta, 1)
  return { year: d.getFullYear(), month: d.getMonth() + 1 }
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("")
}
