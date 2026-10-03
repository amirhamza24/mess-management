# MessHisab

**Smart Mess Management & Monthly Hisab** — a multi-mess platform to manage meals, bazar, house rent, payments, expenses and the monthly mess হিসাব. Built for bachelor, student and job-holder messes in Bangladesh.

## Features

- **Multiple isolated messes** — each mess has its own manager, members and data; one mess can never see another's.
- **Platform admin** — approve or reject new messes, activate/deactivate them, search & filter all messes, view managers, members and activity.
- **Mess onboarding** — anyone can register and create a mess; it stays *Pending* until an admin approves it.
- **Join requests** — people can register to join an existing mess; that mess's manager approves them and can make anyone a manager or member.
- **Monthly cycles** — start a month with the members staying, add/remove members mid-month, close (lock) and reopen months.
- **Meals**, **Bazar & Food**, **House Rent**, **Other Expenses**, **Payments** (cash, bKash, Nagad, bank) — kept as separate accounts.
- **Monthly হিসাব** — meal rate, rent and other-expense accounts plus each member's settlement (Due / Advance).
- **Reports & PDF**, dashboard charts, বাংলা / English, dark / light mode, mobile layout.

## Setup

Requirements: Node.js 20+ and a PostgreSQL database (local, or Supabase / Neon / any hosted Postgres).

1. Create `.env.local` in the project root with:
   - `DATABASE_URL` — your Postgres connection string. On Supabase use **Connect → Session pooler** (port 5432).
   - `JWT_SECRET` — a long random string.
2. Install, create the tables and (optionally) seed:

   ```bash
   npm install
   npm run db:migrate
   npm run db:seed     # optional: platform admin + a demo mess
   npm run dev
   ```

3. Open http://localhost:3000. Without seeding, the **first account registered becomes the platform admin**.

> A database created by an older version with `prisma db push`: run
> `npx prisma migrate resolve --applied 0_init` once, then `npm run db:migrate`.
> The multi-mess migration keeps existing data (it becomes one active mess).

## How it works

1. **Create a mess** — register, choose *Create a new mess*, fill in the details and confirm. The mess is *Pending*.
2. **Admin approval** — a platform admin approves (or rejects with a reason) from *Pending Approvals*. Until then the accounting modules stay locked.
3. **Members** — others register with *Join an existing mess*; the manager approves them on **Approvals**.
4. **Inactive messes** — an admin can deactivate a mess; its users immediately lose access until it is reactivated.

All of this is enforced on the server for every request — not only in the UI.

## Accounting rules

| | |
|---|---|
| Meal rate | Food expense ÷ Total meals |
| Meal cost | Member meals × Meal rate |
| Other expense share | Total other expenses ÷ active members |
| Total cost | Meal cost + House rent + Other share |
| Balance | Total cost − Paid (positive = **Due**, negative = **Advance**) |

House rent and other expenses never affect the meal rate. The calculation lives in `src/lib/accounting.ts` and is covered by `npm test`.

## Tech

Next.js 16 · React 19 · TypeScript · PostgreSQL + Prisma 7 · jose + bcryptjs auth · Tailwind CSS v4 · shadcn/ui (Base UI) · TanStack Query · React Hook Form + Zod · Recharts · Framer Motion.
