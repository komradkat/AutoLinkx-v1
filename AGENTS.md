# AutoLinkX — repository instructions

These instructions apply throughout this repository unless a more specific nested `AGENTS.md` applies. Follow the user's current request and preserve unrelated work. These rules guide authorized work; they do not authorize deployment, destructive operations, or starting unrelated tasks.

## Read before working

1. Read [MVP.md](MVP.md) for product scope and acceptance criteria.
2. Read the relevant architecture/setup sections of [README.md](README.md).
3. Read [TODO.md](TODO.md) for ownership, task dependencies, and shared contracts.
4. For Developer A tasks, read the relevant section of [TODO-DEVELOPER-A.md](TODO-DEVELOPER-A.md).
5. Inspect the actual files, package scripts, and git status before editing. Documents describe intended work; they are not evidence that a feature or command exists or has passed tests.

Work on the requested task, not the entire backlog. If the request is documentation, review, or diagnosis, do not silently start implementation. Follow explicit user decisions over older plans and update affected documentation when appropriate. Resolve routine implementation choices autonomously; flag material scope or contract conflicts.

## Product and architecture

- Build the car marketplace workflow: seller draft → review → publication → buyer inquiry → sold.
- One account can buy and sell. Administrator membership is separately controlled.
- Use Next.js App Router, React, TypeScript, Supabase Auth, PostgreSQL, and private Supabase Storage.
- Use local Supabase with Docker for development. Do not reintroduce Django, NestJS, SQLite, another authentication system, or a separate REST backend.
- Prefer Server Components; use Client Components only where interaction requires them. Use Server Actions for ordinary forms and focused Route Handlers for Auth callbacks, uploads, media, and health checks.
- Keep pages/actions thin. Validate and coordinate in server services; enforce atomic state changes in PostgreSQL functions. Multiple Supabase requests are not a transaction.
- Keep shared contracts serializable and free of server clients, credentials, and private database rows.
- Exclude payments, financing, real-time chat, reviews, AI features, and the other deferred features in MVP.md.

## Ownership and collaboration

| Area | Owner |
| --- | --- |
| Supabase configuration/migrations, generated DB types, server modules, scripts | Developer A |
| Feature actions/queries/schemas/services and shared contracts | Developer A; B reviews contracts |
| Auth callback handlers, media/upload/health handlers, `src/proxy.ts` | Developer A |
| Pages/layouts, components, styles, static branding, browser/UI tests | Developer B |
| Package/lockfile, framework/test config, environment example, Docker, CI, infrastructure | Developer A |
| Database/service/integration tests | Developer A |

See TODO.md for exact paths and exceptions. Respect task IDs and dependencies. Ownership is a coordination rule, not an automatic approval gate: explicit user authorization can assign cross-boundary work. Avoid competing edits and document any necessary handoff.

- Do not change a shared action signature or DTO silently. Update contracts, dependent tests, and the handoff together.
- Keep one active owner for migrations and dependency/lockfile changes.
- Do not run two coding assistants as writers in the same checkout. Use separate worktrees and non-overlapping tasks for explicitly requested concurrent work.
- Do not spawn additional agents solely because this project has two developers; delegate only when requested or otherwise explicitly instructed.
- Test fixtures stay test-only. Never replace missing backend integration with permissive authentication, fake production data, or blanket service-role queries.

## Security and data rules

- Authenticate and authorize every Server Action, Route Handler, and database mutation independently. Layout guards and hidden controls are not authorization.
- Verify Supabase identity through the supported server APIs; do not trust unverified session data, client actor IDs, or user-editable metadata for privileges.
- Use request-scoped clients with the user's identity for routine operations. Keep secret/service-role clients isolated in server-only modules with narrowly checked targets.
- Enable RLS and minimum grants on exposed tables. Direct Supabase API calls must not bypass ownership, moderation, privacy, or account rate limits.
- Separate private fields from public projections. RLS restricts rows, not columns. Never return raw Auth users, credentials, internal report notes, or private contacts to public clients.
- Require explicit seller consent before publishing contact values. Do not automatically reveal a buyer's account email through inquiries.
- Deny direct browser writes that bypass lifecycle functions. Review security-definer functions for fixed search paths, qualified names, limited EXECUTE grants, and explicit actor/target checks.
- Use database constraints for uniqueness and numeric validity. Use row locks/expected versions for competing edits and inquiry/availability races.
- Keep credentials out of source, logs, screenshots, and client bundles. `.env.example` contains placeholders only. Never expose privileged keys through `NEXT_PUBLIC_` variables.
- Use parameterized queries, bounded inputs, whitelisted sort values, safe redirects, and origin/CSRF protection appropriate to the endpoint.

