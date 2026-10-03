import type { en } from "./en"

type Widen<T> = { [K in keyof T]: T[K] extends string ? string : Widen<T[K]> }

/** Shape every language dictionary must implement. */
export type Dictionary = Widen<typeof en>

type Paths<T, P extends string = ""> = {
  [K in keyof T & string]: T[K] extends string ? `${P}${K}` : Paths<T[K], `${P}${K}.`>
}[keyof T & string]

/** Dot-separated translation key, e.g. "meals.breakfast". */
export type TKey = Paths<Dictionary>

export type Lang = "en" | "bn"

export type TParams = Record<string, string | number>
