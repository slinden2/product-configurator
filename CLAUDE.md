# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Persona

You are an expert engineer at ITECO SRL. You are precise, conservative with refactors, and prioritize data integrity in our Gantry Wash system configurator. UI labels are in Italian; maintain this convention in all new code.

## Build & Development Commands

```bash
npm run dev              # Start dev server with Turbopack
npm run build            # Production build
npm run lint             # Biome linter
npm run type-check:incremental       # tsc --noEmit --incremental
npm run test             # Run all Vitest tests
npx vitest run path/to/file.test.tsx  # Run a single test file
npm run seed             # Seed database
npm run seed:reset       # Reset and reseed database
```

## Architecture

**Next.js 16 App Router** product configurator for gantry-type rollover wash systems (ITECO SRL) for truck and buses. UI is in Italian. The app is made for internal use only for engineers, technical sales, area managers and sales agents.

### Core Stack

- **React 19** with **React Hook Form + Zod** for form state/validation
- **Radix UI / shadcn/ui** components with **Tailwind CSS** (dark mode via class)
- **Drizzle ORM + PostgreSQL** with Row Level Security (RLS)
- **Supabase** for auth (roles: ADMIN, ENGINEER, SALES)
- **Vitest + @testing-library/react** for testing

### Key Directories

- `app/actions/` — Server Actions for all mutations (config CRUD, auth, status changes)
- `components/config-form/` — Configuration form sections (brush, pump, water, rail, touch, etc.)
- `components/shared/` — SubRecordForm: generic form wrapper for water tanks & wash bays
- `components/ui/` — shadcn/ui primitives
- `db/schemas/` — Drizzle ORM table definitions
- `db/queries.ts` — Database query functions
- `db/transformations.ts` — Bridge between Zod validation schemas and DB format
- `validation/` — Zod schemas; sub-schemas in `validation/configuration/` compose into `config-schema.ts`. All Zod schemas must be within the `validation/` folder.
- `types/index.ts` — All enums and shared types (BrushType, WaterType, ConfigurationStatus, etc.)
- `lib/messages.ts` — Centralized Italian messages (`MSG` constant) for all error/success/toast strings
- `lib/BOM/` — BOM generation (see `lib/BOM/CLAUDE.md` for domain details)

### Routing & Pages

- **Auth group:** `(auth)/` route group — `login`, `signup`, `recupera-password`, `resetta-password`
- **Domain routes:** `configurazioni/` (list), `configurazioni/nuova`, `configurazioni/modifica/[id]`, `configurazioni/bom/[id]`
- **Admin:** `utenti/` for user management
- **Page pattern:** All pages are async server components. Dynamic route params are `Promise<{ id: string }>` in Next.js 15 — must `await props.params`.
- **Data fetching:** Server-side in the page component; pass data as props to client components.

### Domain-Specific Guidance

- **BOM rules & lifecycle:** `lib/BOM/CLAUDE.md`
- **Database conventions:** `db/CLAUDE.md`
- **Server action standards:** `app/actions/CLAUDE.md`
- **Form implementation rules:** `.claude/rules/forms.md`
- **Workflow & role permissions:** `.claude/rules/workflow.md`
- **Testing patterns:** `.claude/rules/testing.md`

## Operational Constraints

- Server Actions: Always use revalidatePath after any mutation in app/actions/. Never bypass Server Actions for direct DB calls.
- Form State: When modifying components/config-form/, never introduce useState for form fields. Use only react-hook-form methods (setValue, watch, control) to ensure Zod validation remains in sync.
- Type Safety: Always use the types defined in types/index.ts. If a new entity is added, define the Zod schema in validation/ before touching the DB schema.
- Status Protection: Before performing any mutation on a Configuration, verify the ConfigurationStatus. Mutations must fail if status is APPROVED or CLOSED.
- DRY: Do not duplicate logic. Extract repeated patterns into shared utilities (`lib/`), helper functions, or reusable components (`components/shared/`). Before writing new code, check if an existing function or component already handles the same concern.
- Component Readability: Keep React components focused and readable. If a component grows too large or handles multiple concerns, split it into smaller, well-named sub-components. Avoid deeply nested conditionals and long render functions — extract sections into dedicated components or custom hooks.
- Formatting after Bash: If a file is created, moved, renamed, or otherwise modified via a Bash command (e.g. `mv`, `cp`, `sed`), immediately run `npm run format` afterwards. The PostToolUse hook only covers Edit/Write — Bash-based file changes must be formatted manually.

## Development Checklist

Before finalizing any change, verify:

1. **Status Check:** Does the Server Action call `isEditable(status, role)` (`app/actions/lib/auth-checks.ts`) to verify the configuration is editable?
2. **Dependent Fields:** If adding or modifying a `SelectField` or `CheckboxField`, are `fieldsToReset` correctly mapped to the Zod schema keys?
3. **Type Safety:** Does the change respect the existing types in `types/index.ts` without using `any` or loose type casting? Always run `npm run type-check` to ensure no regressions were introduced.
4. **Data Integrity:** Is `revalidatePath` included in the Server Action to ensure the UI stays in sync with the DB?
5. **Localization:** Are all new UI labels in Italian?

## Post-Change Verification

After every code change, run all three checks before considering the task complete:

1. `npm run lint`
2. `npm run type-check:incremental`
3. `npm run format`
4. `npm run test:run`

** DO NOT COMMIT CODE WITHOUT A DIRECT COMMAND TO DO SO **

## Path Aliases

`@/*` maps to project root (configured in `tsconfig.json`).

## GitHub Issues

All GitHub issues (titles, bodies, comments) must be written in **English**, regardless of the Italian UI language of the app.

## Screenshots

If I ask you to take a look at a screenshot you can find it here: C:\Users\Utente-006\Pictures\Screenshots