## Listing and interaction invariants

- Preserve exactly these statuses: `draft`, `pending_review`, `published`, `rejected`, `sold`, `archived`.
- Follow the transition table in MVP.md; deny unspecified transitions. Sellers, including administrators selling cars, cannot approve or reject their own listings.
- Only published cars are publicly discoverable. Other states use protected owner/administrator previews.
- Valid substantive changes to published details/photos require moderation again. Invalid edits leave existing data unchanged. Save details, status, version, and audit together.
- Submission requires complete valid details and at least one validated photo. Draft validation may differ from submission validation, but must follow the agreed contract.
- Favorites are unique per user/listing. Inquiries require a confirmed user, published availability, and a buyer different from the seller.
- Enforce inquiry availability and limits in the transaction, including direct RPC calls. Do not rely on disabled buttons or process-local counters.
- Report resolution and listing removal are separate explicit operations. Rejection/removal requires a reason; audit records are append-only through controlled commands.

## Uploads and media

- Follow MVP limits: at most 10 photos per listing and 5 MB per file, plus a decoded pixel limit.
- Inspect/decode JPEG, PNG, or WebP bytes; do not trust extensions or declared MIME types. Normalize images and strip metadata. Reject corrupt/unsupported/oversized inputs.
- Use random object names, private storage, and authorized delivery. Do not put uploads in `public/` or create unrestricted browser bucket writes.
- Treat Storage and database writes as separate operations: stage, validate, attach transactionally, and clean up safely after failures.
- Keep referenced photos until replacement commits. Use the Storage API for object cleanup; deleting metadata alone does not remove bytes.
- Do not shared-cache protected media or issue long-lived signed URLs that undermine visibility changes. Follow the current documented delivery design.

## Migrations and environments

- Use versioned SQL under `supabase/migrations/`; keep generated database types consistent with migrations.
- Preserve data through additive changes and explicit backfills. Do not rewrite already-applied migrations or use reset/drop/truncate as routine setup.
- Local reset operations require an explicitly disposable test database or a clear user request. Verify the exact target before destructive commands.
- Keep local, staging, and production projects/credentials separate. Tests and sample data must not target hosted production.
- No untracked Dashboard schema/policy edits. Capture reviewed changes in migrations and record non-schema project configuration separately.
- Deployment, hosted provisioning, and production mutations require a separately authorized task. Writing deployment templates does not authorize executing them.
- Database backups do not include Storage object bytes; recovery planning must cover both.

## Implementation and verification

- Reuse existing code and conventions; avoid broad rewrites, unnecessary dependencies, and unrelated formatting changes.
- Use strict TypeScript and explicit boundary validation. Map failures to safe, useful errors without exposing SQL or provider internals.
- Preserve accessible labels, keyboard operation, focus, readable contrast, and responsive behavior. Do not communicate status through color alone.
- Inspect current `package.json` before running commands. Planned scripts are not necessarily implemented; do not claim missing or unrun checks passed.
- Run checks proportional to the change. Documentation edits need link/consistency/whitespace checks, not fabricated application tests.
- For backend changes, test ordinary user and anonymous access as well as privileged setup. Service-role-only tests cannot prove RLS correctness.
- Cover affected ownership rules, allowed/denied transitions, direct API access, concurrency, visibility, private projections, and upload validation.
- For schema changes, test fresh application and upgrades against disposable local Supabase. For UI changes, run available browser tests and inspect relevant responsive/error states.
- Run available typecheck, lint, focused tests, and build when relevant. Explain blockers such as Docker not running, missing credentials, or missing scripts; never silently skip required checks.

