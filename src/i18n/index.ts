import { bn } from "./bn"
import { en } from "./en"
import type { Dictionary, Lang, TKey, TParams } from "./types"

export type { Dictionary, Lang, TKey, TParams } from "./types"

export const LANG_COOKIE = "mh_lang"
export const DEFAULT_LANG: Lang = "en"
export const LANGS: Lang[] = ["en", "bn"]

export const dictionaries: Record<Lang, Dictionary> = { en, bn }

export function isLang(value: unknown): value is Lang {
  return value === "en" || value === "bn"
}

export function translate(lang: Lang, key: TKey, params?: TParams): string {
  const lookup = (dict: Dictionary) =>
    key.split(".").reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], dict)

  let value = lookup(dictionaries[lang]) ?? lookup(en as Dictionary)
  if (typeof value !== "string") return key
  if (params) {
    value = value.replace(/\{(\w+)\}/g, (match, name: string) =>
      name in params ? String(params[name]) : match
    )
  }
  return value as string
}
