# ITECO Product Configurator

Internal tool for ITECO SRL engineers and sales staff to configure gantry-type rollover wash systems (truck and bus). UI language is Italian; all code identifiers, comments, and non-UI strings are English.

## Project Context

Before starting any task, read these project-context files in order:

- `CLAUDE.md` — root project rules (architecture, dev checklist, language convention, operational constraints)
- `db/CLAUDE.md` — database conventions, RLS, error handling
- `lib/BOM/CLAUDE.md` — BOM generation rules, snapshot lifecycle, versioning
- `app/actions/CLAUDE.md` — server action standards
- `.claude/rules/forms.md` — form architecture rules
- `.claude/rules/workflow.md` — status machine and role permissions
- `.claude/rules/testing.md` — testing patterns and mock conventions

## Review Mode

When invoked via `npm run review` (the code review task), operate in **read-only mode**:

- Do NOT edit any files
- Compute the branch diff with `git fetch origin main` then `git diff origin/main...HEAD`
- Analyze the diff against the project rules from the files above
- Output a structured textual report (see prompt for format)

## Language Convention

- User-facing UI strings must be Italian: JSX prose, `MSG` constants, toast/alert/confirm messages, Zod error messages, tab and `aria-label` strings, URL route folders under `app/`
- Everything else must be English: function/component/type/variable names, comments, test descriptions, internal BOM `_description` fields
- Part numbers are catalog codes — never translate them
