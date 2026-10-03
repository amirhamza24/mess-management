"use server"

import { z } from "zod"
import { db } from "@/server/db"
import { AppError, run } from "@/server/errors"
import { nullIfEmpty, parse } from "@/server/guards"
import { DEFAULT_MESS_NAME } from "@/server/queries"
import { endSession, hashPassword, requireUser, startSession, verifyPassword } from "@/server/session"
import { loginSchema, passwordSchema, profileSchema, registerSchema } from "@/lib/validation"

/**
 * Sign in. Only approved accounts get a session; pending, rejected and
 * suspended accounts receive a specific error code instead.
 */
export async function login(values: z.input<typeof loginSchema>) {
  return run(async () => {
    const { email, password, remember } = parse(loginSchema, values)
    const user = await db.user.findUnique({ where: { email: email.toLowerCase() } })
    if (!user || !verifyPassword(password, user.password)) throw new AppError("INVALID_CREDENTIALS")
    if (user.status === "pending") throw new AppError("ACCOUNT_PENDING")
    if (user.status === "rejected") throw new AppError("ACCOUNT_REJECTED")
    if (user.status === "suspended") throw new AppError("ACCOUNT_SUSPENDED")
    await startSession(user.id, remember)
    return { role: user.role }
  })
}

/**
 * Register. The very first account becomes the approved manager (bootstrap);
 * everyone after that waits as `pending` until a manager approves them.
 */
export async function register(values: z.input<typeof registerSchema>) {
  return run(async () => {
    const data = parse(registerSchema, values)
    const email = data.email.toLowerCase()
    if (await db.user.findUnique({ where: { email } })) throw new AppError("EMAIL_TAKEN")

    const isFirst = (await db.user.count()) === 0
    const user = await db.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          name: data.fullName,
          email,
          phone: data.phone,
          password: hashPassword(data.password),
          role: isFirst ? "manager" : "member",
          status: isFirst ? "approved" : "pending",
          approved_at: isFirst ? new Date() : null,
          approved_by: isFirst ? "System" : null,
        },
      })
      if (isFirst) {
        await tx.mess.upsert({ where: { id: "main" }, create: { name: DEFAULT_MESS_NAME }, update: {} })
        await tx.member.create({
          data: { user_id: created.id, full_name: data.fullName, email, phone: data.phone },
        })
      }
      return created
    })

    if (isFirst) await startSession(user.id, true)
    return { status: user.status }
  })
}

export async function logout() {
  await endSession()
  return { ok: true as const, data: null }
}

export async function updateProfile(values: z.input<typeof profileSchema>) {
  return run(async () => {
    const user = await requireUser()
    const data = parse(profileSchema, values)
    await db.user.update({
      where: { id: user.id },
      data: { name: data.full_name, phone: nullIfEmpty(data.phone) },
    })
    return null
  })
}

const changePasswordSchema = z.object({ current: z.string().min(1), password: passwordSchema })

export async function changePassword(values: z.input<typeof changePasswordSchema>) {
  return run(async () => {
    const session = await requireUser()
    const { current, password } = parse(changePasswordSchema, values)
    const user = await db.user.findUniqueOrThrow({ where: { id: session.id } })
    if (!verifyPassword(current, user.password)) throw new AppError("WRONG_PASSWORD")
    await db.user.update({ where: { id: user.id }, data: { password: hashPassword(password) } })
    return null
  })
}
