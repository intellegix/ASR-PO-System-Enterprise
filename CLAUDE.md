# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

All commands run from `web/`:

```bash
npm run dev              # Dev server on port 8765
npm run build            # prisma generate + next build
npm run type-check       # tsc --noEmit (strict mode)
npm run lint             # ESLint
npm run test             # Jest (all tests)
npm run test:unit        # jest tests/unit
npm run test:integration # jest tests/integration
npm run test:coverage    # Jest with coverage report

# Database (requires DATABASE_URL)
npm run db:push          # Push schema to database
npm run db:studio        # Prisma Studio GUI
npm run db:seed          # Seed with npx tsx prisma/seed.ts

# Deploy
vercel --prod --yes      # Deploy to Vercel production
```

**Build note**: Production builds skip TypeScript validation (`ignoreBuildErrors: true` in next.config.ts). Always run `npm run type-check` separately to catch TS errors.

## Architecture

**Stack**: Next.js 16.1.1 (App Router) + React 19 + Prisma 5 + PostgreSQL (Neon) + TailwindCSS v3 + NextAuth.js 4

**Monorepo layout**: All application code lives under `web/`. The root also contains planning docs (`po-system-complete-arch.md`, `MASTER-PLAN-STATUS.md`) and legacy deployment configs.

### API Routes (`web/src/app/api/`)

Next.js Route Handlers with a composable middleware pattern:

```
handler → withValidation(handler, zodSchema) → withRateLimit(limit, windowMs)(handler)
```

Every route:
1. Uses `export const dynamic = 'force-dynamic'`
2. Validates with Zod schemas from `@/lib/validation/schemas`
3. Checks auth via `getServerSession(authOptions)`
4. Is wrapped with `withRateLimit()` from `@/lib/validation/middleware`

Key middleware in `src/lib/validation/middleware.ts`:
- `withValidation(handler, { body?, query?, params? })` — Zod validation, returns 400 on failure
- `withRateLimit(maxRequests, windowMs)` — in-memory rate limiting by IP, returns 429

**When adding a new API route**: Follow the existing pattern — define handler as `const`, wrap with validation and rate limiting, export as named HTTP method.

### Authentication

- **NextAuth.js** with JWT strategy (8-hour sessions) configured in `src/lib/auth/config.ts`
- **AuthContext** (`src/contexts/AuthContext.tsx`) syncs NextAuth session to React state with a demo-mode fallback when the backend is unavailable
- Login accepts `identifier` field (not `email`) — auto-appends `@allsurfaceroofing.com` if no `@`
- Session includes: `id`, `email`, `name`, `role`, `divisionId`, `divisionName`, `divisionCode`

### RBAC (`src/lib/auth/permissions.ts`)

Four roles with granular permissions:
- **DIRECTOR_OF_SYSTEMS_INTEGRATIONS** / **MAJORITY_OWNER** — full access
- **DIVISION_LEADER** — create POs for any division, approve/edit only own division
- **OPERATIONS_MANAGER** — create/edit own division only, cannot approve
- **ACCOUNTING** — read-only + export

Key functions: `hasPermission(role, permission)`, `canApprovePO()`, `canEditPO()`, `canCancelPO()`, `getAvailableActions()`

Approval thresholds: OM limit $2,500, owner co-approval required above $25,000.

### State Management

- **Server state**: TanStack React Query 5
- **Client state**: React Context (`AuthContext`)
- No Redux or Zustand

### Provider Stack (`src/app/providers.tsx`)

`SessionProvider` → `QueryProvider` → `AuthProvider` → `PWAProvider`

### Database (`web/prisma/schema.prisma`)

Core models: `users`, `divisions`, `po_headers`, `po_line_items`, `po_approvals`, `vendors`, `work_orders`, `projects`, `clients`, `gl_account_mappings`, `vendor_invoices`, `customer_invoices`

PO status flow: `Draft → Submitted → Approved → Issued → Received → Invoiced → Paid` (can be `Rejected` or `Cancelled` at various stages)

All PO actions are logged to `po_approvals` for audit trail.

## CI Pipeline (`.github/workflows/ci.yml`)

Runs on push to `master` and PRs against `master`. Node 20 (pinned via `.nvmrc`).

| Step | Command | Blocking? |
|------|---------|-----------|
| Type check | `tsc --noEmit` | No (`continue-on-error`) — ~136 pre-existing TS errors |
| Lint | `eslint` | No (`continue-on-error`) — pre-existing lint errors |
| Test | `jest --coverage --passWithNoTests` | No (`continue-on-error`) — 4 failures in `po-number.test.ts` |
| Build | `prisma generate && next build` | **Yes — hard gate** |

**CI env vars**: The build step requires `DATABASE_URL` (valid postgres URL) and `NEXTAUTH_SECRET` (32+ chars, hex-style — the validator rejects strings containing "secret", "password", "test", etc.). Both are set as job-level `env:` with dummy values.

**Making steps blocking**: Remove the `continue-on-error: true` line for each step as its pre-existing errors are cleaned up.

## Deployment

- **Production**: https://web-intellegix.vercel.app (Vercel, intellegix team, Pro plan)
- **Database**: Neon PostgreSQL via Vercel integration
- `postinstall` script runs `prisma generate` (required because Vercel caches node_modules)
- CORS is locked to the production origin in `next.config.ts`
- Security headers (HSTS, CSP, Permissions-Policy) configured in `next.config.ts`

## Gotchas

- **TailwindCSS v3** — use `@tailwind base/components/utilities` directives, NOT v4's `@import "tailwindcss"` (causes `Can't resolve 'fs'` errors)
- **DATABASE_URL on Vercel** can get `\n` appended — verify with `vercel env pull`
- **Rate limiting pattern**: Convert `export async function GET` to `const getHandler = async (request: NextRequest) => { ... }; export const GET = withRateLimit(100, 60000)(getHandler);`
- **NEXTAUTH_SECRET** must be cryptographically secure (use `openssl rand -hex 32`)
- **browser_fill_form** doesn't trigger React state updates — use button clicks that call `setState()` instead
- **After Vercel deploy**, static pages may be cached — use `?_t=timestamp` query param to force fresh load

## Browser Testing

- **ALWAYS use `mcp__browser-bridge__*` tools** for browser automation, NEVER `mcp__claude-in-chrome__*`
- Test through the UI as a user would, not via backend scripts
- Admin login: `intellegix` / credentials visible in login page source
- Demo accounts: `owner1@allsurfaceroofing.com` / `demo123`
- API routes return `{"error":"Unauthorized"}` silently when session is degraded

## Project Planning References

- **Master Plan**: `po-system-complete-arch.md` (87KB, 12 sections)
- **Status Tracker**: `MASTER-PLAN-STATUS.md`
- **Database Backup**: `DATABASE_BACKUP_2026-01-09.md`
- **Data**: 8 users, 10 vendors, 6 divisions, 5 projects ($3.1M total budget)
