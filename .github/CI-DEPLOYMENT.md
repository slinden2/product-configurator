# CI & Deployment Setup

This document is a complete reference for rebuilding the CI/CD pipeline from scratch — e.g. after moving to a new GitHub account, a new Vercel account, or a new repository.

---

## Architecture Overview

```
git push main
      │
      ▼
GitHub Actions (ci.yml)
  ├── lint          ─┐
  ├── format        ─┤ run in parallel
  ├── type-check    ─┤
  └── test          ─┘
           │
           │ all pass?
           ▼
       deploy job
    vercel deploy --prod
           │
           ▼
    Vercel builds & deploys to production
```

**Key principle:** Vercel's built-in git integration is **disconnected**. GitHub Actions is the sole deploy trigger. A push to `main` never reaches Vercel unless all four CI checks pass first.

---

## What CI Checks and Why

| Job | npm script | What it catches |
|-----|-----------|-----------------|
| `lint` | `npm run lint` | Biome lint violations |
| `format` | `npm run format:check` | Formatting drift and unsorted imports (Biome) |
| `type-check` | `npm run type-check` | TypeScript errors across the full project |
| `test` | `npm run test:run` | Vitest unit tests (fully mocked, no DB or env vars needed) |

Vercel runs `next build` during its own deploy step, so build errors are also caught — but only after CI passes.

**Not included in CI:**
- Playwright e2e tests — they need a real Supabase instance (DB, auth user, env vars). Run locally with `npm run test:e2e` before risky deploys.

---

## Files Involved

| File | Purpose |
|------|---------|
| `.github/workflows/ci.yml` | The GitHub Actions workflow |
| `package.json` scripts | `lint`, `format:check`, `type-check`, `test:run` — all used by CI |

The `.vercel/` directory is **gitignored**. It is only needed locally when running `vercel link` to extract project IDs.

---

## GitHub Secrets Required

Three secrets must be set in the repository:
**GitHub repo → Settings → Secrets and variables → Actions → Repository secrets**

| Secret name | How to get it |
|-------------|--------------|
| `VERCEL_TOKEN` | Vercel dashboard → (your avatar) → Account Settings → Tokens → Create Token. Name it "GitHub Actions", set expiry to "No expiry" or 1 year. |
| `VERCEL_ORG_ID` | See "Getting Project IDs" below |
| `VERCEL_PROJECT_ID` | See "Getting Project IDs" below |

### Getting Project IDs

Run in the project root:

```bash
npx vercel link --yes
cat .vercel/project.json
```

This prints something like:
```json
{
  "projectId": "prj_xxxxxxxxxxxxxxxxxxxxxxxx",
  "orgId": "team_xxxxxxxxxxxxxxxxxxxxxxxx",
  "projectName": "iteco-product-configurator"
}
```

Use `orgId` as `VERCEL_ORG_ID` and `projectId` as `VERCEL_PROJECT_ID`.

> Note: `vercel link` requires you to be logged in to the Vercel CLI (`npx vercel login`). The `.vercel/` directory it creates is gitignored — do not commit it.

---

## Vercel Project Settings

### Git Integration — MUST be disconnected

Vercel's default behavior is to auto-deploy every push to the connected branch. This bypasses CI entirely. The git integration must be disconnected so that only GitHub Actions can trigger a deploy.

**Vercel dashboard → Project → Settings → Git → Connected Git Repository → Disconnect**

After disconnecting, Vercel will no longer listen for git pushes. GitHub Actions deploys via the CLI instead.

### Ignored Build Step

Leave this at **Automatic** (the default). It is irrelevant once the git integration is disconnected since no git-triggered builds occur.

> **Important:** Do not set "Don't build anything" here. That setting blocks all builds — including CLI-triggered ones — making deploys impossible.

### Deploy Hooks

Not used. The Vercel CLI in the GitHub Actions `deploy` job handles all deployments directly.

---

## Setup from Scratch (Step-by-Step)

Follow this order exactly.

### 1. Create / import the Vercel project

