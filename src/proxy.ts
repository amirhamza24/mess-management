import { jwtVerify } from "jose"
import { NextResponse, type NextRequest } from "next/server"

// Optimistic route protection: only checks the session JWT signature.
// Approval status and role are re-checked against the database in the
// (app) layout and in every query / Server Action.

const SESSION_COOKIE = "mh_session"
const AUTH_PAGES = ["/login", "/register", "/forgot-password"]
const PUBLIC_PREFIXES = [...AUTH_PAGES, "/auth", "/api"]

const secret = () =>
  new TextEncoder().encode(process.env.JWT_SECRET || "development-secret-change-me-in-production")

function matches(pathname: string, routes: string[]) {
  return routes.some((r) => pathname === r || pathname.startsWith(`${r}/`))
}

async function hasValidSession(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value
  if (!token) return false
  try {
    await jwtVerify(token, secret(), { algorithms: ["HS256"] })
    return true
  } catch {
    return false
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const authed = await hasValidSession(request)

  if (!authed && !matches(pathname, PUBLIC_PREFIXES)) {
    const url = new URL("/login", request.url)
    if (pathname !== "/") url.searchParams.set("next", pathname)
    return NextResponse.redirect(url)
  }
  if (authed && (pathname === "/" || matches(pathname, AUTH_PAGES))) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }
  return NextResponse.next()
}

export const config = {
  matcher: [
    // Everything except static files and images
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|.*\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)",
  ],
}
