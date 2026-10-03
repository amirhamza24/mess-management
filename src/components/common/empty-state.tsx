import type { LucideIcon } from "lucide-react"
import { Rings } from "@/components/brand/rings"
import { cn } from "@/lib/utils"

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon
  title: React.ReactNode
  description?: React.ReactNode
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center overflow-hidden px-6 py-14 text-center",
        className
      )}
    >
      <div className="relative mb-5 flex size-28 items-center justify-center">
        <Rings size={112} className="inset-0" />
        <span className="relative flex size-12 items-center justify-center rounded-full bg-card text-primary ring-1 ring-border shadow-xs">
          <Icon className="size-5" />
        </span>
      </div>
      <h3 className="text-base font-semibold">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
