"use client"

import { useQuery } from "@tanstack/react-query"
import { Building2, Loader2 } from "lucide-react"
import { useEffect, useState } from "react"
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox"
import { useI18n } from "@/components/providers/i18n-provider"
import { query } from "@/lib/api"

interface MessOption {
  id: string
  name: string
  address: string
}

function useDebounced<T>(value: T, delay = 250) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delay)
    return () => window.clearTimeout(id)
  }, [value, delay])
  return debounced
}

/** Searchable picker of ACTIVE messes (server-side search, names only). */
export function MessPicker({
  id,
  value,
  onChange,
  invalid,
}: {
  id?: string
  value: string
  onChange: (messId: string) => void
  invalid?: boolean
}) {
  const { t } = useI18n()
  const [input, setInput] = useState("")
  const [selected, setSelected] = useState<MessOption | null>(null)
  const term = useDebounced(input.trim())
  const enabled = term.length >= 2 && term !== selected?.name

  const results = useQuery({
    queryKey: ["mess-search", term],
    queryFn: () => query("searchMesses", term),
    enabled,
    staleTime: 30_000,
  })
  const items = enabled ? (results.data ?? []) : selected ? [selected] : []

  return (
    <Combobox<MessOption>
      items={items}
      filter={null}
      value={value && selected?.id === value ? selected : null}
      itemToStringLabel={(m) => m.name}
      onInputValueChange={setInput}
      onValueChange={(m) => {
        setSelected(m)
        onChange(m?.id ?? "")
      }}
    >
      <ComboboxInput id={id} placeholder={t("auth.searchMess")} aria-invalid={invalid || undefined} className="w-full" />
      <ComboboxContent>
        <ComboboxEmpty>
          <span className="flex items-center gap-2 px-3 py-2.5 text-sm text-muted-foreground">
            {results.isFetching ? (
              <>
                <Loader2 className="size-3.5 animate-spin" /> {t("auth.searching")}
              </>
            ) : term.length < 2 ? (
              t("auth.typeToSearch")
            ) : (
              t("auth.noMessFound")
            )}
          </span>
        </ComboboxEmpty>
        <ComboboxList>
          {(m: MessOption) => (
            <ComboboxItem key={m.id} value={m}>
              <Building2 className="text-muted-foreground" />
              <span className="flex min-w-0 flex-col">
                <span className="truncate font-medium">{m.name}</span>
                <span className="truncate text-xs text-muted-foreground">{m.address}</span>
              </span>
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  )
}
