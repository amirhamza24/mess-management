import { cn } from "@/lib/utils"

/**
 * Decorative "Ring Circle" motif used across the app (auth, dashboard hero,
 * empty and loading states). Purely visual: hidden from assistive tech and
 * never captures pointer events. Animations respect prefers-reduced-motion.
 */
export function Rings({
  className,
  size = 520,
  intensity = "subtle",
  tone = "primary",
}: {
  className?: string
  size?: number
  intensity?: "subtle" | "medium"
  tone?: "primary" | "light"
}) {
  const o = intensity === "medium" ? 1 : 0.65
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute select-none",
        tone === "light" ? "text-white" : "text-primary",
        className
      )}
      style={{ width: size, height: size }}
    >
      {/* Large outer ring — dashed, slow rotation */}
      <svg viewBox="0 0 200 200" className="animate-ring-spin-slow absolute inset-0 size-full">
        <circle cx="100" cy="100" r="97" fill="none" stroke="currentColor" strokeOpacity={0.18 * o} strokeWidth="0.6" strokeDasharray="2 5" />
        <circle cx="100" cy="3" r="1.6" fill="currentColor" fillOpacity={0.45 * o} />
      </svg>
      {/* Medium ring — reverse rotation with an orbiting dot */}
      <svg viewBox="0 0 200 200" className="animate-ring-spin-reverse absolute inset-[14%] size-[72%]">
        <circle cx="100" cy="100" r="96" fill="none" stroke="currentColor" strokeOpacity={0.22 * o} strokeWidth="0.8" />
        <circle cx="196" cy="100" r="2.4" fill="currentColor" fillOpacity={0.5 * o} />
      </svg>
      {/* Small ring — gentle pulse */}
      <svg
        viewBox="0 0 200 200"
        className="animate-ring-pulse absolute inset-[31%] size-[38%]"
        style={{ ["--ring-opacity" as string]: "1" }}
      >
        <circle cx="100" cy="100" r="98" fill="none" stroke="currentColor" strokeOpacity={0.3 * o} strokeWidth="1.2" />
        <circle cx="100" cy="100" r="58" fill="currentColor" fillOpacity={0.05 * o} />
      </svg>
    </div>
  )
}

/** Small spinning ring used for contextual loading states. */
export function RingLoader({ className, label }: { className?: string; label?: string }) {
  return (
    <div role="status" className={cn("flex flex-col items-center justify-center gap-3 text-muted-foreground", className)}>
      <span className="relative size-10">
        <span className="absolute inset-0 rounded-full border-2 border-primary/15" />
        <span className="animate-ring-spin absolute inset-0 rounded-full border-2 border-transparent border-t-primary [animation-duration:900ms]" />
        <span className="animate-ring-pulse absolute inset-2.5 rounded-full bg-primary/10" />
      </span>
      {label && <span className="text-sm">{label}</span>}
    </div>
  )
}
