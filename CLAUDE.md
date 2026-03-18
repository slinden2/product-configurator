# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Persona
You are an expert engineer at ITECO SRL. You are precise, conservative with refactors, and prioritize data integrity in our Gantry Wash system configurator. UI labels are in Italian; maintain this convention in all new code.

## Build & Development Commands

```bash
npm run dev              # Start dev server with Turbopack
npm run build            # Production build
npm run lint             # ESLint
npm run type-check       # tsc --noEmit
npm run test             # Run all Vitest tests
npx vitest run path/to/file.test.tsx  # Run a single test file
npm run seed             # Seed database
npm run seed:reset       # Reset and reseed database
npm run BOM              # Generate Bill of Materials (Excel export)
```

## Architecture

**Next.js 15 App Router** product configurator for gantry-type rollover wash systems (ITECO SRL) for truck and buses. UI is in Italian. The app is made for internal use only for engineers, technical sales, area managers and sales agents.

### Core Stack
- **React 19** with **React Hook Form + Zod** for form state/validation
- **Radix UI / shadcn/ui** components with **Tailwind CSS** (dark mode via class)
- **Drizzle ORM + PostgreSQL** with Row Level Security (RLS)
- **Supabase** for auth (roles: ADMIN, INTERNAL, EXTERNAL)
- **Vitest + @testing-library/react** for testing

### Key Directories
- `app/actions/` — Server Actions for all mutations (config CRUD, auth, status changes)
- `components/config-form/` — Configuration form sections (brush, pump, water, rail, touch, etc.)
- `components/shared/` — SubRecordForm: generic form wrapper for water tanks & wash bays
- `components/ui/` — shadcn/ui primitives
- `db/schemas/` — Drizzle ORM table definitions
- `db/queries.ts` — Database query functions
- `db/transformations.ts` — Bridge between Zod validation schemas and DB format
- `validation/` — Zod schemas; sub-schemas in `validation/configuration/` compose into `config-schema.ts`
- `types/index.ts` — All enums and shared types (BrushType, WaterType, ConfigurationStatus, etc.)
- `lib/BOM/` — BOM generation in the UI and also with ExcelJS

### Data Flow & Synchronization
We follow a strict "Action-Validation-Mutation-Sync" loop:

1. **Input:** User interacts with `ConfigForm` or `SubRecordForm`. React Hook Form (RHF) tracks local state via Zod schema.
2. **Mutation (Server Action):** Upon submission, the Server Action (`app/actions/`) validates the input against the same Zod schema used in the component.
3. **Database Execution:** Drizzle ORM executes the mutation. RLS ensures the user only modifies their own `Configuration` (unless ADMIN).
4. **Consistency:**
   - **Crucial:** Every mutation MUST call `revalidatePath('/config/[id]')` or the relevant cache tag to trigger a fresh data fetch.
   - **Form Sync:** The UI must rely on the returned data from the Server Action to reset the RHF form state (avoid stale manual state management).
5. **Conflict Resolution:** If a mutation fails due to `ConfigurationStatus` (e.g., attempt to edit a `LOCKED` record), the action must return a Zod-parsed error object for `sonner` to display.

### Form Architecture
- **ConfigForm** is the main form, composed of 8 section components (General, Brush, ChemPump, WaterSupply, Supply, Rail, Touch, HPPump)
- **SubRecordForm** (`components/shared/sub-record-form.tsx`) is a generic, schema-inferred form wrapper used for water tanks and wash bays — handles create/update/delete
- **SelectField** handles string↔number/boolean type conversion and supports `fieldsToResetOnValue` for dependent field clearing
- **CheckboxField** resets dependent fields on uncheck via `fieldsToReset`
- **FormContainer** manages tabs (config / water tanks / wash bays), tracks dirty state across forms, and prompts on unsaved changes

### Workflow & Role Permissions
The app manages a 3-stage hand-off between sales, engineering, and production.

**Workflow:** DRAFT ↔ OPEN ↔ LOCKED ↔ CLOSED.

1. **EXTERNAL (Area Manager or Sales Agent):**
   - **Primary Goal:** Capture customer requirements in `DRAFT`.
   - **Access:** Own configurations only.
   - **Permissions:** Can EDIT and toggle `DRAFT ↔ OPEN`.
   - **Lockout:** Cannot edit once status moves to `OPEN`, `LOCKED`, or `CLOSED`.

2. **INTERNAL (Technical Office or Engineer):**
   - **Primary Goal:** Finalize the "Bill of Materials" (BOM) and technical specs.
   - **Access:** All configurations.
   - **Permissions:** Can EDIT in `DRAFT` or `OPEN` to finalize technical specs.
   - **Action:** Moves `OPEN → LOCKED` to freeze the configuration for production.

3. **ADMIN (Production/System):**
   - **Permissions:** Same edit rights as INTERNAL. Only role that can move status to `CLOSED` or revert a `CLOSED` status.

**Operational Constraints:**
- **Editable Logic (IMMUTABLE STATES):** A configuration is ONLY editable if:
  - `status` is `DRAFT` or `OPEN` AND
  - `(user.role === 'INTERNAL' || user.role === 'ADMIN')`
  - *Exception:* `EXTERNAL` can ONLY edit if `status` is `DRAFT`.
- **Frozen States:** Any configuration in `LOCKED` or `CLOSED` is **Read-Only** for all users. To edit, an INTERNAL/ADMIN must transition the status back to `OPEN`.
- **Validation:** Every Server Action MUST run `isEditable(status, role)` before executing any DB update.

### Operational Constraints
- Server Actions: Always use revalidatePath after any mutation in app/actions/. Never bypass Server Actions for direct DB calls.
- Form State: When modifying components/config-form/, never introduce useState for form fields. Use only react-hook-form methods (setValue, watch, control) to ensure Zod validation remains in sync.
- Type Safety: Always use the types defined in types/index.ts. If a new entity is added, define the Zod schema in validation/ before touching the DB schema.
- Status Protection: Before performing any mutation on a Configuration, verify the ConfigurationStatus. Mutations must fail if status is LOCKED or CLOSED.

## Development Checklist
Before finalizing any change, verify:
1. **Status Check:** Does the Server Action check if the configuration status is `DRAFT`?
2. **Dependent Fields:** If adding or modifying a `SelectField` or `CheckboxField`, are `fieldsToReset` correctly mapped to the Zod schema keys?
3. **Type Safety:** Does the change respect the existing types in `types/index.ts` without using `any` or loose type casting?
4. **Data Integrity:** Is `revalidatePath` included in the Server Action to ensure the UI stays in sync with the DB?
5. **Localization:** Are all new UI labels in Italian?

## Testing Patterns

- Tests use `// @vitest-environment jsdom` directive
- `test/setup-dom.ts` polyfills ResizeObserver, matchMedia, scrollIntoView (needed for Radix components in jsdom)
- Mock server actions with `vi.mock("@/app/actions/...")` before imports
- Mock `next/navigation` and `sonner` as needed
- Use `@testing-library/react` with `userEvent` for interactions

## Path Aliases

`@/*` maps to project root (configured in `tsconfig.json`).