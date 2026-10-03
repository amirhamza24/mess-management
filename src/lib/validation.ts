import { z } from "zod"
import { FOOD_CATEGORIES, MEAL_MAX, OTHER_CATEGORIES, PAYMENT_METHODS, PAYMENT_PURPOSES } from "./constants"

// Error messages are translation keys; <Field> translates them for display,
// so validation messages follow the selected language automatically.

export const BD_PHONE = /^(?:\+?88)?01[3-9]\d{8}$/

const text = (max = 120) => z.string().trim().max(max, "validation.tooLong")
const optionalText = (max = 500) => text(max)

export const emailSchema = z.string().trim().min(1, "validation.required").pipe(z.email("validation.email"))

export const phoneSchema = z.string().trim().min(1, "validation.required").regex(BD_PHONE, "validation.phone")

const optionalPhone = z
  .string()
  .trim()
  .refine((v) => v === "" || BD_PHONE.test(v), "validation.phone")

const optionalEmail = z
  .string()
  .trim()
  .refine((v) => v === "" || z.email().safeParse(v).success, "validation.email")

export const passwordSchema = z.string().min(8, "validation.passwordMin").max(72, "validation.tooLong")

/** Parses a numeric form input (string) into a number; empty → NaN. */
const numeric = z.union([z.string(), z.number()]).transform((v) => (v === "" ? NaN : Number(v)))

/** Money in BDT: positive, at most 2 decimals. */
export const amountSchema = numeric
  .refine((n) => Number.isFinite(n) && n > 0, "validation.amount")
  .refine((n) => n <= 10_000_000, "validation.amountMax")
  .refine((n) => Math.abs(Math.round(n * 100) - n * 100) < 1e-6, "validation.amount")

export const nonNegativeAmountSchema = numeric
  .refine((n) => Number.isFinite(n) && n >= 0, "validation.amountNonNegative")
  .refine((n) => n <= 10_000_000, "validation.amountMax")

export const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "validation.date")

export function isValidMealValue(n: number) {
  return Number.isFinite(n) && n >= 0 && n <= MEAL_MAX && Number.isInteger(n * 2)
}

// ---- Auth ---------------------------------------------------------------

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "validation.required"),
  remember: z.boolean(),
})

export const registerSchema = z
  .object({
    fullName: text().min(2, "validation.nameMin"),
    email: emailSchema,
    phone: phoneSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, "validation.required"),
    /** "create": set up a new mess after signing up; "join": ask an existing mess's manager. */
    intent: z.enum(["create", "join"]),
    messId: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "validation.passwordMatch",
  })
  .refine((v) => v.intent !== "join" || v.messId.length > 0, {
    path: ["messId"],
    message: "validation.chooseMess",
  })

export const forgotSchema = z.object({ email: emailSchema })

export const resetSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string().min(1, "validation.required"),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "validation.passwordMatch",
  })

// ---- Mess / members -----------------------------------------------------

export const messSchema = z.object({
  name: text(80).min(3, "validation.messNameMin"),
  address: text(300).min(5, "validation.addressMin"),
  description: optionalText(500),
})

export const rejectMessSchema = z.object({ reason: optionalText(500) })

export const memberSchema = z.object({
  full_name: text().min(2, "validation.nameMin"),
  email: optionalEmail,
  phone: optionalPhone,
  joined_at: isoDateSchema,
})

export const profileSchema = z.object({
  full_name: text().min(2, "validation.nameMin"),
  phone: optionalPhone,
})

// ---- Money records ------------------------------------------------------

export const foodExpenseSchema = z.object({
  date: isoDateSchema,
  paid_by: z.string(),
  category: z.enum(FOOD_CATEGORIES, { message: "validation.required" }),
  description: optionalText(200),
  amount: amountSchema,
  note: optionalText(),
})

export const otherExpenseSchema = z.object({
  date: isoDateSchema,
  paid_by: z.string(),
  category: z.enum(OTHER_CATEGORIES, { message: "validation.required" }),
  description: optionalText(200),
  amount: amountSchema,
  note: optionalText(),
})

export const paymentSchema = z.object({
  member_id: z.string().min(1, "validation.required"),
  date: isoDateSchema,
  amount: amountSchema,
  payment_method: z.enum(PAYMENT_METHODS, { message: "validation.required" }),
  purpose: z.enum(PAYMENT_PURPOSES, { message: "validation.required" }),
  note: optionalText(),
})

export const rentSchema = z.object({
  amount: nonNegativeAmountSchema,
  note: optionalText(),
})

/** Converts "" to null so optional DB columns stay NULL. */
export function nullIfEmpty(value: string | null | undefined) {
  const v = value?.trim()
  return v ? v : null
}

export const changePasswordSchema = z
  .object({
    current: z.string().min(1, "validation.required"),
    password: passwordSchema,
    confirmPassword: z.string().min(1, "validation.required"),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "validation.passwordMatch",
  })
