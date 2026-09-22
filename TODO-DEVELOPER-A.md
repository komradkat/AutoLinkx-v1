# AutoLinkX — your detailed TODO

Owner: **Developer A (you)**, using Claude Code and Codex.

Parent board: [TODO.md](TODO.md). Product scope: [MVP.md](MVP.md). Architecture: [README.md](README.md).

This document expands A-01 through A-24 without changing Developer B's ownership. All checkboxes are pending verification, not claims that no work has started. Existing configuration, lockfiles, CI files, and local changes must be inspected before editing. Do not overwrite work from the other developer or another assistant.

## How to use this checklist

Work one task per branch/PR where practical. For large tasks, use the numbered subtasks below as smaller PR boundaries. Record the commit, tests run, and handoff before checking off the parent task in TODO.md. Never mark backend functionality complete solely because its UI works with fixtures.

You own database migrations, server modules/actions/queries, contracts, authentication handlers, upload/media handlers, package configuration, CI, and deployment preparation. Developer B owns pages, components, styling, and browser tests. Coordinate any exception before changing the same files.

### Start here

- [x] Review current git status, existing scaffold, and any `AGENTS.md`; preserve unrelated changes.
- [x] Claim A-01/A-02 and create a task branch from the agreed integration branch.
- [x] Publish initial contracts so B can build against stable shapes.
- [x] Verify the toolchain and share a clean-checkout startup command.
- [x] Start local Supabase and establish the first migration/test cycle.
- [ ] Complete accounts and profile isolation before implementing listing mutations.

## Stage 1 — Foundation and accounts

### A-01 — Define the frontend/backend contract

**Dependencies:** existing MVP and shared TODO. **Files:** `docs/contracts.md`, `src/contracts/**`.

- [x] Define safe `Viewer`, `PublicListing`, `OwnerListing`, photo, profile, inquiry, and report DTOs. Keep database rows and public DTOs distinct.
- [x] Define listing-status and command unions using the agreed six statuses and transition table.
- [x] Define a serializable action result: success data or safe error code/message, field errors, and optional retry guidance. Distinguish forbidden, unauthenticated, invalid, conflict, unavailable, and rate-limited.
- [x] Specify ID types, integer price units, currency source, kilometers, timestamp serialization, nullable fields, and expected-version handling.
- [ ] Specify action/query names and inputs; derive seller, buyer, and administrator identity on the server rather than accepting actor IDs.
- [x] Specify URL search parameters, sort values, page size 12, count semantics, invalid-range behavior, and stable ordering.
- [x] Specify upload request/response, staged-photo references, attachment, cover/reorder inputs, and media delivery route.
- [x] Specify confirmation/reset routes, post-auth destinations, and expired-link responses.
- [ ] Ask B to review contracts against their screens; resolve missing fields and document the agreed version.

**Done when:** B can create typed fixtures and forms without guessing fields or receiving private data. Contract modules contain no server clients or secret configuration.

**Status (2026-09-22):** **merged to `main`** in PR #1 (merge commit `ad7a202`, contract commit `9bc970e`); **B's review still outstanding**. `src/contracts/**` and `docs/contracts.md` exist and are covered by 29 passing tests, including a check that the transition table still matches MVP.md section 6. Proposed interfaces only: no table, RPC, service, or handler implements them. Remaining: B's B-01 review of the five open questions at the end of `docs/contracts.md`, and a canonical list of action/query function names, which lands with A-06 and A-09.

### A-02 — Verify the scaffold and development toolchain

**Dependencies:** none; run alongside A-01. **Files:** package/lockfile, runtime/TypeScript/Next.js config, test configuration.

- [x] Inspect existing versions and scripts; verify published versions and actual compatibility before installing or changing them.
- [x] Pin the runtime and commit a reproducible lockfile. Confirm a clean `npm ci` works.
- [x] Verify TypeScript strict mode, import aliases, and server/client module boundaries.
- [x] Establish working dev, build, typecheck, lint, and meaningful test commands; do not report an empty test suite as verification.
- [ ] Coordinate the minimal app shell with B so the project builds without competing edits to root layout/styles.
- [x] Check `.gitignore` excludes credentials, local service state, generated output, and dependencies while preserving `.env.example`.
- [x] Record exact runtime requirements and commands; identify scripts pointing to files that do not yet exist.

