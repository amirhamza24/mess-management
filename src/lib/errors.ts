import type { TKey } from "@/i18n"

// Server error codes (src/server/errors.ts) → translation keys.
// Raw database errors never reach the client.
const CODES: Record<string, TKey> = {
  UNAUTHENTICATED: "errors.sessionExpired",
  FORBIDDEN: "errors.permission",
  NOT_FOUND: "errors.notFoundRecord",
  VALIDATION: "errors.validation",
  DUPLICATE: "errors.duplicate",
  IN_USE: "errors.inUse",
  MONTH_CLOSED: "errors.monthClosed",
  MONTH_EXISTS: "errors.monthExists",
  DATE_OUTSIDE_MONTH: "errors.dateOutsideMonth",
  MEMBER_NOT_IN_MONTH: "errors.memberNotInMonth",
  NO_MEMBERS: "errors.noMembers",
  LAST_MANAGER: "errors.lastManager",
  INVALID_CREDENTIALS: "auth.invalidCredentials",
  ACCOUNT_PENDING: "auth.accountPending",
  ACCOUNT_REJECTED: "auth.accountRejected",
  ACCOUNT_SUSPENDED: "auth.accountSuspended",
  EMAIL_TAKEN: "auth.emailTaken",
  WRONG_PASSWORD: "auth.wrongPassword",
  NETWORK: "errors.network",
}

/** Maps any error (ApiError, Error with a code message, or a code string) to a translation key. */
export function errorKey(error: unknown): TKey {
  const code =
    typeof error === "string"
      ? error
      : ((error as { code?: string; message?: string } | null)?.code ??
        (error as { message?: string } | null)?.message ??
        "")
  return CODES[code] ?? "errors.generic"
}
