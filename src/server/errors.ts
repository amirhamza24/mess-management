import "server-only"
import { Prisma } from "@prisma/client"

/**
 * Stable error codes returned to the client. They are mapped to translated
 * messages in src/lib/errors.ts — raw database errors are never sent.
 */
export type ErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION"
  | "DUPLICATE"
  | "IN_USE"
  | "MONTH_CLOSED"
  | "MONTH_EXISTS"
  | "DATE_OUTSIDE_MONTH"
  | "MEMBER_NOT_IN_MONTH"
  | "NO_MEMBERS"
  | "LAST_MANAGER"
  | "INVALID_CREDENTIALS"
  | "ACCOUNT_PENDING"
  | "ACCOUNT_REJECTED"
  | "ACCOUNT_SUSPENDED"
  | "EMAIL_TAKEN"
  | "WRONG_PASSWORD"
  | "NO_MESS"
  | "MESS_PENDING"
  | "MESS_INACTIVE"
  | "MESS_REJECTED"
  | "MESS_NAME_TAKEN"
  | "ALREADY_IN_MESS"
  | "MESS_NOT_AVAILABLE"
  | "GENERIC"

export class AppError extends Error {
  constructor(public code: ErrorCode) {
    super(code)
  }
}

export type Result<T> = { ok: true; data: T } | { ok: false; error: ErrorCode }

function toCode(error: unknown): ErrorCode {
  if (error instanceof AppError) return error.code
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") return "DUPLICATE"
    if (error.code === "P2003" || error.code === "P2014") return "IN_USE"
    if (error.code === "P2025") return "NOT_FOUND"
  }
  console.error("[messhisab]", error)
  return "GENERIC"
}

/** Runs a server operation and converts any failure into a safe error code. */
export async function run<T>(fn: () => Promise<T>): Promise<Result<T>> {
  try {
    return { ok: true, data: await fn() }
  } catch (error) {
    return { ok: false, error: toCode(error) }
  }
}