**Done when:** the agreed shell starts and builds from a clean install, and B can reproduce the setup.

**Status (2026-09-22):** **merged to `main`** in PR #1 (merge commit `ad7a202`, commits `33c939e`, `246c6a3`, `9fa208a`); **not reviewed by B**. CI has never executed: GitHub Actions is blocked by an account billing lock, so the workflow is unproven on a runner. Verified on Node.js 24.19.0 / npm 11.17.0: clean `npm ci`, `npm run lint`, `npm run typecheck`, `npm test` (29 tests), `npm run build`, and `npm run dev` serving the placeholder page with the configured security headers. `npm audit` reports no vulnerabilities after the sharp 0.35.4 bump. Remaining: agree the placeholder `src/app/layout.tsx` and `page.tsx` with B so B-02 replaces them, and merge. Still missing by design: `scripts/seed.mjs` and `supabase/tests/` for `db:seed:local` and `test:db`, plus `db:types`, `admin:create:local`, and `test:e2e`, which belong to A-03, A-06, and B.

### A-03 — Local Supabase, configuration, and migrations

**Dependencies:** A-02. **Files:** `supabase/config.toml`, migrations, environment validation, local scripts.

- [x] Verify the Docker engine is running; start the local Supabase stack and record API, Studio, database, and mail-capture locations.
- [x] Configure Auth site/redirect URLs and local email confirmation/recovery behavior.
- [x] Validate environment variables at startup with actionable missing/invalid configuration errors; never print secret values.
- [x] Separate normal publishable configuration from privileged runtime and migration credentials.
- [x] Implement a data-preserving migration command explicitly targeting local Supabase; keep reset commands restricted to disposable tests or explicit requests.
- [x] Establish one timestamped SQL migration history and generated TypeScript database types; document how types are regenerated.
- [x] Test both fresh setup and applying the next migration without losing existing fixture data.
- [x] Document schema changes versus project settings: buckets, redirect URLs, templates, and SMTP may need explicit reconciliation.

**Done when:** both developers can reproduce the same local services/schema without touching hosted projects.

**Status (2026-09-22):** implemented and locally verified on branch `dev-a/A-03-local-supabase-migrations` (commits `ddca74f`, `f2fbe6e`, `cb27a18`); **not reviewed, not merged**. Local ports are offset to 544xx (API 54421, database 54422, Studio 54423, mail capture 54424) because another local Supabase project occupies the defaults. Verified: fresh apply of the baseline migration, `anon`/`authenticated` hold no privileges on `app_private`, `set_updated_at` has a pinned search path and no browser execute grant, a later migration applied without losing existing rows, `npm run db:types` regenerates cleanly, and REST/Auth/Studio/mail all respond. No hosted project is linked and every script passes `--local`. Remaining: none inside A-03; database permission tests with real user credentials belong to A-05 and A-07.

### A-04 — Supabase clients and verified identity

**Dependencies:** A-03. **Files:** `src/server/supabase/**`, `src/server/auth/**`, `src/proxy.ts`.

- [x] Implement a request-scoped server client using the supported SSR cookie adapter.
- [x] Implement token refresh with the pinned Next.js/Supabase integration and propagate refreshed cookies correctly.
- [x] Provide verified identity helpers; never authorize from unverified session data or client-submitted identity.
- [x] Return safe viewer DTOs and distinguish anonymous, confirmed, and administrator capabilities.
- [x] Isolate the secret/service-role client behind `server-only`; prohibit imports from UI/contract modules.
- [x] Ensure normal user queries/RPCs retain the caller's identity rather than bypassing RLS with privileged credentials.
- [x] Map auth failures to controlled responses; ensure personalized/cookie responses cannot enter shared caches.
- [x] Test expired/malformed sessions and cross-request isolation; avoid module-level clients holding user session state.

**Done when:** actions and handlers can independently verify users without exposing tokens or granting service-role access.

