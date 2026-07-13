# ITECO Product Configurator

Internal web application for configuring gantry-type rollover wash systems (truck and bus washers) built by **ITECO SRL**. Used by engineers, technical sales staff, area managers, and sales agents.

The UI is in Italian.

## What It Does

- Create and manage wash system configurations through a structured form (brushes, pumps, water supply, rails, touch components, HP pumps, wash bays, water tanks)
- Role-based workflow: sales work on **offers** (`DRAFT → PENDING_APPROVAL → APPROVED_TO_SEND → SENT → ACCEPTED`); accepted line configs are handed off to engineering (`DRAFT → SALES_APPROVED → IN_TECH_REVIEW → TECH_APPROVED → CLOSED`); standalone technical configs run a two-state machine (`DRAFT ↔ TECH_APPROVED → CLOSED`)
- Generate a **Bill of Materials (BOM)** from configuration rules, snapshot it for engineering review, allow manual adjustments, and export to Excel
- Sync product data from the TSE ERP (SQL Server)

## Tech Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 16 (App Router), React 19, TypeScript |
| UI | Radix UI, shadcn/ui, Tailwind CSS 4 |
| Forms | React Hook Form + Zod |
| Database | PostgreSQL via Supabase (Drizzle ORM, RLS) |
| Auth | Supabase Auth (JWT, SSR) |
| Testing | Vitest, @testing-library/react, Playwright |
| Linting | Biome |
| Deploy | Vercel (CI via GitHub Actions) |

## Roles & Permissions

| Role | Can Edit | Can See | Config Status Transitions |
|---|---|---|---|
| **SALES** | Own offer configs while the revision is `DRAFT` | Own offers/configs | None — approval happens on the offer revision |
| **SALES_MANAGER** | Same as SALES | Own + direct reports | None — approves offer revisions instead |
| **SALES_DIRECTOR** | Same as SALES | All | None — approves offer revisions instead |
| **ENGINEER** | Standalone configs in `DRAFT`; offer configs in `IN_TECH_REVIEW` | Standalone + handed-off configs (`SALES_APPROVED`+) | OFFER: `SALES_APPROVED ↔ IN_TECH_REVIEW`, `IN_TECH_REVIEW ↔ TECH_APPROVED`; STANDALONE: `DRAFT ↔ TECH_APPROVED` |
| **ADMIN** | Same as ENGINEER, plus full offer access | All | Any transition, including `→ CLOSED` |

`SALES_APPROVED` is a locked hand-off snapshot set only by the offer-acceptance fan-out; `TECH_APPROVED` and `CLOSED` configurations are read-only for all roles. To edit, an ENGINEER/ADMIN moves an offer config to `IN_TECH_REVIEW`, or reopens a standalone config to `DRAFT`.

## Local Setup

### Prerequisites

- Node.js 22+
- A Supabase project (PostgreSQL + Auth)
- Access to the TSE SQL Server (optional, for ERP sync)

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Create a `.env.local` file in the project root:

```env
# Supabase
DATABASE_URL=postgresql://...          # Pooled connection (Supavisor)
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...          # Server-side only; required by `npm run seed`

# TSE ERP sync (optional)
TSE_USER=
TSE_PW=
TSE_SRV=SERVICESQL-001
TSE_DB_NAME=ITECO
```

### 3. Push the database schema

```bash
npm run drizzle:push
```

### Supabase configuration as code

Hosted Supabase service and Auth settings live in `supabase/config.toml`. This
project does not run Supabase locally: development uses a separate hosted Supabase
project, while the application schema and seed data remain owned by Drizzle and
`db/seed.ts`.

To compare the tracked settings with the hosted development project and apply them,
first review `supabase/config.toml`, then run:

```bash
npx supabase login
npx supabase link --project-ref <development-project-ref>
npm run supabase:config:push
```

The link is machine-local (`supabase/.temp/` is ignored), and the CLI displays the
remote diff before asking for confirmation. The canonical Auth Site URL is
`https://config.itecosrl.com`; localhost redirects allow the Next.js development
server to use the hosted development Supabase project.

### 4. Seed the database

```bash
npm run seed
```

This provisions one login account per role (plus the Playwright E2E account); the
shared dev credentials live in `db/seed-constants.ts`. The seed is local-development
only and refuses to run against the production Supabase project.

### 5. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Dev server with Turbopack |
| `npm run build` | Production build |
| `npm run lint` | Biome linter |
| `npm run format` | Biome auto-format |
| `npm run type-check:incremental` | Incremental TypeScript check |
| `npm run test` | Vitest (watch mode) |
| `npm run test:run` | Vitest (CI, single run) |
| `npm run test:e2e` | Playwright E2E tests |
| `npm run seed` | Seed the database |
| `npm run seed:reset` | Reset and reseed the database |
| `npm run drizzle:push` | Push schema to dev database |
| `npm run supabase:config:push` | Push config to the linked Supabase project |
| `npm run erp:sync` | Sync product data from TSE (dev) |
| `npm run erp:sync:prod` | Sync product data from TSE (prod) |
| `npm run review` | On-demand Codex code review of committed branch changes |
| `npm run review:uncommitted` | Codex review including staged, unstaged, and untracked changes |

## Code Review with Codex

`npm run review` runs `codex review --base origin/main` against the current branch and produces a structured **Critical / Important / Nit** report scoped to this project's rules.

Use `npm run review:uncommitted` when you want Codex to include staged, unstaged, and untracked local changes.

### One-time setup (per developer)

```bash
npm i -g @openai/codex
```

Authenticate via one of:

```bash
codex login                      # ChatGPT account (Plus/Pro/Business required)
# or
export OPENAI_API_KEY=sk-...     # add to your shell rc for persistence
```

### Usage

```bash
npm run review
npm run review:uncommitted
```

Findings are advisory — not enforced by CI. Address Critical and Important findings before opening a PR.

## Project Structure

```
app/
  (auth)/           # Login, signup, password recovery
  actions/          # Server Actions (all DB mutations go here)
  configurazioni/   # Configuration list, create, edit, BOM view
  utenti/           # User management (ADMIN only)
components/
  config-form/      # Form sections: brush, pump, water, rail, etc.
  shared/           # SubRecordForm: generic CRUD wrapper for sub-entities
  ui/               # shadcn/ui primitives
db/
  schemas/          # Drizzle ORM table definitions
  queries.ts        # All database query functions
  transformations.ts# Zod ↔ DB null/undefined bridging
lib/
  BOM/              # BOM generation engine and rule sets
  messages.ts       # Centralized Italian UI strings
validation/
  configuration/    # Zod sub-schemas per form section
types/index.ts      # All enums and shared TypeScript types
```

## CI / Deployment

GitHub Actions runs on every push and PR:

1. **Lint** — Biome
2. **Format check** — Biome
3. **Type check** — TypeScript
4. **Tests** — Vitest

On merge to `main`, the workflow deploys to Vercel via the Vercel CLI. Vercel's Git integration is disabled to avoid double-deploys.

Required GitHub secrets: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`.

## Domain Documentation

Detailed rules for domain-specific subsystems live in their own CLAUDE.md files (used by AI-assisted development tooling):

- `lib/BOM/CLAUDE.md` — BOM generation rules, snapshot lifecycle, versioning
- `db/CLAUDE.md` — Database conventions, RLS, error handling
- `app/actions/CLAUDE.md` — Server Action standards
- `.claude/rules/forms.md` — Form architecture rules
- `.claude/rules/workflow.md` — Status machine and role permissions
- `.claude/rules/testing.md` — Testing patterns and mock conventions
