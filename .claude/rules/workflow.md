# Workflow & Role Permissions

The app manages a hand-off between sales agents, sales management, engineering, and production.

## Status Machine

**DRAFT → IN_SALES_REVIEW → SALES_APPROVED → IN_REVIEW → APPROVED → CLOSED**

- `IN_SALES_REVIEW` — a sales agent has submitted the offer for sales-management review.
- `SALES_APPROVED` — sales management approved it; it is a **locked hand-off snapshot** awaiting engineering. Not editable by anyone.
- `IN_REVIEW` — an engineer has pulled it in to finalize the BOM / technical specs.

## Roles

1. **SALES (Area Manager or Sales Agent):**
   - **Primary Goal:** Capture customer requirements in `DRAFT`.
   - **Access:** Own configurations only.
   - **Permissions:** Can EDIT in `DRAFT` and toggle `DRAFT ↔ IN_SALES_REVIEW`.
   - **Lockout:** Cannot edit once status moves past `DRAFT`.

2. **SALES_MANAGER (Responsabile vendite):**
   - **Primary Goal:** Review and approve their team's offers.
   - **Access:** Own configurations **plus** those of their direct reports (sales agents whose `manager_id` points to them).
   - **Permissions:** Can create their own offers (like SALES); EDIT in `DRAFT` and `IN_SALES_REVIEW`; approve (`IN_SALES_REVIEW → SALES_APPROVED`), reject (`IN_SALES_REVIEW → DRAFT`), and un-approve (`SALES_APPROVED → IN_SALES_REVIEW`) within scope. Self-approval is allowed.

3. **SALES_DIRECTOR (Direttore vendite):**
   - Same powers as SALES_MANAGER, but **Access: all configurations** (no team restriction).

4. **ENGINEER (Technical Office or Engineer):**
   - **Primary Goal:** Finalize the BOM and technical specs.
   - **Access:** All configurations.
   - **Permissions:** Can EDIT in `DRAFT`, `IN_SALES_REVIEW`, or `IN_REVIEW`.
   - **Transitions:** `SALES_APPROVED ↔ IN_REVIEW`, `IN_REVIEW ↔ APPROVED`.

5. **ADMIN (Production/System):**
   - **Permissions:** Same edit rights as ENGINEER. Can transition between any statuses. Only role that can move status to `CLOSED` or revert a `CLOSED` status.

## Editable Logic (Immutable States)

Editability is status × role (`isEditable` in `app/actions/lib/auth-checks.ts`); ownership/scope is enforced separately by `canAccessConfiguration` (`db/queries.ts`).

- `SALES_APPROVED`, `APPROVED`, `CLOSED` → **read-only for all roles**.
- `SALES` → editable only in `DRAFT`.
- `SALES_MANAGER` / `SALES_DIRECTOR` → editable in `DRAFT`, `IN_SALES_REVIEW`.
- `ENGINEER` / `ADMIN` → editable in `DRAFT`, `IN_SALES_REVIEW`, `IN_REVIEW`.

**Frozen States:** To edit a `SALES_APPROVED` config, a manager un-approves it back to `IN_SALES_REVIEW`, or an engineer pulls it forward to `IN_REVIEW`. To edit an `APPROVED`/`CLOSED` config, an ENGINEER/ADMIN must transition it back to `IN_REVIEW`.

## Scope (Visibility)

`configScopeWhere(user)` (`db/queries.ts`) builds the list/count filter; `canAccessConfiguration(user, config)` is the single-record gate. SALES = own; SALES_MANAGER = own + direct reports; SALES_DIRECTOR / ENGINEER / ADMIN = all.

**Validation:** Every Server Action MUST run `isEditable(status, role)` before any DB update, and `canAccessConfiguration` (or fetch via the scoped `getConfigurationWithTanksAndBays`) for ownership.
