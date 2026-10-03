import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

export function TableSkeleton({ rows = 6, cols = 5, className }: { rows?: number; cols?: number; className?: string }) {
  return (
    <div className={cn("overflow-hidden", className)} aria-hidden>
      <div className="flex gap-4 border-b bg-muted/40 px-4 py-3">
        {Array.from({ length: cols }, (_, i) => (
          <Skeleton key={i} className={cn("h-3.5", i === 0 ? "w-32" : "flex-1")} />
        ))}
      </div>
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className="flex items-center gap-4 border-b px-4 py-3.5 last:border-0">
          {Array.from({ length: cols }, (_, c) => (
            <Skeleton
              key={c}
              className={cn("h-4", c === 0 ? "w-32" : "flex-1")}
              style={{ opacity: 1 - r * 0.08 }}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

export function ChartSkeleton({ className }: { className?: string }) {
  const bars = [40, 65, 50, 80, 35, 70, 55]
  return (
    <Card className={cn("gap-4 p-4 shadow-xs", className)} aria-hidden>
      <div className="space-y-2">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-3 w-48" />
      </div>
      <div className="flex h-48 items-end gap-3 px-2">
        {bars.map((h, i) => (
          <Skeleton key={i} className="flex-1 rounded-b-none" style={{ height: `${h}%` }} />
        ))}
      </div>
    </Card>
  )
}

/** Mirrors the meal matrix: sticky name column + day columns. */
export function MatrixSkeleton({ rows = 5, days = 14 }: { rows?: number; days?: number }) {
  return (
    <div className="overflow-hidden" aria-hidden>
      {Array.from({ length: rows + 1 }, (_, r) => (
        <div key={r} className={cn("flex items-center gap-2 border-b px-3 py-3", r === 0 && "bg-muted/40")}>
          <Skeleton className="h-4 w-28 shrink-0" />
          {Array.from({ length: days }, (_, c) => (
            <Skeleton key={c} className="h-4 w-8 shrink-0" />
          ))}
        </div>
      ))}
    </div>
  )
}

export function FormSkeleton({ fields = 4 }: { fields?: number }) {
  return (
    <div className="grid gap-5" aria-hidden>
      {Array.from({ length: fields }, (_, i) => (
        <div key={i} className="grid gap-2">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-9 w-full" />
        </div>
      ))}
      <Skeleton className="h-9 w-28" />
    </div>
  )
}

export function CardListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-3" aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-lg border p-3">
          <Skeleton className="size-9 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-5 w-16" />
        </div>
      ))}
    </div>
  )
}
