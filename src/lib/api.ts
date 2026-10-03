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
    // Full navigations: the session/mess state changed underneath the page.
    /* eslint-disable @next/next/no-location-assign-relative-destination */
    if (body.error === "UNAUTHENTICATED" || body.error.startsWith("ACCOUNT_")) {
      // The route handler must clear the httpOnly session cookie.
      window.location.assign(`/auth/signout?reason=${body.error}`)
    } else if (body.error.startsWith("MESS_") && body.error !== "MESS_NAME_TAKEN" && body.error !== "MESS_NOT_AVAILABLE") {
      window.location.assign("/mess-status")
    } else if (body.error === "NO_MESS") {
      window.location.assign("/welcome")
    }
    /* eslint-enable @next/next/no-location-assign-relative-destination */
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

const BLOCKED_MESS = new Set(["MESS_PENDING", "MESS_INACTIVE", "MESS_REJECTED"])

/**
 * Error code of a Server Action result, or null on success. When the mess was
 * blocked meanwhile (e.g. deactivated), callers still toast the message and the
 * page then moves to the mess status screen.
 */
export function errOf(result: ActionResult<unknown>) {
  if (result.ok) return null
  if (typeof window !== "undefined" && BLOCKED_MESS.has(result.error)) {
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.setTimeout(() => window.location.assign("/mess-status"), 1800)
  }
  return result.error
}
