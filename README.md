# MessHisab

**Smart Mess Management & Monthly Hisab** — manage meals, bazar, house rent, payments, expenses and the monthly mess হিসাব in one place. Built for bachelor, student and job-holder messes in Bangladesh.

## Features

- **Accounts with manager approval** — anyone can register, but can only sign in after a manager approves them. Managers can make any user a manager or member at any time, suspend accounts and reset passwords.
- **Two roles** — Manager (full control) and Member (view only), checked on the server for every request.
- **Monthly cycles** — start a month with the members staying, add/remove members mid-month, close (lock) and reopen months.
- **Meals** — breakfast/lunch/dinner with half meals, extra/guest indicator, copy previous day, and a full-month matrix.
- **Bazar & Food**, **House Rent**, **Other Expenses**, **Payments** (cash, bKash, Nagad, bank) — kept as separate accounts.
- **Monthly হিসাব** — meal rate, rent and other-expense accounts plus each member's final settlement (Due / Advance).
- **Reports & PDF**, dashboard charts, বাংলা / English, dark / light mode, mobile layout.

## Setup

Requirements: Node.js 20+ and a PostgreSQL database (local, or Supabase / Neon / any hosted Postgres).

1. Create `.env.local` in the project root with:
   - `DATABASE_URL` — your Postgres connection string. On Supabase use **Connect → Session pooler** (port 5432).
   - `JWT_SECRET` — a long random string.
2. Install and create the tables:

   ```bash
   npm install
   npm run db:push
   npm run db:seed     # optional: starter accounts (see below)
   npm run dev
   ```

3. Open http://localhost:3000.

> Upgrading a Supabase database that ran the earlier Supabase-auth version? Run
> `prisma/cleanup-old-supabase-schema.sql` once in the SQL Editor before `npm run db:push`.

### Starter accounts (`npm run db:seed`)

| Role | Email | Password |
|---|---|---|
| Manager | `manager@messhisab.com` | `Manager@123` |
| Member | `member@messhisab.com` | `Member@123` |

Override them with `SEED_MANAGER_EMAIL`, `SEED_MANAGER_PASSWORD`, `SEED_MEMBER_EMAIL`, `SEED_MEMBER_PASSWORD` in `.env.local`, and change the passwords after first sign-in (Profile → Security). Without seeding, the **first account registered becomes the manager** automatically.

## How accounts work

1. A new person registers → their account is **Pending**.
2. A manager opens **Approvals** (the sidebar shows a badge when someone is waiting) and approves or rejects.
3. On approval the account is linked to the mess member with the same email (or a new member is created).
4. Managers can switch anyone between **Manager** and **Member**, suspend/reactivate accounts, and reset passwords. The last manager can't be removed.

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
