"use client"

import { BarChart3 } from "lucide-react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useI18n } from "@/components/providers/i18n-provider"

// Categorical slots (validated palette, see globals.css). Colour follows the entity.
export const SERIES = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)", "var(--chart-6)"]

const AXIS = { fontSize: 11, fill: "var(--muted-foreground)" }

export function ChartCard({
  title,
  description,
  children,
  empty,
}: {
  title: string
  description?: string
  children: React.ReactNode
  empty?: boolean
}) {
  const { t } = useI18n()
  return (
    <Card className="gap-3 shadow-xs">
      <CardHeader>
        <CardTitle className="text-sm">{title}</CardTitle>
        {description && <CardDescription className="text-xs">{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        {empty ? (
          <div className="flex h-56 flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
            <BarChart3 className="size-5" />
            {t("dashboard.noChartData")}
          </div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  )
}

interface TooltipEntry {
  name?: string | number
  value?: unknown
  color?: string
  dataKey?: unknown
  payload?: { fill?: string }
}

function TooltipBox({
  active,
  payload,
  label,
  format,
}: {
  active?: boolean
  payload?: readonly TooltipEntry[]
  label?: unknown
  format: (v: number) => string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="min-w-32 rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
      {label !== undefined && label !== "" && <p className="mb-1 font-medium text-foreground">{String(label)}</p>}
      {payload.map((p) => (
        <div key={String(p.dataKey ?? p.name)} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span className="size-2 rounded-sm" style={{ background: p.payload?.fill ?? p.color }} />
            {p.name}
          </span>
          <span className="tabular font-medium text-foreground">{format(Number(p.value))}</span>
        </div>
      ))}
    </div>
  )
}

/** Share of the month's spending: donut + legend with values. */
export function ExpenseBreakdownChart({ data }: { data: { name: string; value: number; color: string }[] }) {
  const { t, money } = useI18n()
  const total = data.reduce((s, d) => s + d.value, 0)
  const visible = data.filter((d) => d.value > 0)
  return (
    <ChartCard title={t("dashboard.expenseBreakdown")} description={t("dashboard.expenseBreakdownDesc")} empty={total === 0}>
      <div className="grid items-center gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="relative h-52">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={visible}
                dataKey="value"
                nameKey="name"
                innerRadius="62%"
                outerRadius="92%"
                paddingAngle={1.5}
                stroke="var(--card)"
                strokeWidth={2}
                animationDuration={700}
              >
                {visible.map((d) => (
                  <Cell key={d.name} fill={d.color} />
                ))}
              </Pie>
              <Tooltip content={(p) => <TooltipBox active={p.active} payload={p.payload as readonly TooltipEntry[]} label="" format={(v) => money(v)} />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[0.7rem] text-muted-foreground">{t("common.total")}</span>
            <span className="tabular text-base font-semibold">{money(total)}</span>
          </div>
        </div>
        <ul className="grid gap-2 text-sm">
          {visible.map((d) => (
            <li key={d.name} className="flex items-center justify-between gap-3">
              <span className="flex min-w-0 items-center gap-2">
                <span className="size-2.5 shrink-0 rounded-sm" style={{ background: d.color }} />
                <span className="truncate text-muted-foreground">{d.name}</span>
              </span>
              <span className="tabular font-medium">
                {money(d.value)}
                <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                  {total ? Math.round((d.value / total) * 100) : 0}%
                </span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </ChartCard>
  )
}

/** Member-wise meals (single series → no legend; title names it). */
export function MealConsumptionChart({ data }: { data: { name: string; meals: number }[] }) {
  const { t, num } = useI18n()
  return (
    <ChartCard title={t("dashboard.mealConsumption")} description={t("dashboard.mealConsumptionDesc")} empty={!data.some((d) => d.meals > 0)}>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 4, left: -18, bottom: 0 }} barCategoryGap="28%">
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis dataKey="name" tick={AXIS} tickLine={false} axisLine={false} interval={0} tickFormatter={(v: string) => (v.length > 8 ? `${v.slice(0, 7)}…` : v)} />
            <YAxis tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip cursor={{ fill: "var(--muted)", opacity: 0.6 }} content={(p) => <TooltipBox active={p.active} payload={p.payload as readonly TooltipEntry[]} label={p.label} format={(v) => num(v, 1)} />} />
            <Bar dataKey="meals" name={t("accounts.meals")} fill="var(--chart-1)" radius={[4, 4, 0, 0]} maxBarSize={36} animationDuration={700} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  )
}

/** Weekly food vs other expenses — two series, one axis, legend. */
export function ExpenseTrendChart({ data }: { data: { week: string; food: number; other: number }[] }) {
  const { t, money } = useI18n()
  return (
    <ChartCard title={t("dashboard.expenseTrend")} description={t("dashboard.expenseTrendDesc")} empty={!data.some((d) => d.food + d.other > 0)}>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 4, left: -6, bottom: 0 }} barGap={2} barCategoryGap="24%">
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis dataKey="week" tick={AXIS} tickLine={false} axisLine={false} />
            <YAxis tick={AXIS} tickLine={false} axisLine={false} tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))} />
            <Tooltip cursor={{ fill: "var(--muted)", opacity: 0.6 }} content={(p) => <TooltipBox active={p.active} payload={p.payload as readonly TooltipEntry[]} label={p.label} format={(v) => money(v)} />} />
            <Legend iconType="square" iconSize={9} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
            <Bar dataKey="food" name={t("dashboard.food")} fill="var(--chart-1)" radius={[4, 4, 0, 0]} maxBarSize={28} animationDuration={700} />
            <Bar dataKey="other" name={t("dashboard.other")} fill="var(--chart-2)" radius={[4, 4, 0, 0]} maxBarSize={28} animationDuration={700} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  )
}

/** Paid vs due vs advance — status colours, always with text labels. */
export function PaymentOverviewChart({ paid, due, advance }: { paid: number; due: number; advance: number }) {
  const { t, money } = useI18n()
  const rows = [
    { key: "paid", label: t("dashboard.paid"), value: paid, color: "var(--success)" },
    { key: "due", label: t("dashboard.due"), value: due, color: "var(--destructive)" },
    { key: "advance", label: t("dashboard.advance"), value: advance, color: "var(--chart-4)" },
  ]
  const max = Math.max(...rows.map((r) => r.value), 1)
  return (
    <ChartCard title={t("dashboard.paymentOverview")} description={t("dashboard.paymentOverviewDesc")} empty={paid + due + advance === 0}>
      <ul className="grid grid-cols-1 gap-5 py-2">
        {rows.map((r) => (
          <li key={r.key} className="grid gap-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{r.label}</span>
              <span className="tabular font-semibold">{money(r.value)}</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-muted" role="img" aria-label={`${r.label}: ${money(r.value)}`}>
              <div
                className="h-full rounded-full transition-[width] duration-700 ease-out"
                style={{ width: `${(r.value / max) * 100}%`, background: r.color }}
              />
            </div>
          </li>
        ))}
      </ul>
    </ChartCard>
  )
}
