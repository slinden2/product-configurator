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
  - **`BOM_RULES_VERSION`** (`lib/BOM/max-bom/index.ts`): Must be bumped every time any rule file under `lib/BOM/max-bom/` is modified. This version is stored on engineering BOM snapshots so engineers can identify which rule set produced the BOM and whether it is outdated. The version number in this format: YYMMDD.

### BOM Domain
The system has two BOM modes:
- **Real-time calculated BOM:** Generated on-the-fly from rule files. `BOM` class (singleton via `BOM.init(config)`) calls `buildCompleteBOM()` → `{ generalBOM, waterTankBOMs, washBayBOMs }`.
- **Engineering BOM snapshot:** Frozen copy stored in `engineering_bom_items` table for engineers to review and modify.

**Rule composition:** Files under `lib/BOM/max-bom/` (gru, brush, dosing pump, water supply, nozzle bar, supply, rail, electric, fast, HP pump) compose into `GeneralMaxBOM`, `WaterTankMaxBOM`, `WashBayMaxBOM`. Each rule item has `pn`, `conditions` (filter functions), `qty` (static or dynamic), and `_description`.

**Engineering BOM lifecycle:**
1. **Snapshot** — creates initial frozen BOM from calculated rules (`snapshotEngineeringBomAction`)
2. **Edit** — engineers add/delete/modify items; tracks changes via `is_added`, `is_deleted`, `is_custom`, `original_qty` flags
3. **Regenerate** — atomically replaces all items with fresh calculation (transaction-based)
4. **Invalidation** — any configuration edit deletes the engineering BOM (cascade in `editConfigurationAction`)

`bom_rules_version` (YYMMDD) is stored on each snapshot so engineers can identify which rule set produced it and whether it's outdated.

### Data Flow & Synchronization
We follow a strict "Action-Validation-Mutation-Sync" loop:

1. **Input:** User interacts with `ConfigForm` or `SubRecordForm`. React Hook Form (RHF) tracks local state via Zod schema.
2. **Mutation (Server Action):** Upon submission, the Server Action (`app/actions/`) validates the input against the same Zod schema used in the component.
3. **Database Execution:** Drizzle ORM executes the mutation. RLS ensures the user only modifies their own `Configuration` (unless ADMIN).
4. **Consistency:**
   - **Crucial:** Every mutation MUST call `revalidatePath('/config/[id]')` or the relevant cache tag to trigger a fresh data fetch.
   - **Form Sync:** The UI must rely on the returned data from the Server Action to reset the RHF form state (avoid stale manual state management).
5. **Conflict Resolution:** If a mutation fails due to `ConfigurationStatus` (e.g., attempt to edit a `LOCKED` record), the action must return a Zod-parsed error object for `sonner` to display.

### Error Handling
All Server Actions return: `{ success: boolean (as const), error?: string, data?: any, id?: number | string }`. See `app/actions/CLAUDE.md` for the full implementation template.
- **Frontend consumption:** `sonner` toast displays `error` on failure; form resets with returned `data` on success.
- **Error messages are in Italian.** Standard messages: `"Non autorizzato."`, `"Configurazione non trovata."`, `"Non è possibile modificare una configurazione in questo stato."`, `"Si è verificato un errore imprevisto."`.
- **Exception handling:** Catch `QueryError` (`db/queries.ts`, has `errorCode`) and `DatabaseError` (`pg`) specifically; all other errors return a generic message.

### Database Conventions
- **Schema changes:** Use `drizzle-kit push` during development (not `drizzle-kit migrate`).
- **Naming:** snake_case for all columns. Use `pgEnum()` for every enum field.
- **RLS:** All tables must call `.enableRLS()` for Row Level Security.
- **Null mapping:** DB `null` ↔ Zod `undefined`. `db/transformations.ts` handles the bridge: `transformConfigToDbInsert/Update` (form → DB) and `transformDbNullToUndefined` (DB → form).
- **Domain errors:** `QueryError` class (`db/queries.ts`) with `errorCode` (400, 403, 404, 500) for deterministic error handling vs generic DB errors.
- **Transactions:** Use `db.transaction(async (tx) => { ... })` for atomic multi-step operations (e.g., BOM regenerate: delete + insert).

