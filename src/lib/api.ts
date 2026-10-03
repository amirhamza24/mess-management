import type { Queries } from "@/server/queries"

type QueryResult<K extends keyof Queries> = Awaited<ReturnType<Queries[K]>>
type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string }

/** Error carrying a server error code (see src/server/errors.ts); its message is the code. */
export class ApiError extends Error {
  constructor(public code: string) {
    super(code)
  }
}

/** Calls a server read (src/server/queries.ts). Throws ApiError on failure. */
export async function query<K extends keyof Queries>(name: K, ...args: Parameters<Queries[K]>): Promise<QueryResult<K>> {
  let res: Response
  try {
    res = await fetch(`/api/query/${name}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(args),
      cache: "no-store",
    })
  } catch {
    throw new ApiError("NETWORK")
  }
  const body = (await res.json().catch(() => null)) as ActionResult<QueryResult<K>> | null
  if (!body) throw new ApiError("GENERIC")
  if (!body.ok) {
    if (body.error === "UNAUTHENTICATED" || body.error.startsWith("ACCOUNT_")) {
      // Full navigation: the route handler must clear the httpOnly session cookie.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign(`/auth/signout?reason=${body.error}`)
    }
    throw new ApiError(body.error)
  }
  return body.data
}

/** Unwraps a Server Action result: returns data or throws ApiError(code). */
export async function mutate<T>(promise: Promise<ActionResult<T>>): Promise<T> {
  let result: ActionResult<T>
  try {
    result = await promise
  } catch {
    throw new ApiError("NETWORK")
  }
  if (!result.ok) throw new ApiError(result.error)
  return result.data
}

/** Error code of a Server Action result, or null on success. */
export function errOf(result: ActionResult<unknown>) {
  return result.ok ? null : result.error
}
