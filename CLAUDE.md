@AGENTS.md

# MessHisab

Bangladesh-focused mess management & monthly accounting app (meals, bazar, house rent, other expenses, payments, settlement) for a single mess. Next.js 16 (App Router) + PostgreSQL via Prisma 7 (`@prisma/adapter-pg`) + own JWT cookie auth (jose + bcryptjs) + TanStack Query + shadcn/ui (Base UI flavour) + Tailwind v4.

## Commands

```bash
npm run dev            # dev server (needs .env.local: DATABASE_URL, JWT_SECRET — see .env.example)
npm run build          # prisma generate + next build (also type-checks)
npm run lint           # eslint (react-hooks v7 rules are strict)
npm test               # accounting unit tests (node --test, no DB needed)
npx tsc --noEmit       # type-check only
npm run db:push        # sync prisma/schema.prisma to the DB (no migrations folder)
npm run db:seed        # starter manager/member accounts (prisma/seed.ts, idempotent)
npx next typegen       # regenerate PageProps/RouteContext types after adding routes
```

`prisma.config.ts` loads `.env.local` then `.env`. On Supabase, `db push` needs the **session pooler (:5432)** URL. `prisma/cleanup-old-supabase-schema.sql` removes tables left by the earlier Supabase-auth version.

## Architecture

- **Auth** (`src/server/session.ts`): HS256 JWT holding only the user id in the httpOnly `mh_session` cookie (30 days with "remember me", browser-session otherwise). `getSession()` re-reads role/status from the DB on every request. `src/proxy.ts` only checks the JWT signature (optimistic redirects); `src/app/(app)/layout.tsx` requires an **approved** account; every query and Server Action calls `requireUser()` / `requireManager()` itself — that is the real security boundary. `/auth/signout?reason=…` clears the cookie (Server Components can't).
- **Registration & approval**: the very first account becomes the approved manager; every later registration is `pending` until a manager approves it on `/users` (Approvals). Statuses: pending / approved / rejected / suspended. Managers can switch anyone between manager and member at any time; the last approved manager can't be demoted or suspended (`assertNotLastManager`). Approving links the account to the mess member with the same email, or creates one. Passwords are reset by managers (no email service).
- **Data model** (`prisma/schema.prisma`): fields are snake_case on purpose so serialized rows match `src/lib/types.ts`. `User` (account, role, status) ↔ optional `Member` (person in the mess; can exist without an account). Single mess: `Mess` row with id `"main"`. Each month is a `MonthlyCycle`; monthly rows hang off `monthly_cycle_id`.
- **Reads** go through `src/server/queries.ts`, exposed by the Route Handler `/api/query/[name]` (Server Functions run one at a time, so reads use a route to stay parallel). Client: `query("name", ...args)` from `src/lib/api.ts`, inside TanStack Query hooks (`features/*/queries.ts`). Members only get their own payments, rent and settlement row; contact details are manager-only.
- **Writes** are Server Actions in `src/actions/*.ts`, wrapped in `run()` (`src/server/errors.ts`) so they return `{ ok, data } | { ok: false, error: CODE }` — never throw to the client (production strips messages). Client: `const error = errOf(await action(...))`, then `t(errorKey(error))`. After mutations call `useInvalidateCycle()(cycleId, [qk.x])`.
- **Month rules** (`src/server/guards.ts`): `openCycle` (closed month ⇒ `MONTH_CLOSED`), `assertDateInCycle`, `assertMembersInCycle`. Every monthly mutation must use them.
- **Accounting** is one pure function, `computeAccounting` in `src/lib/accounting.ts` (integer paisa / half-meal math, unit tested). Meal rate = food ÷ total meals; rent and other expenses never touch it; other expenses split equally among *active* monthly members; balance = total cost − paid (positive = due). Never duplicate this math elsewhere — read `useCycleSummary`.
- **One payment ledger**: `payments.purpose` is `mess` or `rent`; rent status is derived from rent payments, `house_rents` stores only the amount owed.

## Code layout

- `src/app/(auth)` login/register/forgot; `src/app/(app)` pages (thin files rendering `features/*`); `src/app/print/[cycleId]` printable report; `src/app/api/query/[name]` reads; `src/app/auth/signout` cookie clearing.
- `src/server/` server-only: `db.ts`, `session.ts`, `queries.ts`, `guards.ts`, `errors.ts`, `serialize.ts` (Decimal → number, `@db.Date` → `YYYY-MM-DD`).
- `src/features/<module>/` — page component + `queries.ts`. `features/mess/mess-provider.tsx` holds user, mess, role, cycles, roster and the **selected month** (`period`, `cycle`, `canEdit`); cycle pages wrap content in `<MonthGate>`. `features/expenses` serves Bazar and Other Expenses via `config.ts`. `features/users` is the Approvals page.

## Conventions

- **No hard-coded UI text.** Keys in `src/i18n/en.ts` (source) and `src/i18n/bn.ts` (type-checked to the same shape); `useI18n()` → `t`, `money`, `num`, `date`, `monthName`. Language persists in the `mh_lang` cookie.
- Zod schemas in `src/lib/validation.ts` use translation keys as messages and are shared by forms and Server Actions.
- Error codes live in `src/server/errors.ts`; map new ones in `src/lib/errors.ts`. Never show raw DB errors.
- UI primitives are shadcn **Base UI**: `render={<Link …/>}` (+ `nativeButton={false}` on `Button`) instead of `asChild`; prefer `components/common/simple-select.tsx`.
- Page wrappers use `grid grid-cols-1` so wide tables scroll inside their container.
- Money is `Decimal(12,2)`, meals `Decimal(4,1)`; amounts reach the client as numbers — still pass through `toNumber()`.
- Design tokens (violet brand, slate neutrals, validated chart palette `--chart-1..6`) are in `src/app/globals.css`; dark mode via `.dark` (next-themes).