**Status (2026-09-22):** implemented and locally verified on branch `dev-a/A-04-supabase-clients-identity` (commits `e434327`, `1d9b0dd`); **not reviewed, not merged**. Verified against the running local Auth server: sign-in lands in cookies, a client rebuilt from those cookies sees the same user, tampered and malformed cookies degrade to anonymous, two sessions stay isolated, auth cookie writes carry `Cache-Control: no-store`, and a planted `is_admin` value in user metadata is ignored. 92 unit tests pass, plus 8 integration tests that skip when the stack is down. **Administrator membership fails closed** — `isAdministrator()` returns false until A-05 adds the table, so no moderation path can succeed early. Remaining: proxy-level refresh of a genuinely expiring session is only verified indirectly; A-06 and A-07 exercise it with real sign-in flows.

### A-05 — Profiles, privacy, and administrator membership

**Dependencies:** A-03/A-04. **Files:** account migrations, account queries/services, database tests.

- [ ] Add public-profile and private-contact records referencing Supabase users; initialize profiles safely on signup/retry.
- [ ] Add protected administrator membership in a non-publicly writable location. Never use editable user metadata as authority.
- [ ] Define explicit publication preferences, defaulting to private; synchronize opted-in public values atomically.
- [ ] Enable RLS and minimal grants; separate private fields physically or through deliberately safe projections because RLS alone does not hide columns.
- [ ] Prevent profile updates from changing user ownership, role membership, or another user's contact settings.
- [ ] Define current-membership administrator checks safe for use by policies/functions without recursive policy failures.
- [ ] Test anonymous, owner, different user, and administrator access using ordinary credentials and direct API calls.

**Done when:** profile initialization works, contacts remain private by default, and users cannot promote themselves.

### A-06 — Account actions, callbacks, and profile editing

**Dependencies:** A-01/A-04/A-05. **Files:** accounts actions/schemas/services; Auth callback handlers.

- [x] Implement registration, email confirmation, login, and logout with bounded inputs and safe action results.
- [x] Implement recovery request, callback verification, and password update; test invalid, expired, and reused links.
- [x] Allowlist return destinations; reject external/protocol-relative redirect targets and avoid logging token-bearing URLs.
- [x] Use generic recovery responses and configure Auth's own rate controls; direct Auth calls bypass Next.js-only throttling.
- [x] Implement profile/contact preference updates using current identity and validated fields.
- [ ] Verify logout/password-reset session behavior, including the validity window of already issued access tokens; document actual behavior.
- [x] Provide an explicit operator-only administrator bootstrap command with secure input and no shipped credentials; later seed tooling reuses it.
- [ ] Send B action signatures, safe errors, confirmation flow, and local mail instructions for B-05 integration.

**Done when:** account and profile flows work against real local Auth, including recovery and invalid redirects.

**Status (2026-09-23):** implemented on branch `dev-a/A-06-account-actions-screens`; **PR #6 open, not reviewed, not merged**. Verified against real local Auth: registration, profile creation from the sign-up name, sign-in refused until confirmation, sign-in after confirming, profile editing, consent-gated publication, sign out, recovery for known and unknown addresses, and a password change refused without a session. Sign-in and registration return identical messages for wrong password and unknown account, so neither form is an account-existence oracle. The redirect allowlist has 10 tests covering absolute, protocol-relative, backslash, javascript and traversal targets.

**Unverified:** the two cases that follow the confirmation link out of the mail catcher. They need Supabase restarted to load the new email templates, and Docker stopped responding (full disk) before that could run.

**Also delivered, outside A's ownership and agreed with the user:** the five account screens and the shared form controls, which cover B-03 and most of B-02 and B-04. Session behaviour after logout and password reset is **not yet documented** — the checklist item asking for the residual validity of already-issued access tokens is still open and belongs with A-07.

### A-07 — Foundation tests and baseline CI

**Dependencies:** A-02 through A-06.

- [ ] Create isolated test actors: anonymous, unconfirmed, confirmed seller A, confirmed seller B, and administrator.
- [ ] Add direct API tests for contact privacy, ownership, grants, administrator escalation, and profile initialization.
- [ ] Add service tests for invalid account/profile inputs and safe error mapping.
- [ ] Establish CI install/typecheck/lint/tests/build with disposable local Supabase and no hosted secrets for untrusted PRs.
- [ ] Run tests and share the verified environment with B; do not bypass failed checks to unblock fixture UI.

**Gate G1:** clean-checkout startup and live account flows work; privacy and role controls pass.