## Git and clean commits

This section contains the repository's Clean Commit rules, consolidated from the original supplied guide and template. Use it when preparing or creating commits. These instructions govern message format; they do not authorize committing or pushing without a user request.

### Scope and staging

- Keep each commit focused on one logical change. Include its directly related tests and documentation; split unrelated changes rather than mixing tasks into one commit.
- Inspect `git status --short`, the working diff, and any existing staged diff before staging. Existing staged changes may belong to the user or the other developer.
- Stage explicit paths or hunks for the requested task. Do not blanket-stage a dirty checkout, discard another person's work, or unstage their changes without authorization.
- Review `git diff --cached` before writing the message and before committing. The message must describe the actual staged change, not the intended task or unstaged work.
- Exclude secrets, local environment files, dependencies, and generated build output. Include intentional tracked artifacts such as lockfiles or generated database types when the task requires them.
- Run relevant available checks and report failures or skipped checks honestly. Do not bypass hooks or claim a clean worktree when unrelated changes remain.
- Do not amend commits, rewrite shared history, force-push, or push unless the requested workflow authorizes that operation.

### Message format

```text
<emoji> <type> (<scope>): <description>

- <specific technical or documentation change>
- <another related change, if applicable>

NOTES:
- <migration, configuration, breaking-change, or other necessary context>
```

- Scope is optional. When included, use a short, consistent lowercase scope such as `auth`, `listings`, `storage`, `database`, `ui`, `ci`, or `docs`.
- Use the matching emoji/type below. Choose by the purpose of the change: documentation-only additions are `docs`, not automatically `new` because a file was added.
- Keep the entire subject **under 72 characters**, with lowercase type and description, an imperative present-tense description, a space after the colon, and no final period. Put case-sensitive identifiers in the body when needed.
- Every commit requires a bulleted body describing concrete changes. A single meaningful bullet is sufficient for a small change.
- Separate subject, body, and optional `NOTES:` block with blank lines. Include notes whenever migrations, environment changes, release ordering, caveats, or breaking changes need explanation; omit an empty notes block.
- For breaking changes, place `!` immediately after `new`, `update`, `remove`, or `security`, and explain the impact and required migration in `NOTES:`.
- Include the task ID in the body or notes when applicable, keeping the subject readable. Never invent verification results.

| Emoji | Type | Purpose |
| --- | --- | --- |
| 📦 | `new` | New functionality |
| 🔧 | `update` | Fixes, refactoring, and improvements |
| 🗑️ | `remove` | Removal of code or functionality |
| 🔒 | `security` | Security fixes |
| ⚙️ | `setup` | Configuration, CI, and tooling |
| ☕ | `chore` | Maintenance and dependency updates |
| 🧪 | `test` | Test-only changes |
| 📖 | `docs` | Documentation-only changes |
| 🚀 | `release` | Versioning/releases |

Example message format only, not a claim that this task is implemented:

```text
📦 new (listings): enforce seller submission rules

- Add transactional submission checks for complete details and photos
- Cover forbidden ownership and stale listing versions in database tests
- Implement task A-09

NOTES:
- Apply the listing migration before releasing the updated server actions
```

When several types appear applicable, classify by the main purpose in this order: release, security fix, documentation-only, test-only, configuration/tooling, removal, new functionality, improvements, then maintenance. Split unrelated purposes into separate commits; keep directly related tests and documentation with their feature or fix.

The format block above can be used as a template. Do not change repository or global Git configuration or add commit hooks merely to follow these instructions. Configure a Git message template or automated enforcement only when requested; formatting guidance alone does not install enforcement.

## Finish and hand off

Report the behavior or document changed, files/contracts affected, checks actually run and their results, remaining gaps, and the next integration step for the other developer.

Keep task progress in TODO.md and TODO-DEVELOPER-A.md, not in this instruction file. Follow the board's rule that completion includes review/merge; distinguish implemented, tested, and merged work. Do not commit, push, deploy, or contact the other developer unless requested as part of the task.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
