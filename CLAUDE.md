@AGENTS.md

# MessHisab

Bangladesh-focused, multi-tenant mess management & monthly accounting SaaS (meals, bazar, house rent, other expenses, payments, settlement). Next.js 16 (App Router) + PostgreSQL via Prisma 7 (`@prisma/adapter-pg`) + own JWT cookie auth (jose + bcryptjs) + TanStack Query + shadcn/ui (Base UI flavour) + Tailwind v4.

## Commands

```bash
npm run dev            # dev server (needs .env.local: DATABASE_URL, JWT_SECRET)
npm run build          # prisma generate + next build (also type-checks)
npm run lint           # eslint (react-hooks v7 rules are strict; prefer useWatch over form.watch)
npm test               # accounting unit tests (node --test, no DB needed)
npx tsc --noEmit       # type-check only
npm run db:migrate     # prisma migrate deploy (prisma/migrations)
npm run db:seed        # super admin + demo mess (prisma/seed.ts, idempotent)
npx next typegen       # regenerate PageProps/RouteContext types after adding routes
```

`prisma.config.ts` loads `.env.local` then `.env`. On Supabase, migrations need the **session pooler (:5432)** URL. Schema changes: edit `schema.prisma`, then add a migration (`npx prisma migrate dev --create-only`, or `prisma migrate diff` + hand-written SQL when existing data must be transformed, like `20261004000000_multi_mess`). Databases created earlier with `db push` were baselined with `prisma migrate resolve --applied 0_init`.

## Architecture

- **Tenancy**: every `Mess` is isolated. `Member` (the mess membership, `@@map("members")`) has `mess_id` + `role` (`manager` | `member`); a user belongs to at most one mess (`user_id` unique). Monthly data hangs off `MonthlyCycle.mess_id`. **Never accept a mess id from the client** — `src/server/context.ts` derives it: `requireMess()` = approved user → membership → mess → status must be `active` (else `NO_MESS` / `MESS_PENDING` / `MESS_INACTIVE` / `MESS_REJECTED`); `requireMessManager()` adds the role check. Any client-sent cycle/member/record id is verified to belong to that mess (`cycleOfMess`, `openCycle(cycleId, messId)`, `memberOfMess`) and answers `NOT_FOUND` otherwise (no leaks).
- **Platform roles**: `User.platform_role` is `super_admin` | `user`. Super admins never belong to a mess; they use `/admin` (`requireSuperAdmin()`), and mess-scoped queries reject them. The first account on an empty database becomes super admin.
- **Mess lifecycle**: `createMess` (any approved user without a mess) creates mess `pending` + the creator's manager membership in one transaction. Super admin: pending → `active` (approve) or `rejected` (with reason); rejected → active; active ⇄ `inactive`. Every change writes a `MessActivity` row (`logActivity`). Mess names are unique case-insensitively via `name_key` (lower-cased, whitespace-collapsed) with a unique index → `MESS_NAME_TAKEN`.
- **Accounts & joining**: registering with intent "create" gives an approved account that lands on `/welcome`; intent "join" picks an active mess (`searchMesses`, public) and waits as `pending` with `requested_mess_id` until that mess's manager approves on `/users` (Approvals). Managers can switch any approved account of their mess between manager and member; the last manager can't be demoted/suspended (`assertNotLastManager(messId, memberId)`). Passwords are reset by managers.
- **Gates**: `src/proxy.ts` only checks the JWT signature. `src/app/(app)/layout.tsx` sends super admins to `/admin`, users without a mess to `/welcome`, non-active messes to `/mess-status`. The client also bounces there when a query/action returns a `MESS_*`/`NO_MESS` code (`src/lib/api.ts`). The server checks are what matter.
- **Reads** go through `src/server/queries.ts` (+ `admin-queries.ts`), exposed by `/api/query/[name]` (Server Functions run one at a time, so reads use a route). Client: `query("name", ...args)` inside TanStack Query hooks. **Writes** are Server Actions in `src/actions/*.ts` wrapped in `run()` → `{ ok, data } | { ok: false, error: CODE }`; client: `errOf(await action())` then `t(errorKey(code))`.
- **Accounting** is one pure function, `computeAccounting` in `src/lib/accounting.ts` (integer paisa / half-meal math, unit tested). Meal rate = food ÷ total meals; rent and other expenses never touch it; other expenses split among *active* monthly members; balance = total cost − paid (positive = due). Read it via `useCycleSummary`; don't duplicate.
- **One payment ledger**: `payments.purpose` is `mess` or `rent`; rent status is derived from rent payments.

## Code layout

- `src/app/(auth)` login/register/forgot; `src/app/(app)` mess pages (thin files rendering `features/*`); `src/app/admin` platform admin; `src/app/welcome` create-mess onboarding; `src/app/mess-status` pending/rejected/inactive screen; `src/app/print/[cycleId]` printable report; `src/app/api/query/[name]` reads; `src/app/auth/signout` cookie clearing.
- `src/server/` server-only: `db.ts`, `session.ts`, `context.ts` (tenant context), `queries.ts`, `admin-queries.ts`, `guards.ts`, `errors.ts`, `serialize.ts`.
- `src/features/<module>/` — page component + `queries.ts`. `features/mess/mess-provider.tsx` holds user, mess, role, cycles, roster and the selected month (`period`, `cycle`, `canEdit`). `features/admin` = admin shell, filters (Popover + Calendar range), `MessTable`, `MessActionsProvider` (confirm → loading → toast for approve/reject/activate/deactivate). `features/mess-setup` = welcome/create-mess + status screens.

## Conventions

- **No hard-coded UI text.** Keys in `src/i18n/en.ts` (source) and `src/i18n/bn.ts` (type-checked to the same shape); `useI18n()` → `t`, `money`, `num`, `date`, `monthName`.
- Zod schemas in `src/lib/validation.ts` use translation keys as messages and are shared by forms and Server Actions.
- Error codes live in `src/server/errors.ts`; map new ones in `src/lib/errors.ts`. Never show raw DB errors.
- Every state-changing admin/mess action needs a confirmation dialog with a loading label ("Approving…") and a success/error toast (sonner).
- UI primitives are shadcn **Base UI**: `render={<Link …/>}` (+ `nativeButton={false}` on `Button`) instead of `asChild`; prefer `components/common/simple-select.tsx`; `ui/combobox.tsx` for async pickers. Adding shadcn components: answer "no" to overwrite prompts (button/input/select sizes are customised).
- Page wrappers use `grid grid-cols-1` so wide tables scroll inside their container.
- Money is `Decimal(12,2)`, meals `Decimal(4,1)`; amounts reach the client as numbers — still pass through `toNumber()`.
- Design tokens (violet brand, slate neutrals, validated chart palette `--chart-1..6`) are in `src/app/globals.css`; dark mode via `.dark` (next-themes).