## Stage 2 — Seller workflow

### A-08 — Listing, photo, audit, and upload schemas

**Dependencies:** G1. **Files:** listing migrations and generated types.

- [ ] Add the agreed specification fields, integer minor-unit price, mileage, six statuses, expected version, and timestamps.
- [ ] Define draft versus submission validation: permit useful incomplete drafts if chosen, but enforce complete valid values before review. Document this contract for B.
- [ ] Add foreign keys, numeric/text bounds, valid enum/status checks, and seller/status/publication indexes.
- [ ] Add photo metadata, ordered positions, and an at-most-one-cover constraint; define cover fallback after removal.
- [ ] Add immutable listing events and staged-upload state with ownership, validation marker, expiry, and attachment state.
- [ ] Enable RLS; allow public reads only for published rows and private previews only to owners/administrators.
- [ ] Revoke direct listing/photo/status mutations from browser roles so callers must use controlled commands.
- [ ] Regenerate types and test constraints/grants on a fresh database and an upgrade.

**Done when:** direct table operations cannot bypass ownership, moderation, or validated-photo attachment.

### A-09 — Transactional listing lifecycle

**Dependencies:** A-08/A-01.

- [ ] Implement draft create/save and submit/archive/restore/sold commands with authenticated ownership checks.
- [ ] Implement approval/rejection transition primitives now; A-19 later exposes administrator queues/actions. Never allow self-moderation.
- [ ] Centralize the transition matrix from MVP.md and reject unknown actions/states.
- [ ] Require complete submission fields and at least one attached, validated photo.
- [ ] Lock the target listing and compare expected versions. Save details/status/version/audit together; reject stale work without partial writes.
- [ ] Detect substantive edits including photo order/cover: published → pending_review; pending_review → draft; draft/rejected keep their state.
- [ ] Require reasons for rejection/removal and preserve safe owner feedback separately from internal data.
- [ ] Review every security-definer function: safe search path, qualified objects, minimum EXECUTE grants, actor derived from `auth.uid()`, and explicit checks.
- [ ] Map database outcomes into agreed action errors without exposing SQL details.

**Done when:** the database, not just the UI, enforces every allowed/denied transition and atomic edit.

### A-10 — Validated photos and private delivery

**Dependencies:** A-08/A-09. Split into upload, attachment, and delivery/cleanup PRs if needed.

- [ ] Configure a private bucket and deny unrestricted browser object writes/reads.
- [ ] Add an authenticated bounded upload handler with origin checks, owner checks, 5 MB per-file limit, and maximum 10 attached photos.
- [ ] Inspect/decode actual JPEG/PNG/WebP bytes, enforce pixel/concurrency limits, normalize using Sharp, strip metadata, and generate random keys.
- [ ] Create server-owned validation/staging records that callers cannot forge; bind every staged object to its owner.
- [ ] Attach photos through a transaction enforcing stage validity, listing ownership/version, count, cover/order, and review consequences.
- [ ] Handle storage-success/database-failure and retries: retain old referenced images until the replacement commits and track unattached objects for cleanup.
- [ ] Deliver images through current listing/owner/admin checks with private/no-store responses; exclude this route from shared image caching.
- [ ] Avoid long-lived signed URLs that outlive publication decisions; never serve draft objects from predictable public paths.
- [ ] Add leased/retry-safe cleanup using the Storage API; do not delete storage metadata as a substitute for deleting object bytes.
- [ ] Test corrupt/mislabelled files, oversized inputs, pixel bombs, other users' stage references, interrupted uploads, and private-media access.

**Done when:** photo changes are validated, atomic at attachment, and unavailable photos cannot be newly fetched without authorization.

### A-11 — Owner queries and seller handoff

**Dependencies:** A-09/A-10.

- [ ] Implement paginated owner inventory with status filters, private preview, and owner-safe rejection/audit history.
- [ ] Return allowed actions as UI hints while retaining command-level authorization.
- [ ] Test seller A against seller B's IDs across queries, commands, media, and staged uploads.
- [ ] Exercise the full transition table and concurrent edits with independent clients; verify rollback leaves no partial state.
- [ ] Hand B-06 through B-09 working actions, fixture IDs, expected conflicts, and upload integration examples.

