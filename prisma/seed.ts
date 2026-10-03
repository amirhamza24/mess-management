// Creates starter data (idempotent — existing accounts and messes are left untouched):
//   • a platform super admin
//   • an ACTIVE demo mess with a manager and a member
// Run with: npm run db:seed
import { config } from "dotenv"
import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient, type Role } from "@prisma/client"
import bcrypt from "bcryptjs"
import { Pool } from "pg"

config({ path: [".env.local", ".env"], quiet: true })

const url = process.env.DATABASE_URL
if (!url) throw new Error("DATABASE_URL is not set")
const isLocal = /localhost|127\.0\.0\.1/.test(url) || url.includes("sslmode=disable")
const pool = new Pool({ connectionString: url, ssl: isLocal ? false : { rejectUnauthorized: false } })
const db = new PrismaClient({ adapter: new PrismaPg(pool) })

const env = (key: string, fallback: string) => process.env[key] || fallback

async function ensureUser(data: { name: string; email: string; password: string; phone: string; super?: boolean }) {
  const existing = await db.user.findUnique({ where: { email: data.email } })
  if (existing) {
    console.log(`• ${data.email} already exists — skipped`)
    return existing
  }
  const user = await db.user.create({
    data: {
      name: data.name,
      email: data.email,
      phone: data.phone,
      password: bcrypt.hashSync(data.password, 10),
      platform_role: data.super ? "super_admin" : "user",
      status: "approved",
      approved_at: new Date(),
      approved_by: "Seed",
    },
  })
  console.log(`✓ ${data.email} / ${data.password}`)
  return user
}

async function main() {
  const admin = await ensureUser({
    name: "Platform Admin",
    email: env("SEED_ADMIN_EMAIL", "admin@messhisab.com"),
    password: env("SEED_ADMIN_PASSWORD", "Admin@123"),
    phone: "01700000000",
    super: true,
  })
  const manager = await ensureUser({
    name: "Mess Manager",
    email: env("SEED_MANAGER_EMAIL", "manager@messhisab.com"),
    password: env("SEED_MANAGER_PASSWORD", "Manager@123"),
    phone: "01700000001",
  })
  const member = await ensureUser({
    name: "Mess Member",
    email: env("SEED_MEMBER_EMAIL", "member@messhisab.com"),
    password: env("SEED_MEMBER_PASSWORD", "Member@123"),
    phone: "01700000002",
  })

  // Demo mess, only if the manager doesn't belong to a mess yet.
  const membership = await db.member.findUnique({ where: { user_id: manager.id } })
  if (membership) {
    console.log("• demo mess already set up — skipped")
    return
  }
  const name = env("SEED_MESS_NAME", "Green House Bachelor Mess")
  const mess = await db.mess.create({
    data: {
      name,
      name_key: name.trim().replace(/\s+/g, " ").toLowerCase(),
      slug: `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")}-demo`,
      address: "House 12, Road 5, Mirpur, Dhaka",
      status: "active",
      created_by: manager.id,
      approved_by: admin.id,
      approved_at: new Date(),
    },
  })
  const people: { user: typeof manager; role: Role }[] = [
    { user: manager, role: "manager" },
    { user: member, role: "member" },
  ]
  for (const { user, role } of people) {
    if (await db.member.findUnique({ where: { user_id: user.id } })) continue
    await db.member.create({
      data: { mess_id: mess.id, user_id: user.id, role, full_name: user.name, email: user.email, phone: user.phone },
    })
  }
  await db.messActivity.createMany({
    data: [
      { mess_id: mess.id, actor_id: manager.id, actor_name: manager.name, action: "created" },
      { mess_id: mess.id, actor_id: admin.id, actor_name: admin.name, action: "approved" },
    ],
  })
  console.log(`✓ active mess "${name}" with its manager and member`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
    await pool.end()
  })