### Routing & Pages
- **Auth group:** `(auth)/` route group — `login`, `signup`, `recupera-password`
- **Domain routes:** `configurations/` (list), `configurations/new`, `configurations/edit/[id]`, `configurations/bom/[id]`
- **Admin:** `users/` for user management
- **Page pattern:** All pages are async server components. Dynamic route params are `Promise<{ id: string }>` in Next.js 15 — must `await props.params`.
- **Data fetching:** Server-side in the page component; pass data as props to client components.

### Form Architecture
- **ConfigForm** is the main form, composed of 8 section components (General, Brush, ChemPump, WaterSupply, Supply, Rail, Touch, HPPump)
- **SubRecordForm** (`components/shared/sub-record-form.tsx`) is a generic, schema-inferred form wrapper used for water tanks and wash bays — handles create/update/delete
- **SelectField** handles string↔number/boolean type conversion and supports `fieldsToResetOnValue` for dependent field clearing
- **CheckboxField** resets dependent fields on uncheck via `fieldsToReset`
- **FormContainer** manages tabs (config / water tanks / wash bays), tracks dirty state across forms, and prompts on unsaved changes
- **Shared utilities:** `NOT_SELECTED_VALUE`/`NOT_SELECTED_LABEL` (sentinel for empty selects), `withNoSelection()` (prepends empty option), `generateSelectOptionsFromZodEnum()` (maps Zod enum values to Italian labels), `getNumericSelectOptions()` (numeric array → options)

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
1. **Status Check:** Does the Server Action call `isEditable(status, role)` (`app/actions/lib/auth-checks.ts`) to verify the configuration is editable?
2. **Dependent Fields:** If adding or modifying a `SelectField` or `CheckboxField`, are `fieldsToReset` correctly mapped to the Zod schema keys?
3. **Type Safety:** Does the change respect the existing types in `types/index.ts` without using `any` or loose type casting? Always run `npm run type-check` to ensure no regressions were introduced.
4. **Data Integrity:** Is `revalidatePath` included in the Server Action to ensure the UI stays in sync with the DB?
5. **Localization:** Are all new UI labels in Italian?

## Testing Patterns

### Setup
- Tests use `// @vitest-environment jsdom` directive
- `test/setup-dom.ts` polyfills ResizeObserver, matchMedia, scrollIntoView (needed for Radix components in jsdom)
- Test helpers in `test/form-test-utils.ts` (e.g., `makeValidConfig()` for consistent test data)

### What to Test
- **Server actions:** Happy path, validation errors, permission boundaries (role × status matrix), frozen state rejection
- **Components:** Rendering, form submission, user interactions via `userEvent`
- **Don't test:** Internal Radix/shadcn rendering details, CSS classes, implementation details

### Mock Ordering (Critical)
Vitest hoists `vi.mock()` calls, but mock _references_ must be defined first:
1. Define mock functions: `const mockGetUserData = vi.fn()`
2. Call `vi.mock()` with factory referencing those functions
3. Import the SUT **after** mocks
4. `beforeEach`: always `vi.clearAllMocks()` + set default `.mockResolvedValue()`

### Common Mocks
- `vi.mock("@/app/actions/...")` — server actions
- `vi.mock("next/navigation")` — `useRouter`, `usePathname`
- `vi.mock("next/cache")` — `revalidatePath`
- `vi.mock("sonner")` — `toast.success`, `toast.error`
- `vi.mock("pg")` — `DatabaseError` class
- Drizzle chain mocking: `mockInsert → mockValues`, `mockUpdate → mockSet → mockWhere → mockReturning`

## Path Aliases

`@/*` maps to project root (configured in `tsconfig.json`).