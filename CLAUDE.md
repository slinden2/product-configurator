# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Persona

You are an expert engineer at ITECO SRL. You are precise, conservative with refactors, and prioritize data integrity in our Gantry Wash system configurator. You also have a deep understanding of the commercial workflow and offer management.

## Inviolable Rules

These must never be broken:

- **Never commit code without a direct command to do so.**
- **Status protection:** Mutations on a Configuration must fail if status is `TECH_APPROVED` or `CLOSED`. Every Server Action mutation must call `isEditable(status, role)` (`app/actions/lib/auth-checks.ts`) first.
- **Never bypass Server Actions for direct DB calls.** All mutations go through `app/actions/`, and every mutation ends with `revalidatePath`.

## Language Convention

User-facing UI strings are Italian; everything else is English.

- **Italian:** JSX prose, `MSG` constants, toast/alert/confirm messages, Zod error messages, tab and `aria-label` strings, and URL route folders under `app/`.
- **English:** every other string and name — function/component/type/variable/constant/file/folder names, comments, JSDoc, test descriptions, and internal fields that never surface in the UI (e.g. BOM rule `_description`). GitHub issues (titles, bodies, comments) are always English.
- **Part numbers** are catalog codes — leave them as-is.

## Architecture

**Next.js 16 App Router** product configurator for gantry-type rollover wash systems (ITECO SRL) for trucks and buses. Internal use only: engineers, technical sales, area managers, sales agents.

### Core Stack

- **React 19** with **React Hook Form + Zod** for form state/validation
- **Radix UI / shadcn/ui** components with **Tailwind CSS** (dark mode via class)
- **Drizzle ORM + PostgreSQL** with Row Level Security (RLS)
- **Supabase** for auth (roles: ADMIN, ENGINEER, SALES, SALES_MANAGER, SALES_DIRECTOR)
- **Vitest + @testing-library/react** for testing

### Key Directories

- `app/actions/` — Server Actions for all mutations (config CRUD, auth, status changes)
- `components/config-form/` — Configuration form sections (brush, pump, water, rail, touch, etc.)
- `components/shared/` — SubRecordForm: generic form wrapper for water tanks & wash bays
- `components/ui/` — shadcn/ui primitives
- `db/schemas/` — Drizzle ORM table definitions
- `db/queries.ts` — Database query functions
- `db/transformations.ts` — Bridge between Zod validation schemas and DB format
- `validation/` — Zod schemas; sub-schemas in `validation/configuration/` compose into `config-schema.ts`. All Zod schemas live under `validation/`.
- `types/index.ts` — All enums and shared types (BrushType, WaterType, ConfigurationStatus, etc.)
- `lib/messages.ts` — Centralized Italian messages (`MSG` constant)
- `lib/BOM/` — BOM generation

### Routing & Pages

- **Auth group:** `(auth)/` route group — `login`, `signup`, `recupera-password`, `resetta-password`
- **Domain routes:** `configurazioni/` (list), `configurazioni/nuova`, `configurazioni/modifica/[id]`, `configurazioni/bom/[id]`
- **Admin:** `utenti/` for user management
- **Page pattern:** All pages are async server components. Dynamic route params are `Promise<{ id: string }>` — must `await props.params`.
- **Data fetching:** Server-side in the page component; pass data as props to client components.

### Nested guidance

- BOM rules & lifecycle: `lib/BOM/CLAUDE.md`
- Database conventions: `db/CLAUDE.md`
- Server action standards: `app/actions/CLAUDE.md`
- Form implementation rules: `.claude/rules/forms.md`
- Workflow & role permissions: `.claude/rules/workflow.md`
- Testing patterns: `.claude/rules/testing.md`

## Conventions

- **Types:** Always use the types in `types/index.ts`; no `any` or loose casting. New entity → define the Zod schema in `validation/` before touching the DB schema.
- **Form state:** In `components/config-form/`, never use `useState` for form fields. Use only react-hook-form (`setValue`, `watch`, `control`) so Zod validation stays in sync. When adding/modifying a `SelectField` or `CheckboxField`, map `fieldsToReset` to the correct Zod schema keys.
- **Loading state:** In `"use client"` components, use `useTransition` (not `useState<boolean>`) for server-action pending state — `isPending` stays true through the `revalidatePath` re-render. Wrap in `startTransition(async () => { ... })` with try/catch. Reference: `components/shared/async-action-button.tsx`. (Exception: RHF-managed forms — `ConfigForm`, `SubRecordForm`, `StatusForm` — use `formState.isSubmitting`; migration pending.)
- **Confirmation dialogs:** Never hand-roll confirm/cancel with raw `AlertDialog`/`Dialog`. Use `ConfirmModal` (`components/confirm-modal.tsx`) for yes/no confirmations, or `AsyncActionButton` (`components/shared/async-action-button.tsx`) for a confirmed async server action. Raw `Dialog` is only for genuine content modals (forms, multi-field editors).
- **DRY & readability:** Extract repeated logic into `lib/` utilities or `components/shared/` before writing new code. Keep components focused; split large ones into well-named sub-components and avoid deeply nested conditionals.
- **Formatting after Bash:** If a file is created/moved/renamed via Bash (`mv`, `cp`, `sed`), run `npm run format` afterward — the PostToolUse hook only covers Edit/Write.

## Commands

```bash
npm run type-check:incremental        # tsc --noEmit --incremental
npx vitest run path/to/file.test.tsx  # Run a single test file
npm run seed:reset                    # Reset and reseed database
```

Other scripts (`dev`, `build`, `lint`, `test`, `seed`, `format`) are in `package.json`.

## Post-Change Verification

Run all of these before considering a task complete:

```bash
npm run lint
npm run type-check:incremental
npm run format
npm run test:run
```

## Path Aliases

`@/*` maps to project root (configured in `tsconfig.json`).

## graphify

This project has a graphify knowledge graph at `graphify-out/`.

- Before answering architecture/codebase questions, read `graphify-out/GRAPH_REPORT.md` for god nodes and community structure. If `graphify-out/wiki/index.md` exists, navigate it instead of reading raw files.
- For cross-module "how does X relate to Y" questions, prefer `graphify query "<question>"`, `graphify path "<A>" "<B>"`, or `graphify explain "<concept>"` over grep.
- After modifying code files, run `graphify update .` to keep the graph current (AST-only, no API cost).