If starting fresh, go to [vercel.com/new](https://vercel.com/new) and import the repository. Let Vercel do one initial auto-deploy to establish the project. Then continue to the next step.

If the Vercel project already exists, skip this step.

### 2. Disconnect Vercel's git integration

Vercel dashboard → Project → Settings → Git → **Disconnect**

This prevents Vercel from auto-deploying on every push to `main`.

### 3. Verify Ignored Build Step is set to Automatic

Vercel dashboard → Project → Settings → Build & Deployment → Ignored Build Step → **Automatic**

### 4. Get the Vercel project IDs

```bash
npx vercel login        # authenticate in browser
npx vercel link --yes   # links to the existing Vercel project
cat .vercel/project.json
```

Note the `orgId` and `projectId` values.

### 5. Create a Vercel token

Vercel dashboard → (your avatar, top right) → Account Settings → Tokens → **Create Token**

- Name: `GitHub Actions`
- Expiration: `No expiry` (or 1 year if you prefer rotation)
- Scope: the team/account that owns the project

Copy the token immediately — it is shown only once.

### 6. Add GitHub secrets

GitHub repo → Settings → Secrets and variables → Actions → **New repository secret**

Add all three:
- `VERCEL_TOKEN` → the token from step 5
- `VERCEL_ORG_ID` → `orgId` from step 4
- `VERCEL_PROJECT_ID` → `projectId` from step 4

### 7. Push the workflow file

The workflow file `.github/workflows/ci.yml` must be present on the `main` branch. If it is already in the repository, nothing extra is needed — it activates automatically once the secrets are in place.

If setting up a brand new repo, copy the file and push it:

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add GitHub Actions CI with Vercel deploy gate"
git push
```

### 8. Verify

1. Go to GitHub → Actions tab — the workflow run should appear.
2. All four check jobs run in parallel (~1–1.5 min).
3. After they pass, the `deploy` job runs (~1–2 min).
4. Vercel dashboard should show a new production deployment.

---

## How the Workflow Works

```yaml
on:
  push:
    branches: [main]      # runs on every push to main
  pull_request:
    branches: [main]      # runs on PRs (CI only, deploy is skipped)
  workflow_dispatch:       # allows manual runs from the Actions tab
```

**Concurrency:** If you push twice in quick succession, the older run is cancelled automatically. Only the latest run proceeds.

**Deploy condition:** The deploy job has an explicit guard:
```yaml
if: github.event_name == 'push' && github.ref == 'refs/heads/main'
```
This means:
- Pull requests → CI runs, deploy is skipped
- Manual (`workflow_dispatch`) runs → CI runs, deploy is skipped
- Push to `main` → CI runs, deploy runs if CI passes

---

## Troubleshooting

### All CI jobs pass but deploy job fails

Check that all three secrets (`VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`) are set correctly in GitHub. A missing or incorrect token produces an authentication error in the deploy job logs.

### Deploy job passes but nothing appears in Vercel

The Vercel project may still have its git integration connected, which can cause conflicts. Verify it is disconnected: Vercel dashboard → Settings → Git → Connected Git Repository should show no connected repo.

### `vercel link` fails with "Login Connection" error

This happens when the Vercel account is not linked to GitHub via OAuth. Either:
- Link GitHub in Vercel account settings, then re-run `vercel link`, OR
- Get the project IDs from the Vercel dashboard URL or project settings page instead of from `project.json`

### Format check fails in CI but passes locally

The `npm run format` script only fixes whitespace — it does not fix import ordering. Always use `npx biome check --write .` locally to apply all fixes before pushing. The CI `format` job runs `npm run format:check` which checks both formatting and import order.

### Vercel build fails after CI passes

Vercel runs `next build` during its deploy. If the build fails, check the deploy job logs in GitHub Actions for the Vercel build output, or check the Vercel dashboard deployment logs directly.

---

## Rollback / Disabling CI

To temporarily disable CI and restore the old "push to main = auto-deploy" behavior:

1. Delete or rename `.github/workflows/ci.yml`
2. Vercel dashboard → Settings → Git → reconnect the repository
3. Push — Vercel will auto-deploy again

To re-enable: reconnect git disconnects the shortcut above; follow the setup steps again.
