# Workflow & Role Permissions

The app manages a hand-off between sales agents, sales management, engineering, and production.
Two lifecycles run in parallel and meet at acceptance:

- The **offer revision lifecycle** (commercial) — per revision, owned by sales. See [Offer Revision Lifecycle](#offer-revision-lifecycle).
- The **configuration status machine** (engineering) — per config. See [Configuration Status Machine](#configuration-status-machine).

A configuration's `origin` (`db/queries/`, `types/index.ts`) decides which lifecycle governs it:

- **STANDALONE** — a pure technical config created directly by Engineer/Admin for internal evaluation. It
  runs only the two-state working/approved machine `DRAFT ↔ TECH_APPROVED → CLOSED` and never touches the
  hand-off statuses (`SALES_APPROVED`, `IN_TECH_REVIEW`).
- **OFFER** — a config owned by a specific offer revision (via `offer_revision_lines`). Before
  `SALES_APPROVED` its editability is governed by the parent **offer revision** (sales workflow); once the
  revision is accepted the config is handed off and is governed by the **config status machine**, exactly
  like a standalone config.

## Configuration Status Machine

**DRAFT → SALES_APPROVED → IN_TECH_REVIEW → TECH_APPROVED → CLOSED**

- `DRAFT` — **sales-only pre-handoff zone** for OFFER configs (engineers have no access here). An OFFER
  config stays in `DRAFT` for its whole sales life; its editability is governed by the owning offer
  revision, not by this machine. There is no config-level sales approval — that happens on the revision.
- `SALES_APPROVED` — the config has been **handed off to engineering** (set by the acceptance fan-out, see
  below — the only way in; no manual sales edge exists). A locked hand-off snapshot awaiting engineering;
  not editable until pulled into `IN_TECH_REVIEW`.
- `IN_TECH_REVIEW` — an engineer has pulled it in to finalize the BOM / technical specs.
- `TECH_APPROVED` / `CLOSED` — engineering complete / archived (Admin-only to reach `CLOSED`).

STANDALONE configs skip the hand-off statuses entirely (`DRAFT ↔ TECH_APPROVED → CLOSED`) — both
`SALES_APPROVED` and `IN_TECH_REVIEW` are out of bounds for every role on them, ADMIN included. There is
no hand-off to mark, so the working/approved pair is the whole machine.

## Offer Revision Lifecycle

Lifecycle lives **per revision** on `offer_revisions.status` (an `offers` header points at many
`offer_revisions`, each pointing at many `offer_revision_lines`):

**DRAFT → PENDING_APPROVAL → APPROVED_TO_SEND → SENT → ACCEPTED / REJECTED / EXPIRED**

- The **latest revision is the working copy**; line configs are editable only while it is `DRAFT`.
- **Manager approval is required on every revision before send** (`DRAFT → PENDING_APPROVAL → APPROVED_TO_SEND`),
  scoped to direct reports. `APPROVED_TO_SEND → SENT` freezes the revision (rows + `pricing_snapshot`).
- **Revisions clone-forward:** creating revision N+1 deep-clones each line's config + water tanks + wash bays
  into fresh editable rows and recomputes line pricing. Past sent revisions are immutable.
- **Acceptance hand-off** (`SENT → ACCEPTED`): each line config fans out to `SALES_APPROVED`, the
  at-acceptance **as-sold freeze** fires (`offer_revision_lines.as_sold_snapshot` + `as_sold_frozen_at`),
  `offers.accepted_revision_id` is set, and the offer is locked — no further clone-forward revisions; only
  a commercial-only **renegotiation revision** (below) can follow. Engineering then proceeds per config via
  the config status machine, unchanged.
- `REJECTED` / `EXPIRED` are the other terminal customer outcomes of a `SENT` revision.
- **Un-accept** (`ACCEPTED → SENT`, ADMIN only): the single edge out of the otherwise-terminal
  `ACCEPTED` state — an admin correction for a mistaken acceptance, the exact inverse of the
  acceptance hand-off (`unacceptOfferRevisionWithAudit`). In one transaction it moves the revision
  back to `SENT`, clears `offers.accepted_revision_id`, clears each line's as-sold freeze, and
  reverts the line configs `SALES_APPROVED → DRAFT`. First acceptances only, and only while the
  hand-off is still clean: it refuses if any line config has moved past `SALES_APPROVED`
  (engineering started), if a later revision (a renegotiation) exists, or if the target is a
  renegotiation re-acceptance.

Two distinct snapshots stay linked so commercial and technical can't drift: the per-sent-revision
`pricing_snapshot` (the quote) and the at-acceptance as-sold freeze (the margin baseline).

### Renegotiation (post-acceptance)

Post-acceptance, engineering edits can erode a line's margin below its category threshold. The margin page
(`canViewMarginReview`) raises a **margin alert** and offers the management decision point
(ADMIN / SALES_DIRECTOR): **absorb** the lower margin (logged sign-off, `absorbLineMarginAction`) or
**renegotiate** with the customer.

- A renegotiation is a revision created **from the in-force accepted revision** while
  `offers.accepted_revision_id` is set, by `canRenegotiateOffer` roles (ADMIN / SALES_DIRECTOR) via
  `createRenegotiationRevisionAction`. Renegotiation-ness is **derived, never stored**
  (`lib/offer-renegotiation.ts`, anchored on the first as-sold freeze).
- Its lines **reference the current engineering configs read-only** — no deep-clone. Configs stay governed
  by the engineering status machine (`isEditable` unchanged) and engineering work does **not** pause. Line
  pricing is re-derived from the current configs; only commercial terms (header discount / transport /
  installation) are editable while `DRAFT`. Adding/removing configurations is blocked
  (`renegotiationLinesLocked`). One line per config **per revision** — post-acceptance a config can own its
  frozen accepted line plus one line per renegotiation revision.
- It rides the **same lifecycle and gates**, manager approval included:
  `DRAFT → PENDING_APPROVAL → APPROVED_TO_SEND → SENT → ACCEPTED / REJECTED`.
- **Re-acceptance** (`SENT → ACCEPTED`): the as-sold freeze re-fires on the new revision's lines and
  `accepted_revision_id` moves forward — one transaction, **without touching config statuses** (the
  hand-off fired at first acceptance). The superseded revision keeps its immutable `ACCEPTED` status;
  `accepted_revision_id` disambiguates. New lines start with clean absorb columns, so the margin baseline
  resets to the renegotiated prices.
- **Rejection**: the original accepted revision stays in force; no side effects beyond the recorded
  outcome. The decision point returns (in practice: absorb, documented) or a new renegotiation can be
  opened.

## Roles

1. **SALES (Area Manager or Sales Agent):**
   - **Primary Goal:** Capture customer requirements on offers. Primary workspace: `/offerte`.
   - **Access:** Own offers (and their line configs) only.
   - **Permissions:** Create offers; EDIT line configs and commercial terms while the working revision is
     `DRAFT`; submit a revision for approval (`DRAFT → PENDING_APPROVAL`). Submission is one-way — only a
     manager can hand it back. Cannot approve their own revision (management gate).

2. **SALES_MANAGER (Responsabile vendite):**
   - **Primary Goal:** Review and approve their team's offers.
   - **Access:** Own offers **plus** those of their direct reports (`manager_id` points to them).
   - **Permissions:** Everything SALES can do, plus approve / reject / un-approve revisions within scope
     (`canApproveRevision`, `lib/access.ts`). Self-approval within scope is allowed.

3. **SALES_DIRECTOR (Direttore vendite):**
   - Same powers as SALES_MANAGER, but **Access: all offers** (no team restriction). Also sees the margin
     page (`canViewMarginReview`) and owns the post-acceptance margin decision point: absorb sign-off and
     opening renegotiation revisions (`canRenegotiateOffer`, shared with ADMIN).

4. **ENGINEER (Technical Office or Engineer):**
   - **Primary Goal:** Finalize the BOM and technical specs. Primary workspace: `/configurazioni`.
   - **Access:** All STANDALONE configs (any status) + OFFER configs **only once handed off**
     (`SALES_APPROVED`+). **No access to pre-handoff OFFER configs** (`DRAFT`) — view or
     edit — and **no offer access at all** (never prices/discount/customer terms). See [Offer Access](#offer-access).
   - **Permissions:** EDIT in `DRAFT` (standalone) or `IN_TECH_REVIEW` (OFFER). Transitions:
     OFFER `SALES_APPROVED ↔ IN_TECH_REVIEW`, `IN_TECH_REVIEW ↔ TECH_APPROVED`; STANDALONE
     `DRAFT ↔ TECH_APPROVED`.

5. **ADMIN (Production/System):**
   - **Permissions:** Same edit rights as ENGINEER plus full offer access. May perform any **defined**
     workflow edge (including the ADMIN-only `TECH_APPROVED ↔ CLOSED` close/reopen), but **not** arbitrary
     non-adjacent status jumps — there is no status override. Only role that can move status to `CLOSED` or
     revert it.

## Editable Logic (Immutable States)

Editability is a **two-phase gate**: `isEditable(status, role, origin, offerRevisionStatus?)`
(`app/actions/lib/auth-checks.ts`). Ownership/scope is enforced separately by `canAccessConfiguration`
(`db/queries/configurations.ts`).

- **OFFER config, pre-`SALES_APPROVED`** → governed by the **offer revision**: editable only while the
  owning revision is `DRAFT` (and only by offer-access roles). **Fail-closed** — a missing revision status
  means not editable, which also means ENGINEER cannot edit a pre-handoff OFFER config.
- **OFFER config at `SALES_APPROVED`+**, and **all STANDALONE configs** → governed by `ConfigurationStatus`
  (the engineering rules), regardless of `origin`.
- `SALES_APPROVED`, `TECH_APPROVED`, `CLOSED` → **read-only for all roles**.
- `SALES` / `SALES_MANAGER` / `SALES_DIRECTOR` → editable only in `DRAFT` (OFFER, revision `DRAFT`);
  `ENGINEER` / `ADMIN` → `DRAFT` (standalone) and `IN_TECH_REVIEW` (OFFER).

**Frozen States:** To edit a `SALES_APPROVED` config an engineer pulls it forward to `IN_TECH_REVIEW`. To
edit a `TECH_APPROVED`/`CLOSED` config, an ENGINEER/ADMIN must transition it back to `IN_TECH_REVIEW`
(OFFER) or reopen it to `DRAFT` (standalone). To
re-open a sent offer, sales create a new revision (clone-forward); to re-quote an **accepted** offer,
ADMIN/SALES_DIRECTOR open a renegotiation revision (commercial-only, configs untouched).

## Offer Access

The **offer** is gated separately from the **configuration**: `isEditable` governs the config,
`canViewOffer` (`lib/access.ts`) governs the offer — deliberately different role sets.

- `canViewOffer` = SALES roles + `ADMIN`. **ENGINEER is excluded.**
- The offer route (`app/offerte/[id]/layout.tsx`) redirects disallowed roles.
- Every offer action runs `canViewOffer` first via `authorizeOfferAction` — **before** `isEditable` — so
  ENGINEER is rejected even where `isEditable` would otherwise allow it.
- Revision transitions are gated by `canTransitionRevision` (`app/actions/lib/auth-checks.ts`); the
  approval edges additionally require `canApproveRevision`.

Commercial terms (header discount / transport / installation) are mutable only while the working revision
is `DRAFT`, by offer-access roles. The margin page (`canViewMarginReview` = ADMIN/SALES_DIRECTOR) reads the
line `pricing_snapshot` + `net_price` and surfaces the at-acceptance as-sold freeze date.

## Scope (Visibility)

- **Configs:** `configScopeWhere(user)` builds the list/count filter; `canAccessConfiguration(user, config)`
  is the single-record gate (now also denies ENGINEER on pre-handoff OFFER configs). SALES = own;
  SALES_MANAGER = own + direct reports; SALES_DIRECTOR / ENGINEER / ADMIN = all (within the above rule).
- **Offers:** `offerScopeWhere(user)` — ENGINEER none; SALES own; SALES_MANAGER own + reports;
  SALES_DIRECTOR / ADMIN all.
- **Technical queue:** `getUserConfigurations` returns the engineer/admin queue — STANDALONE (all statuses)
  ∪ OFFER (`SALES_APPROVED`+). Pre-handoff offer configs never appear there.

**Landing:** the home page (`app/page.tsx`) redirects each role to its primary workspace — SALES roles →
`/offerte`, ENGINEER → `/configurazioni`, ADMIN → the cross-status dashboard.

**Validation:** Every Server Action MUST run `isEditable(status, role, origin, offerRevisionStatus?)` before
any DB update, and `canAccessConfiguration` (or fetch via the scoped `getConfigurationWithTanksAndBays`) for
ownership; every offer action MUST run `authorizeOfferAction` first.
