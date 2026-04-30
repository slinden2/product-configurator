You are performing a code review for the ITECO Product Configurator (see AGENTS.md for project context). Before reviewing, read all seven context files listed in AGENTS.md.

## Your Task

1. Run `git fetch origin main 2>/dev/null || true` to ensure origin/main is up to date.
2. Run `git diff origin/main...HEAD --stat` to see which files changed.
3. Run `git diff origin/main...HEAD` to read the full diff.
4. For each modified file, read the full file when context beyond the diff hunks is needed to judge correctness.

## What to Check

Apply only project-specific rules — skip anything covered by Biome (style/formatting) or tsc (type errors):

**Server actions** (`app/actions/`):
- Every mutating action must call `isEditable(status, role)` from `app/actions/lib/auth-checks.ts` before any DB write. Flag any new or modified action that skips this.
- Every mutating action must call `revalidatePath(...)` after the mutation. Flag omissions.
- No direct DB calls outside of Server Actions.

**Form components** (`components/config-form/`, `components/shared/`):
- No `useState` for form field values — only RHF methods (`setValue`, `watch`, `control`, `useFormContext`).
- `SelectField` and `CheckboxField` must use `fieldsToReset`/`fieldsToResetOnValue` for dependent field clearing; never hardcode resets elsewhere.
- Cross-field validation belongs in `configSchema.superRefine()`, not in individual sub-schemas or component logic.
- Section components must use `useFormContext<ConfigSchema>()` and `useWatch()` — no props-drilling of form state.

**Loading state**:
- Client components handling server action calls must use `useTransition` + `isPending`, not `useState<boolean>` for tracking async state.
- Wrap calls in `startTransition(async () => { ... })` with try/catch (no try/finally with manual flag reset).

**Type safety**:
- No `any` or loose type casts (`as unknown as X`). All new types must be defined in `types/index.ts`.

**Language convention**:
- User-facing strings (JSX prose, `MSG` constants, toast/alert/confirm messages, Zod error messages, `aria-label`, URL route folders under `app/`) must be Italian.
- Code identifiers, comments, test descriptions, and BOM `_description` fields must be English.
- Part numbers are catalog codes — leave them as-is.

**Testing** (if test files are in the diff):
- Mock ordering: define mock functions before `vi.mock()`, `vi.mock()` before SUT import, `vi.clearAllMocks()` + default `.mockResolvedValue()` in `beforeEach`.
- Test server actions for: happy path, validation errors, permission boundaries (role × status matrix), frozen state rejection.
- Do not test internal Radix/shadcn rendering details or CSS classes.

**Status workflow**:
- Verify any new status transition logic matches the allowed matrix in `.claude/rules/workflow.md`.

## Output Format

Respond with exactly this structure. Omit any section that has no findings.

---

### Critical
Issues that will cause runtime failures, data corruption, or security vulnerabilities (e.g. missing `isEditable` check, direct DB write bypassing Server Action).

- `path/to/file.ts:42` — **[short title]** — explanation + suggested fix

### Important
Rule violations that break project conventions and could cause bugs or inconsistencies (e.g. `useState` for form fields, missing `revalidatePath`, wrong language).

- `path/to/file.ts:10` — **[short title]** — explanation + suggested fix

### Nit
Minor convention deviations worth noting but not blocking (e.g. comment explains *what* instead of *why*, internal string should be English).

- `path/to/file.ts:5` — **[short title]** — explanation + suggested fix

---

**Verdict:** `LGTM` | `request changes`
