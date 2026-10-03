import "server-only"
import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "@prisma/client"
import { Pool } from "pg"

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

function createClient() {
  const url = process.env.DATABASE_URL
  const isLocal = !url || /localhost|127\.0\.0\.1/.test(url)
  const sslDisabled = url?.includes("sslmode=disable")
  const pool = new Pool({
    connectionString: url,
    ssl: isLocal || sslDisabled ? false : { rejectUnauthorized: false },
  })
  return new PrismaClient({ adapter: new PrismaPg(pool) })
}

export const db = globalForPrisma.prisma ?? createClient()

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db
