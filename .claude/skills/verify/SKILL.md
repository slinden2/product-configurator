---
name: verify
description: Launch and drive this app to verify a change at runtime (dev server + Playwright).
---

# Verifying changes in the ITECO product configurator

## Launch

```bash
npm run dev   # Next.js dev server on http://localhost:3000 (turbopack, ~10s ready)
```

Needs the seeded Supabase/Postgres from `.env` (already configured). If data looks wrong:
`npm run seed:reset`.

## Login (seeded users, password `pw` for all — db/seed-constants.ts DEV_PASSWORD)

- `admin@itecosrl.com` (ADMIN), `engineer@itecosrl.com` (ENGINEER),
  `director@itecosrl.com` (SALES_DIRECTOR), `manager@itecosrl.com` (SALES_MANAGER),
  `agent@itecosrl.com` (SALES)
- Login form at `/login`: fill Email + Password, click "Accedi". Role decides the landing redirect
  (SALES → /offerte, ENGINEER → /configurazioni, ADMIN → dashboard).

## Drive (playwright-cli skill)

```bash
playwright-cli open http://localhost:3000/login
playwright-cli fill <email-ref> "engineer@itecosrl.com"
playwright-cli fill <pw-ref> "pw"
playwright-cli click <accedi-ref>
```

- Config form: `/configurazioni/nuova` (no data needed). Radix selects: click trigger, click
  `option` ref from the follow-up snapshot. Checkboxes: `getByRole('checkbox', { name: '<label>' })`.
- Playwright screenshots may only be written under `.playwright/output/`.
- The "Dati di prova" button on the config form fills valid test data.

## Gotchas

- Dev console shows `Failed to execute 'measure' on 'Performance'` TypeErrors — Next dev-mode
  noise, not app errors.
- Mobile nav: resize under 768px for the hamburger sheet.