**Gate G2:** seller workflow works without ownership leaks or unreviewed publication.

## Stage 3 — Discovery

### A-12 — Public queries and privacy projections

**Dependencies:** A-08/A-10; can start before all seller UI is integrated.

- [ ] Implement homepage/latest, public detail, photo metadata, and opted-in seller projection.
- [ ] Require published status on every public entry point, including administrator viewers using public routes.
- [ ] Explicitly select safe columns; never return an entire Auth user, profile/private-contact join, or moderation row.
- [ ] Keep status-sensitive public availability fresh and private previews separate.
- [ ] Define consistent unavailable/not-found behavior without leaking hidden listing details.

**Done when:** public responses expose only published cars and approved public fields.

### A-13 — Search, filtering, sorting, and pagination

**Dependencies:** A-12/A-01.

- [ ] Validate keyword length, IDs/choices, numeric bounds, contradictory ranges, and positive page numbers.
- [ ] Support make/model, year/price ranges, mileage ceiling, transmission, fuel, condition, and location.
- [ ] Parameterize SQL/RPC inputs and escape wildcard literals; never concatenate raw Supabase filter expressions.
- [ ] Whitelist newest, price ascending/descending, year descending, and mileage ascending, with deterministic ID tie-breakers.
- [ ] Return 12 results/page with matching publication-filtered count and page metadata; bound excessive inputs and define out-of-range behavior.
- [ ] Inspect representative query plans/index usage without adding an external search system.

**Done when:** B can map URL state to a stable, validated search result contract.

### A-14 — Discovery verification and handoff

**Dependencies:** A-12/A-13.

- [ ] Seed cars with overlapping make/model names, boundary prices/years, and all six statuses.
- [ ] Test combined filters, case handling, wildcard/special characters, equal-sort tie-breaks, empty results, and pagination boundaries.
- [ ] Test anonymous/direct API visibility and assert private fields are absent from serialized output.
- [ ] Verify published → sold/rejected/pending_review removes public availability and blocks fresh unauthorized media access.
- [ ] Send B-10 through B-12 example parameters, result shapes, and checked edge cases.

**Gate G3:** published-only discovery and contact privacy pass across all public paths.

## Stage 4 — Interactions

### A-15 — Favorites and interaction schema

**Dependencies:** A-08/A-12.

- [ ] Add favorites/inquiry/report records, appropriate foreign keys/indexes, RLS, and minimal grants.
- [ ] Add favorite user/listing uniqueness and idempotent add/remove commands.
- [ ] Derive user identity internally and scope saved-list queries to that user.
- [ ] Define unavailable-favorite DTOs containing no hidden car data; allow removal without granting access to the unavailable listing.
- [ ] Test duplicate requests and simultaneous favorite creation against the unique constraint.

**Done when:** repeated saves are safe and saved listings do not bypass public visibility.

### A-16 — Inquiry transaction and seller inbox

**Dependencies:** A-15/A-09.

- [ ] Validate confirmed identity and bounded message; reject self-inquiries.
- [ ] Lock the listing using the same ordering as lifecycle commands, require published status, enforce limits, and insert atomically.
- [ ] Implement buyer/owner read rules and owner-scoped paginated inbox with controlled mark-read action.
- [ ] Do not disclose the buyer's account email automatically; preserve only voluntarily supplied message content.
- [ ] Explain initial-message/outside-app reply behavior in the handoff contract; do not introduce chat threads.

**Done when:** legitimate messages reach only the correct seller and race safely with a sale or removal.

### A-17 — Reports and spam limits

**Dependencies:** A-15/A-16; share account-limit helpers with inquiries.

- [ ] Add confirmed-user report command with bounded category/explanation and a valid reportable target.
- [ ] Enforce one open report per reporter/listing and keep internal resolution notes out of reporter projections.
- [ ] Enforce inquiry/report account limits atomically inside RPCs: 5 inquiries/hour, 1 per listing/10 minutes, 5 reports/day.
- [ ] Make counter updates safe across concurrent submissions; define window boundaries and which failed attempts count.
- [ ] Add duplicate handling and honeypot validation without treating honeypots as the only control.
- [ ] Add trusted-IP throttling at ingress/server handlers; never trust an IP argument from a public RPC caller.
- [ ] Return safe retry guidance and use bounded-retention hashed IP keys; document that direct API calls remain governed by account limits.

