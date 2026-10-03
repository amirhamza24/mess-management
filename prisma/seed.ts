// Creates the starter accounts (idempotent — existing accounts are left untouched).
// Run with: npm run db:seed
import { config } from "dotenv"
import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient, type Role, type UserStatus } from "@prisma/client"
import bcrypt from "bcryptjs"
import { Pool } from "pg"

config({ path: [".env.local", ".env"], quiet: true })

const url = process.env.DATABASE_URL
if (!url) throw new Error("DATABASE_URL is not set")
const isLocal = /localhost|127\.0\.0\.1/.test(url) || url.includes("sslmode=disable")
const pool = new Pool({ connectionString: url, ssl: isLocal ? false : { rejectUnauthorized: false } })
const db = new PrismaClient({ adapter: new PrismaPg(pool) })

const accounts: { name: string; email: string; password: string; phone: string; role: Role; status: UserStatus }[] = [
  {
    name: "Mess Manager",
    email: process.env.SEED_MANAGER_EMAIL || "manager@messhisab.com",
    password: process.env.SEED_MANAGER_PASSWORD || "Manager@123",
    phone: "01700000001",
    role: "manager",
    status: "approved",
  },
  {
    name: "Mess Member",
    email: process.env.SEED_MEMBER_EMAIL || "member@messhisab.com",
    password: process.env.SEED_MEMBER_PASSWORD || "Member@123",
    phone: "01700000002",
    role: "member",
    status: "approved",
  },
]

async function main() {
  await db.mess.upsert({
    where: { id: "main" },
    create: { name: process.env.SEED_MESS_NAME || "Green House Bachelor Mess", address: "Mirpur, Dhaka" },
    update: {},
  })

  for (const a of accounts) {
    const existing = await db.user.findUnique({ where: { email: a.email } })
    if (existing) {
      console.log(`• ${a.email} already exists — skipped`)
      continue
    }
    const user = await db.user.create({
      data: {
        name: a.name,
        email: a.email,
        phone: a.phone,
        password: bcrypt.hashSync(a.password, 10),
        role: a.role,
        status: a.status,
        approved_at: new Date(),
        approved_by: "Seed",
      },
    })
    await db.member.upsert({
      where: { email: a.email },
      create: { user_id: user.id, full_name: a.name, email: a.email, phone: a.phone },
      update: { user_id: user.id },
    })
    console.log(`✓ ${a.role.padEnd(7)} ${a.email} / ${a.password}`)
  }
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
