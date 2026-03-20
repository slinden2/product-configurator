# Testing Patterns

## Setup
- Tests use `// @vitest-environment jsdom` directive
- `test/setup-dom.ts` polyfills ResizeObserver, matchMedia, scrollIntoView (needed for Radix components in jsdom)
- Test helpers in `test/form-test-utils.ts` (e.g., `makeValidConfig()` for consistent test data)

## What to Test
- **Server actions:** Happy path, validation errors, permission boundaries (role × status matrix), frozen state rejection
- **Components:** Rendering, form submission, user interactions via `userEvent`
- **Don't test:** Internal Radix/shadcn rendering details, CSS classes, implementation details

## Mock Ordering (Critical)

Vitest hoists `vi.mock()` calls, but mock _references_ must be defined first:
1. Define mock functions: `const mockGetUserData = vi.fn()`
2. Call `vi.mock()` with factory referencing those functions
3. Import the SUT **after** mocks
4. `beforeEach`: always `vi.clearAllMocks()` + set default `.mockResolvedValue()`

## Common Mocks
- `vi.mock("@/app/actions/...")` — server actions
- `vi.mock("next/navigation")` — `useRouter`, `usePathname`
- `vi.mock("next/cache")` — `revalidatePath`
- `vi.mock("sonner")` — `toast.success`, `toast.error`
- `vi.mock("pg")` — `DatabaseError` class
- Drizzle chain mocking: `mockInsert → mockValues`, `mockUpdate → mockSet → mockWhere → mockReturning`