**Done when:** duplicate/spam submissions cannot bypass account limits by calling Supabase directly.

### A-18 — Interaction concurrency and access tests

**Dependencies:** A-15 through A-17.

- [ ] Use independent clients for simultaneous favorite writes and inquiry/sale transactions; do not simulate concurrency with sequential calls.
- [ ] Verify that whichever listing transaction obtains the lock first determines the accepted inquiry/sale ordering.
- [ ] Test anonymous, unconfirmed, self, other-seller, and administrator access where relevant.
- [ ] Attempt direct table/RPC writes that bypass the normal form, alter actor IDs, or exceed limits.
- [ ] Assert private inbox/report notes are inaccessible to unrelated users and limit windows behave at boundaries.
- [ ] Hand off commands, inbox queries, safe errors, and retry behavior to B-13 through B-16.

**Gate G4:** interactions preserve uniqueness, availability, and privacy under direct access and concurrency.

## Stage 5 — Moderation and readiness

### A-19 — Administrator query/action integration

**Dependencies:** A-09/A-17. Reuse lifecycle primitives; do not build a second state machine.

- [ ] Add paginated pending/reported queues and protected listing/report detail projections.
- [ ] Recheck current database administrator membership for sensitive queries/actions.
- [ ] Expose approve/reject/removal with expected version and required rejection/removal reason; deny self-moderation.
- [ ] Add resolve/dismiss report actions with notes/resolver/time and a stale-decision strategy.
- [ ] Keep report resolution separate from listing removal; one must not silently imply the other.
- [ ] Return audit history with owner-safe and administrator-specific projections.
- [ ] Provide B-17/B-18 integration examples and permission/conflict responses.

**Done when:** all moderation commands are auditable and inaccessible to unauthorized users.

### A-20 — Moderation security verification

**Dependencies:** A-19.

- [ ] Attempt approval by seller, ordinary user, administrator-owner, and unrelated administrator.
- [ ] Test concurrent edits/decisions, repeated resolution, missing reasons, and forbidden transition requests.
- [ ] Revoke administrator membership and verify sensitive commands no longer succeed merely because an old UI/session showed administrator controls.
- [ ] Exercise direct RPC calls and ensure public/reporter DTOs omit internal notes.
- [ ] Review SQL grants, function owners/search paths, and every service-role call site before integrating moderation.

**Done when:** permission, conflict, and audit tests pass without using a privileged client as the test actor.

### A-21 — Sample data and operator tooling

**Dependencies:** account, listing, interaction, and moderation schemas.

- [ ] Reuse A-06 administrator bootstrap; securely accept credentials without checked-in usable passwords.
- [ ] Implement local-only repeatable seed commands that verify the exact local target and refuse hosted endpoints by default.
- [ ] Create fictional actors through supported Auth administration APIs and placeholder photos through Storage operations.
- [ ] Add every listing status and representative favorites, inquiries, reports, and audit events for B's browser tests.
- [ ] Preserve unrelated users/data on rerun; namespace fixture identities and avoid truncation/deletion as a normal seeding strategy.
- [ ] Document prerequisites, credentials handling, limitations, and how B selects test actors.

**Done when:** both developers can reproduce test scenarios without harming existing data.

### A-22 — Build, CI, health, and maintenance

**Dependencies:** G1 through G4; finalize with moderation integration.

- [ ] Complete non-root multi-stage web and tools images, copying required standalone/static assets and migration/CLI dependencies appropriately.
- [ ] Verify startup configuration, graceful termination, upload/resource bounds, liveness, and non-sensitive readiness.
- [ ] Add redacted structured logs with request/release IDs and actionable error categories.
- [ ] Package cleanup jobs with leases, retry-safe batches, and explicit environment targeting.
- [ ] Complete CI typecheck/lint/unit/database/build checks and integrate B's browser suite.
- [ ] Validate fresh/upgrade migrations and generated-type drift in disposable environments; no resets of hosted or user databases.
- [ ] Document public build-time configuration versus runtime secrets and verify privileged values do not enter client assets.

**Done when:** a reviewed artifact can be built and tested reproducibly; templates are not claimed as a live deployment.

