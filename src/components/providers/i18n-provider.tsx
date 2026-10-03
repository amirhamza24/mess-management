"use client"

import { createContext, useCallback, useContext, useMemo, useState } from "react"
import { LANG_COOKIE, translate, type Lang, type TKey, type TParams } from "@/i18n"
import {
  formatDate,
  formatMoney,
  formatMonth,
  formatNumber,
  formatWeekday,
  localizeDigits,
} from "@/lib/format"

interface I18nContextValue {
  lang: Lang
  setLang: (lang: Lang) => void
  t: (key: TKey, params?: TParams) => string
  money: (value: unknown, opts?: { fixed?: boolean }) => string
  num: (value: unknown, maxFraction?: number) => string
  date: (iso: string, style?: "short" | "long") => string
  weekday: (iso: string) => string
  monthName: (year: number, month: number) => string
  digits: (text: string | number) => string
}

const I18nContext = createContext<I18nContextValue | null>(null)

export function I18nProvider({ initialLang, children }: { initialLang: Lang; children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang)

  const setLang = useCallback((next: Lang) => {
    setLangState(next)
    // Preference only — not sensitive. Cookie lets the server render the right language.
    document.cookie = `${LANG_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`
    document.documentElement.lang = next
  }, [])

  const value = useMemo<I18nContextValue>(
    () => ({
      lang,
      setLang,
      t: (key, params) => translate(lang, key, params),
      money: (value, opts) => formatMoney(value, lang, opts),
      num: (value, maxFraction) => formatNumber(value, lang, maxFraction),
      date: (iso, style) => formatDate(iso, lang, style),
      weekday: (iso) => formatWeekday(iso, lang),
      monthName: (year, month) => formatMonth(year, month, lang),
      digits: (text) => localizeDigits(String(text), lang),
    }),
    [lang, setLang]
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error("useI18n must be used inside <I18nProvider>")
  return ctx
}
