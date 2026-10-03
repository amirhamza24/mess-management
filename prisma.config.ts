import { config } from "dotenv"

// Same precedence as Next.js: .env.local overrides .env
config({ path: [".env.local", ".env"], quiet: true })
import { defineConfig } from "prisma/config"

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // For `prisma db push` on Supabase use the session pooler (:5432) URL.
    url: process.env.DATABASE_URL,
  },
})