### A-23 — Deployment and recovery runbooks

**Dependencies:** A-22. Documentation/preparation only unless separately authorized to deploy.

- [ ] Document environment isolation, Supabase project selection, domains/redirects, SMTP, bucket setup, and minimum credentials.
- [ ] Define staged artifact promotion, migration lock, additive schema rollout, smoke checks, and previous-image retention.
- [ ] Explain rollback compatibility and when a forward fix is required; do not automatically reverse data migrations or security fixes.
- [ ] Specify database backup/PITR and separate Storage-object backup/manifest handling; database backups do not contain image bytes.
- [ ] Write isolated restore and verification steps for users, grants/RLS, listings, and photo references.
- [ ] Record proposed recovery targets, retention, monitoring, and responsible operator; mark service-dependent values undecided until chosen.
- [ ] Distinguish written procedures from actual staging/deployment/restore drills. Record unrun drills as launch blockers, not completed checks.

**Done when:** release and recovery preparation is reviewable; no infrastructure is provisioned merely to complete this document task.

### A-24 — Final integration and handoff

**Dependencies:** A-20 through A-23 and B's complete journey tests.

- [ ] Integrate against the agreed branch; preserve B's UI ownership and resolve contract drift explicitly.
- [ ] Run all available checks and B's seller → approval → inquiry → sold browser journey against local Supabase.
- [ ] Fix server defects; route UI defects to B with actor, route, reproduction, and expected/actual behavior.
- [ ] Review direct API access alongside the rendered UI; check that fixtures have not become production fallbacks.
- [ ] Update README with actual install/start/migration/seed/admin commands, runtime version, and implemented versus planned features.
- [ ] Record test results, remaining issues, configuration requirements, and unperformed hosted checks.
- [ ] Update parent task checkboxes only after reviewed changes merge; obtain B's review of contracts and integration.

**Gate G5:** the local MVP journey and automated checks pass. Production readiness remains conditional on the separate staging, email, deployment, and restore verification in MVP.md.

## Your handoffs to Developer B

| When | Give B | Unblocks |
| --- | --- | --- |
| A-01/A-02 | Contracts, fixture shapes, runnable shell, commands | Shared UI and account screens |
| A-06/A-07 | Account actions, callback behavior, local mail setup | Live account/profile integration |
| A-09 through A-11 | Seller queries/actions, upload flow, status/conflict responses | Seller dashboard/editor |
| A-12 through A-14 | Public DTOs, filter contract, media URLs | Homepage/search/details |
| A-15 through A-18 | Favorites/inquiries/reports, inbox, retry errors | Interaction screens |
| A-19 through A-21 | Moderation commands, test actors, scenarios | Administrator UI and full browser journey |

Do not wait for your entire backend to finish before handing over a completed interface. Keep each handoff small and backed by working tests.

## Working with Claude Code and Codex

Use either assistant to implement the claimed task and the other to review the resulting diff. Do not let both edit the same checkout simultaneously. Concurrent work requires separate worktrees and clearly separate files; migrations and dependency changes still have one active owner.

Reusable task prompt:

```text
I am Developer A on AutoLinkX. Read TODO-DEVELOPER-A.md, TODO.md,
MVP.md, README.md, and applicable AGENTS.md instructions.
Implement A-XX only, respecting its dependencies and file ownership.
Inspect the current repository first; preserve unrelated changes.
Use the agreed Next.js + Supabase architecture and shared contracts.
Enforce permissions in server/database paths, including direct API calls.
Add and run the focused checks required by this task.
Do not modify Developer B's UI without coordination or deploy anything.
Finish with changed behavior, checks actually run, gaps, and B's handoff.
```

Reusable review prompt:

```text
Review the current diff for A-XX against TODO-DEVELOPER-A.md and MVP.md.
Do not edit files. Prioritize authorization/RLS bypasses, private-data
leaks, invalid transitions, concurrency, migrations, and contract drift.
Report concrete findings with file locations and reproduction cases.
Separate verified failures from concerns that still need a test.
```

### Completion record for each PR

```text
Task/subtasks:
Branch/commit:
Behavior and contracts delivered:
Migrations/configuration required:
Checks actually run / results:
Unverified behavior or blockers:
Handoff to B:
Reviewer / merge reference:
```
