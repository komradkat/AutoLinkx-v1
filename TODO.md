# AutoLinkX MVP — two-developer task board

Scope: [MVP.md](MVP.md). Technical reference: [README.md](README.md).

Developer A: use [your detailed checklist](TODO-DEVELOPER-A.md) for the implementation steps, tests, and handoffs behind A-01 through A-24.

This is an implementation work allocation, not a record of completed features. All tasks begin unchecked. Existing scaffold files must be inspected and verified before reuse.

## Ownership

| Owner | Primary responsibility | Coding tools |
| --- | --- | --- |
| **A — You** | Supabase, authentication, server services/actions, permissions, transactions, uploads, CI and deployment preparation | Claude Code and Codex |
| **B — Other developer** | Next.js pages, shared UI, forms, seller/buyer/admin interfaces, accessibility and browser tests | Gemini |

The split follows code boundaries rather than assumptions about model capability. A owns correctness and data access; B owns the user experience and calls A's published interfaces. Both review security-sensitive flows and integration results. These are parallel workstreams, not a promise of equal task counts or hours; reassess workload after the foundation milestone.

## File boundaries

| Files | Primary owner | Coordination rule |
| --- | --- | --- |
| `supabase/**`, generated database types | A | Only A authors migrations; B requests changes through the contract |
| `src/server/**`, `scripts/**` | A | Session, storage, security, configuration, and operational code |
| `src/features/*/actions.ts`, `queries.ts`, `schemas.ts`, `service.ts` | A | Public application interfaces consumed by pages |
| `src/contracts/**` | A, reviewed by B | Shared plain types and safe result shapes; no database clients or secrets |
| `src/app/**` | B, with exceptions below | Pages, layouts, loading/error states, and UI composition |
| `src/app/auth/confirm/route.ts`, `src/app/auth/callback/route.ts` | A | Auth callback handlers, separate from B's account pages |
| `src/app/media/**`, `src/app/api/uploads/**`, `src/app/api/health/**` | A | Media/upload/health handlers |
| `src/proxy.ts` | A | Auth token refresh; never a substitute for server authorization |
| `src/components/**`, `src/features/*/components/**`, `public/**`, styles | B | Presentation and static branding only; no uploaded vehicle images |
| Database/service/integration tests | A | RLS, grants, ownership, transitions, races, upload validation |
| UI tests and `tests/e2e/**` | B | Browser journeys, form behavior, accessibility, responsive checks |
| Package/lockfile, TypeScript/Next.js config, `.env.example`, Docker, CI, `infra/**` | A | B requests dependency/config changes; avoid competing lockfile edits |
| `README.md`, `MVP.md`, `TODO.md`, `docs/contracts.md` | A integrates, B reviews | Propose documentation updates in the relevant PR; avoid unrelated rewrites |

Client Components may import plain contracts and supported Server Actions, but must not import privileged clients or server query modules. Browser fixtures must never become an authentication or data fallback in production.

## Agree these interfaces first

- [ ] **A-01:** Publish `docs/contracts.md` and `src/contracts/` with B's review before connecting pages to live data. *(Written and locally verified on `dev-a/A-01-A-02-contracts-and-scaffold`; awaiting B's review and merge.)*
- [ ] **B-01:** Review the contract against every required screen and create test-only fixtures with the same shapes.

The contract must define:

| Interface | Minimum agreement |
| --- | --- |
| Public listing | ID, specifications, formatted/raw price conventions, ordered media URLs, public seller projection; no private contacts |
| Owner listing | Public fields plus status, expected version, allowed actions, and owner-safe rejection history |
| Identity | Safe viewer ID/display name, signed-in/confirmed state, administrator capability; never tokens |
| Mutations | Common success/error result with field errors, safe message, and codes for unauthenticated, forbidden, invalid, conflict, unavailable, and rate-limited |
| Listing commands | Create/save/submit/archive/restore/sold/moderate inputs; expected version on updates; no caller-assigned owner |
| Search | URL keys, supported filters, sort values, page size, pagination/count shape, invalid-range behavior |
| Media | Single-file upload endpoint, size/types, response shape, staged attachment flow, order/cover inputs, authorized URL delivery |
| Interactions | Favorite add/remove, inquiry creation/inbox, report create/resolve; duplicate and unavailable behavior |
| Auth | Server-action inputs/results, confirmation/reset routes, safe redirects, expired-link behavior |

Changes to a published contract need a small joint review and updates to fixtures/tests in the same PR. Do not silently rename fields while the other branch depends on them.

## Stage 1 — Foundation and accounts

### A — Your TODOs

