import "server-only"
import bcrypt from "bcryptjs"
import { jwtVerify, SignJWT } from "jose"
import { cookies } from "next/headers"
import { cache } from "react"
import { db } from "./db"
import { AppError } from "./errors"

export const SESSION_COOKIE = "mh_session"
const REMEMBER_DAYS = 30
const SESSION_HOURS = 24

if (!process.env.JWT_SECRET && process.env.NODE_ENV === "production") {
  throw new Error("JWT_SECRET environment variable is required in production")
}

export function jwtSecret() {
  return new TextEncoder().encode(process.env.JWT_SECRET || "development-secret-change-me-in-production")
}

export function hashPassword(password: string) {
  return bcrypt.hashSync(password, 10)
}

export function verifyPassword(password: string, hash: string) {
  return bcrypt.compareSync(password, hash)
}

export async function readToken(token: string | undefined) {
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, jwtSecret(), { algorithms: ["HS256"] })
    return typeof payload.sub === "string" ? payload.sub : null
  } catch {
    return null
  }
}

/** Issues the httpOnly session cookie. Without "remember me" it lasts until the browser closes. */
export async function startSession(userId: string, remember: boolean) {
  const lifetime = remember ? `${REMEMBER_DAYS}d` : `${SESSION_HOURS}h`
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(lifetime)
    .sign(jwtSecret())
  const store = await cookies()
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    ...(remember ? { maxAge: REMEMBER_DAYS * 24 * 60 * 60 } : {}),
  })
}

export async function endSession() {
  const store = await cookies()
  store.delete(SESSION_COOKIE)
}

export interface SessionUser {
  id: string
  name: string
  email: string
  phone: string | null
  platform_role: "super_admin" | "user"
  status: "pending" | "approved" | "rejected" | "suspended"
}

/**
 * Current user, re-read from the database on every request so approval,
 * suspension and role changes take effect immediately.
 */
export const getSession = cache(async (): Promise<SessionUser | null> => {
  const store = await cookies()
  const userId = await readToken(store.get(SESSION_COOKIE)?.value)
  if (!userId) return null
  return db.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, phone: true, platform_role: true, status: true },
  })
})

export async function requireUser() {
  const user = await getSession()
  if (!user) throw new AppError("UNAUTHENTICATED")
  if (user.status === "pending") throw new AppError("ACCOUNT_PENDING")
  if (user.status === "rejected") throw new AppError("ACCOUNT_REJECTED")
  if (user.status === "suspended") throw new AppError("ACCOUNT_SUSPENDED")
  return user
}

export async function requireSuperAdmin() {
  const user = await requireUser()
  if (user.platform_role !== "super_admin") throw new AppError("FORBIDDEN")
  return user
}
