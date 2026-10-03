import "server-only"
import { Prisma } from "@prisma/client"

// Columns stored as SQL `date` — sent as "YYYY-MM-DD" (no time zone shifts).
const DATE_ONLY = new Set(["date", "joined_at", "left_at"])

type Serialized<T> = T extends Prisma.Decimal
  ? number
  : T extends Date
    ? string
    : T extends (infer U)[]
      ? Serialized<U>[]
      : T extends object
        ? { [K in keyof T]: Serialized<T[K]> }
        : T

/** Decimal → number, Date → ISO string (date-only columns → YYYY-MM-DD). */
export function serialize<T>(value: T, key?: string): Serialized<T> {
  if (value instanceof Prisma.Decimal) return value.toNumber() as Serialized<T>
  if (value instanceof Date) {
    const iso = value.toISOString()
    return (key && DATE_ONLY.has(key) ? iso.slice(0, 10) : iso) as Serialized<T>
  }
  if (Array.isArray(value)) return value.map((v) => serialize(v)) as Serialized<T>
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value)) out[k] = serialize(v, k)
    return out as Serialized<T>
  }
  return value as Serialized<T>
}

/** "YYYY-MM-DD" → Date at UTC midnight, for `@db.Date` columns. */
export function toDbDate(iso: string) {
  return new Date(`${iso}T00:00:00.000Z`)
}

export function monthRange(year: number, month: number) {
  const pad = (n: number) => String(n).padStart(2, "0")
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate()
  return { start: `${year}-${pad(month)}-01`, end: `${year}-${pad(month)}-${pad(last)}` }
}
