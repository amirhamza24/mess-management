import { NextResponse, type NextRequest } from "next/server"
import { SESSION_COOKIE } from "@/server/session"

const REASONS = new Set(["ACCOUNT_PENDING", "ACCOUNT_REJECTED", "ACCOUNT_SUSPENDED", "UNAUTHENTICATED"])

// Clears the session cookie (Server Components can't) and returns to /login,
// optionally explaining why (e.g. the account was suspended).
export async function GET(request: NextRequest) {
  const reason = request.nextUrl.searchParams.get("reason")
  const url = new URL("/login", request.url)
  if (reason && REASONS.has(reason)) url.searchParams.set("error", reason)
  const res = NextResponse.redirect(url)
  res.cookies.delete(SESSION_COOKIE)
  return res
}
