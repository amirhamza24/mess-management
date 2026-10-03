import { cn } from "@/lib/utils"

/** MessHisab mark: a ring circle around the Taka sign. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "relative inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-deep text-white shadow-sm shadow-primary/20",
        className
      )}
      aria-hidden
    >
      <svg viewBox="0 0 40 40" className="absolute inset-0 size-full">
        <circle cx="20" cy="20" r="13.5" fill="none" stroke="currentColor" strokeOpacity="0.35" strokeWidth="1.25" />
        <circle cx="20" cy="20" r="9" fill="none" stroke="currentColor" strokeOpacity="0.9" strokeWidth="1.5" />
      </svg>
      <span className="relative text-[0.8rem] leading-none font-bold">৳</span>
    </span>
  )
}

export function Logo({ className, tagline }: { className?: string; tagline?: string }) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <LogoMark />
      <span className="flex min-w-0 flex-col">
        <span className="text-[0.95rem] leading-tight font-semibold tracking-tight">MessHisab</span>
        {tagline && <span className="truncate text-[0.7rem] leading-tight text-muted-foreground">{tagline}</span>}
      </span>
    </span>
  )
}