- [ ] **A-02:** Verify preliminary scaffold; pin compatible dependencies/runtime; provide working dev, typecheck, test, and build scripts. *(Done and locally verified on `dev-a/A-01-A-02-contracts-and-scaffold`; awaiting review and merge.)*
- [ ] **A-03:** Configure local Supabase and data-preserving migrations; provide `.env.example` and reproducible startup steps. *(Done and locally verified on `dev-a/A-03-local-supabase-migrations`; awaiting review and merge.)*
- [ ] **A-04:** Implement request-scoped Supabase clients, SSR token refresh, verified identity, and isolated privileged clients.
- [ ] **A-05:** Add profiles/private contacts/administrator membership, initialization, RLS, grants, and safe projections.
- [ ] **A-06:** Implement register/confirm/login/logout/recovery/profile actions, safe redirects, and operator-only administrator bootstrap.
- [ ] **A-07:** Test account permissions, profile isolation, role escalation denial, and recovery behavior; add baseline CI.

### B — Other developer's TODOs

- [ ] **B-02:** Build design tokens, typography, responsive header/footer, buttons, inputs, status badges, and listing-card component.
- [ ] **B-03:** Build registration/login/confirmation/recovery/profile screens against A-01 contracts.
- [ ] **B-04:** Add app loading/error/not-found states, pending forms, inline errors, and keyboard focus behavior.
- [ ] **B-05:** Connect account screens to A-06; test confirmation, recovery, logout, and private contact preferences in a browser.

**Can run in parallel:** B-01 through B-04 can use fixtures while A prepares Supabase.  
**Gate G1:** both developers can start the app from a clean checkout; account flows work against local Supabase; private contacts and administrator membership are protected. Merge the foundation before feature branches build on it.

## Stage 2 — Seller workflow

### A — Your TODOs

- [ ] **A-08:** Add listing/photo/audit/staging tables, constraints, indexes, grants, and RLS.
- [ ] **A-09:** Implement atomic lifecycle RPCs and server actions with owner checks, self-moderation denial, expected versions, and substantive-edit review rules.
- [ ] **A-10:** Implement bounded image decoding/normalization, private upload/delivery, transactional attachment, and retry-safe orphan cleanup.
- [ ] **A-11:** Expose owner inventory/preview/history queries and test all transitions, stale edits, forged ownership, invalid uploads, and unauthorized media access.

### B — Other developer's TODOs

- [ ] **B-06:** Build seller dashboard with statuses, appropriate actions, rejection feedback, and empty states.
- [ ] **B-07:** Build vehicle form, ordered photo management, cover selection, and owner preview.
- [ ] **B-08:** Connect save/submit/archive/restore/sold actions; display field errors, stale-edit feedback, and confirmations.
- [ ] **B-09:** Browser-test draft creation, photo changes, submission, and editing an already published listing.

**Dependency:** B-06/B-07 can start with fixtures; live integration needs A-08 through A-11.  
**Gate G2:** seller A cannot alter seller B's cars; valid published changes remove public availability; invalid edits preserve the old listing.

## Stage 3 — Buyer discovery

### A — Your TODOs

- [ ] **A-12:** Implement public listing/detail/seller queries with publication filtering and explicit safe projections.
- [ ] **A-13:** Implement bounded keyword/filter/sort/pagination queries and deterministic ordering.
- [ ] **A-14:** Test every status through Next.js and direct Supabase requests; test filtering, invalid ranges, pagination, and private-data exclusion.

### B — Other developer's TODOs

- [ ] **B-10:** Build homepage, browse results, URL-based filters, sorting, result count, pagination, and clear-filter/no-results states.
- [ ] **B-11:** Build car details, specifications, responsive gallery, public seller panel, and signed-out action prompts.
- [ ] **B-12:** Connect discovery queries and inspect mobile/desktop and keyboard journeys.

**Dependency:** A-12/A-13 require listing schema; B can design discovery while seller backend work completes.  
**Gate G3:** visitors discover only published cars; no account email or private contact reaches public HTML/API data.

## Stage 4 — Favorites, inquiries, and reports

### A — Your TODOs

- [ ] **A-15:** Add interaction tables/RLS and idempotent favorite commands with database uniqueness.
- [ ] **A-16:** Implement inquiry commands with current availability locks, self-inquiry denial, confirmed identity, and owner-scoped inbox queries.
- [ ] **A-17:** Implement report creation, safe reporter projections, account limits inside RPCs, duplicate detection, and trusted-IP throttling.
- [ ] **A-18:** Test concurrent favorites and sale/inquiry races, direct RPC limit bypass attempts, inbox privacy, and report permissions.

### B — Other developer's TODOs

