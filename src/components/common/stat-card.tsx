"use client"

import type { LucideIcon } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { AnimatedNumber } from "./animated-number"

type Tone = "default" | "primary" | "success" | "warning" | "danger"

const TONES: Record<Tone, string> = {
  default: "bg-muted text-muted-foreground",
  primary: "bg-accent text-accent-foreground",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-destructive",
}

export function StatCard({
  icon: Icon,
  label,
  value,
  format,
  hint,
  tone = "default",
  className,
}: {
  icon: LucideIcon
  label: string
  value: number
  format: (n: number) => string
  hint?: React.ReactNode
  tone?: Tone
  className?: string
}) {
  return (
    <Card className={cn("gap-3 p-4 shadow-xs transition-shadow hover:shadow-sm", className)}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[0.8rem] font-medium text-muted-foreground">{label}</p>
        <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg", TONES[tone])}>
          <Icon className="size-4" />
        </span>
      </div>
      <div>
        <p className="tabular truncate text-2xl font-semibold tracking-tight">
          <AnimatedNumber value={value} format={format} />
        </p>
        {hint && <p className="mt-0.5 truncate text-xs text-muted-foreground">{hint}</p>}
      </div>
    </Card>
  )
}

export function StatCardSkeleton() {
  return (
    <Card className="gap-3 p-4 shadow-xs">
      <div className="flex items-start justify-between">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="size-8 rounded-lg" />
      </div>
      <Skeleton className="h-7 w-28" />
    </Card>
  )
}

export function StatGridSkeleton({ count = 4, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("grid grid-cols-2 gap-3 lg:grid-cols-4", className)}>
      {Array.from({ length: count }, (_, i) => (
        <StatCardSkeleton key={i} />
      ))}
    </div>
  )
}
