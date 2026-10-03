"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"

export interface Option {
  value: string
  label: React.ReactNode
}

// The Select primitive treats null as "no selection", so an explicit "" option
// (e.g. "All") is mapped to a sentinel internally.
const EMPTY = "__empty__"
const toInner = (v: string) => (v === "" ? EMPTY : v)
const toOuter = (v: string) => (v === EMPTY ? "" : v)

/** Thin wrapper over the Select primitive for plain value/label options. */
export function SimpleSelect({
  value,
  onChange,
  options,
  placeholder,
  id,
  invalid,
  disabled,
  className,
}: {
  value: string
  onChange: (value: string) => void
  options: Option[]
  placeholder?: string
  id?: string
  invalid?: boolean
  disabled?: boolean
  className?: string
}) {
  const hasEmptyOption = options.some((o) => o.value === "")
  const items = options.map((o) => ({ value: toInner(o.value), label: o.label }))
  return (
    <Select
      value={value === "" && !hasEmptyOption ? null : toInner(value)}
      onValueChange={(v) => onChange(toOuter((v as string | null) ?? ""))}
      items={items}
      disabled={disabled}
    >
      <SelectTrigger id={id} aria-invalid={invalid || undefined} className={cn("w-full", className)}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {items.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
