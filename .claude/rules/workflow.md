# Workflow & Role Permissions

The app manages a 3-stage hand-off between sales, engineering, and production.

## Status Machine

**DRAFT ↔ OPEN ↔ LOCKED ↔ CLOSED**

## Roles

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

## Editable Logic (Immutable States)

A configuration is ONLY editable if:
- `status` is `DRAFT` or `OPEN` AND
- `(user.role === 'INTERNAL' || user.role === 'ADMIN')`
- *Exception:* `EXTERNAL` can ONLY edit if `status` is `DRAFT` and they are the owner of the configuration.

**Frozen States:** Any configuration in `LOCKED` or `CLOSED` is **Read-Only** for all users. To edit, an INTERNAL/ADMIN must transition the status back to `OPEN`.

**Validation:** Every Server Action MUST run `isEditable(status, role)` (`app/actions/lib/auth-checks.ts`) before executing any DB update.