- [ ] **B-13:** Add favorite controls and saved-car screen with unavailable states.
- [ ] **B-14:** Add inquiry form and seller inbox; explain that reply arrangements happen outside the app and do not expose buyer email implicitly.
- [ ] **B-15:** Add report form, honeypot, safe success/error/rate-limit feedback, and repeat-submit protection.
- [ ] **B-16:** Browser-test signed-out prompts, duplicate submissions, sold-car inquiry rejection, and inbox behavior.

**Gate G4:** available cars accept legitimate inquiries; unavailable/self-inquiries fail; direct API use cannot bypass account limits or access another person's messages.

## Stage 5 — Moderation and MVP readiness

### A — Your TODOs

- [ ] **A-19:** Expose protected review/report queues, approve/reject and resolve/dismiss commands, current administrator checks, and audit queries.
- [ ] **A-20:** Test self-moderation, stale decisions, unauthorized direct calls, report-note privacy, and role changes.
- [ ] **A-21:** Add repeatable local sample data and safe administrator creation; no fixed production credentials or destructive seeding.
- [ ] **A-22:** Finish container/tools targets, CI checks, deployment templates, health endpoints, cleanup jobs, and redacted logging.
- [ ] **A-23:** Document release/migration/configuration, rollback, separate database/object backups, and restore procedures; actual hosted deployment is a separate task.
- [ ] **A-24:** Update setup instructions with verified commands and exact checks run; document remaining limitations.

### B — Other developer's TODOs

- [ ] **B-17:** Build administrator listing queue, private preview, approve/reject form with required reasons, and history.
- [ ] **B-18:** Build report queue and resolve/dismiss UI; keep report resolution separate from listing removal.
- [ ] **B-19:** Write the full browser journey: account → seller submission → different administrator approval → buyer search/inquiry → seller inbox → sold → inquiry denied.
- [ ] **B-20:** Complete mobile, keyboard, form-error, empty/loading-state, and contact-privacy inspection across all screens.
- [ ] **B-21:** Record reproducible bugs with route, actor, steps, and expected/actual result; fix UI issues and hand server defects to A.

**Gate G5:** complete the [MVP acceptance checklist](MVP.md#11-mvp-acceptance-and-release-gate). Application checks must actually run; deployment configuration or recovery not yet exercised must remain explicitly unverified. Passing local tests is not evidence that hosted production is ready.

## Working together and avoiding AI edit collisions

1. Use separate clones or Git worktrees and short task branches, for example `dev-a/A-09-listing-transitions` and `dev-b/B-07-listing-editor`.
2. Claim the task ID before starting. Each PR names its owner, dependencies, changed contracts, and verification results.
3. Give each coding assistant only one bounded task with the relevant files and acceptance criteria. Ask it to inspect current code before assuming a planned file exists.
4. You may alternate Claude Code and Codex on the same branch, but do not let both edit it simultaneously. If they work concurrently, give them separate worktrees and non-overlapping tasks; integrate deliberately.
5. The other developer follows the same task IDs and contracts with Gemini. Tool/model choice does not change the architecture or authorization rules.
6. Keep one owner for migrations and lockfiles. B requests schema/dependency changes; A supplies them in a small prerequisite PR.
7. Review generated migrations, permission rules, privileged clients, and upload handling manually. The other developer reviews each PR before merge; A is the default integration owner.
8. Mark a task complete only after its code, tests, and documentation are merged. Report actual checks run, failures, and remaining blockers—never infer success from generated code.

For interface-only work before services are ready, use explicitly test-only fixtures. A screen with fixtures is **UI ready**, not **integrated** or **done**. Missing services must not be replaced by permissive mock authentication or secret-key queries.

## Handoff template

Copy into each feature PR or handoff:

```text
Task ID / owner:
Depends on merged task(s):
Behavior delivered:
Files and contracts changed:
Test accounts/fixtures needed:
Checks actually run and results:
Known gaps or blocked dependencies:
Next integration step / reviewer:
```

## First assignments

**You:** start A-01 and A-02, then A-03 through A-07. Provide the runnable foundation and contracts first.  
**Other developer:** start B-01 and B-02, then B-03/B-04 with fixtures. Connect live account flows only when A-06 is ready.

Suggested prompt for your coding assistant:

> Read MVP.md, README.md, TODO.md, and any AGENTS.md. I am Developer A. Work on task A-01/A-02 only: verify the existing scaffold and define contracts for Developer B. Follow the file boundaries, preserve unrelated changes, report checks actually run, and do not deploy or broaden scope.

Suggested prompt for the other developer's assistant:

> Read MVP.md, README.md, TODO.md, and any AGENTS.md. I am Developer B. Work on B-01/B-02: review the agreed contracts and build shared accessible UI. Keep data fixtures test-only. Do not modify migrations, server services, dependencies, or the lockfile without coordinating with Developer A. Report checks actually run and do not deploy.
