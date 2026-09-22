# AutoLinkX — shared frontend/backend contract

Owner: Developer A (task A-01). Reviewer: Developer B (task B-01).
Scope: [MVP.md](../MVP.md). Architecture: [README.md](../README.md). Board: [TODO.md](../TODO.md).

**Status: proposed interface.** The types in `src/contracts/` compile and are
covered by `tests/contracts.test.ts`, but **no table, RPC, service, action, or
route handler implements any of them yet**. Nothing in this document is
evidence that a feature works. Field names are stable enough to build forms and
fixtures against; changing one after B has adopted it needs a joint review and
a same-PR update of fixtures and tests.

## 1. What B imports, and what stays on the server

| Module | Import from | Contents |
| --- | --- | --- |
| `@/contracts` | Server **and** Client Components | Every type, constant, and the two helper functions below |
| `src/server/**` | Server only (A-owned, not written yet) | Supabase clients, verified identity, storage, config |
| `src/features/*/actions.ts` | Imported as Server Actions | Mutations; A-owned, not written yet |
| `src/features/*/queries.ts` | Server Components only | Reads; A-owned, not written yet |

`src/contracts/**` has no runtime dependencies, no `process.env` read, no
`server-only` import, and imports nothing but its own sibling files. A test
enforces this, so the modules can always be imported from a Client Component.
Contracts carry **no** database row types: `Database['public']['Tables']…`
stays behind the server modules.

Two runtime helpers ship with the types, both pure:

- `canTransition(from, to)` — is this status change in the MVP table at all?
- `allowedActionsFor(status, role)` — which controls to render. **A hint only.**
  Every command re-authorizes on the server; hiding a button is not access
  control.

## 2. Conventions

| Subject | Rule |
| --- | --- |
| IDs | UUID text (`string`). Opaque to the client; never parse or construct one. |
| Money | `priceMinor`: **integer minor units** (cents). Never a float, never a formatted string. The same unit is used in DTOs *and* in URL search params. |
| Currency | One per deployment, from server config (`MARKETPLACE_CURRENCY`). Exposed as `currency` (ISO-4217) plus `MarketplaceConfig.currencyMinorUnitExponent` for display. |
| Distance | `mileageKm`: integer kilometres. No miles anywhere in the contract. |
| Timestamps | `IsoDateTime` = ISO-8601 UTC string (`2026-09-22T14:29:00.000Z`). Never a `Date`: results cross the server/client boundary and are also logged. |
| Optionality | Absent values are **`null`, never `undefined`** and never omitted. `undefined` disappears in JSON, which makes "unset" and "unchanged" indistinguishable. |
| Versions | Every mutable listing carries `version: number`. Send it back as `expectedVersion`; a mismatch is a `conflict`, never a silent overwrite. |
| Arrays | `readonly`. Order is meaningful for photos (display order) and results (sort). |
| Naming | URL keys are `snake_case` (`year_min`), TypeScript fields are `camelCase`. `SEARCH_PARAM_KEYS` maps between them — don't hardcode the strings. |

Display formatting (currency symbols, thousands separators, relative dates) is
B's, using `Intl`. The server sends data, not presentation.

## 3. Identity — always server-derived

`Viewer` is a discriminated union on `status`:

```ts
{ status: 'anonymous'; capabilities }
{ status: 'signed_in'; id; displayName; emailConfirmed; isAdministrator; capabilities }
```

`capabilities` (`canFavorite`, `canInquire`, `canReport`, `canSell`,
`canModerate`) exists so B can render prompts instead of dead ends. It is not a
permission system.

**No input type in this contract accepts a user id.** Not `sellerId`, not
`buyerId`, not `actorId`, not `role`. The seller of a listing, the buyer of an
inquiry, the reporter of a report, and administrator membership are all read
from the verified Supabase session on the server, and administrator status is
re-read from the database table on every sensitive call — never from session
metadata, which a user can edit. A test asserts this rule over the source.

Corollary for B: there is no "act as" parameter, and a fixture must never
supply an actor id to a real action.

## 4. Public versus private fields

| Data | Public (anyone) | Private (owner / administrator only) |
| --- | --- | --- |
| Seller | `displayName`, `location`, `memberSince`, `publishedEmail`/`publishedPhone` *only when opted in* | `accountEmail`, un-published `contactEmail`/`contactPhone`, `publishContact*` flags |
| Listing | Published listings only: specs, description, photos, `publishedAt` | Any non-published listing, `status`, `version`, `readyToSubmit`, rejection reasons |
| Inquiry | — | Message body and `buyerDisplayName` (buyer + listing owner). The buyer's account email is **never** disclosed |
| Report | — | Reporter sees `ReporterReport` (no notes); administrators see `ModerationReport` (explanation, notes, resolver) |
| Audit | — | Owner sees `ListingAuditEntry` (role + owner-safe reason); administrators see `ModerationAuditEntry` (named actor) |

`PublicSellerProfile.publishedEmail` and `publishedPhone` are `null` unless the
seller explicitly opted in; they are separate values from the Auth login
address, which never appears in a public projection.

## 5. Result envelope

```ts
type ActionResult<T> = { ok: true; data: T } | { ok: false; error: ActionError }

interface ActionError {
  code: 'unauthenticated' | 'forbidden' | 'invalid' | 'conflict' | 'unavailable' | 'rate_limited'
  message: string              // safe to render
  fieldErrors: FieldErrors | null      // `invalid` only
  retryAfterSeconds: number | null     // `rate_limited` only
  currentVersion: number | null        // `conflict` on a versioned row
}
```

| Code | When | What B does |
| --- | --- | --- |
| `unauthenticated` | No verified session | Send to `/login?next=…` |
| `forbidden` | Verified but not permitted (not the owner, not an administrator, email unconfirmed, self-inquiry, self-moderation) | Explain; do not retry |
| `invalid` | Validation failed | Render `fieldErrors` inline **and** as a summary |
| `conflict` | Stale `expectedVersion`, or a duplicate | Refetch, show what changed, let the user redo |
| `unavailable` | Target missing, withdrawn, sold, or hidden from this viewer | One message for "gone" and "never existed", so it cannot probe hidden listings |
| `rate_limited` | Account or IP limit hit | Show `retryAfterSeconds`; keep the draft text |

Unexpected failures (a database outage, a bug) are **not** modelled here. They
are thrown and land in the route's `error.tsx`, so `ok: false` always carries a
meaning worth showing a user. `fieldErrors` keys are the contract field names
(`priceMinor`, `message`, …), never database column names.

### Representative payloads

Success — `submitListing`:

```json
{ "ok": true, "data": { "listingId": "8f1c…", "status": "pending_review", "version": 4 } }
```

Invalid — `saveListing` with a bad price and a long description:

```json
{ "ok": false, "error": { "code": "invalid",
    "message": "Check the highlighted fields.",
    "fieldErrors": { "priceMinor": ["Enter a price above 0."],
                     "description": ["Use at most 4000 characters."] },
    "retryAfterSeconds": null, "currentVersion": null } }
```

Stale — the seller edited in another tab:

```json
{ "ok": false, "error": { "code": "conflict",
    "message": "This listing changed since you opened it. Reload to see the current version.",
    "fieldErrors": null, "retryAfterSeconds": null, "currentVersion": 7 } }
```

Unavailable — inquiry on a car sold a second ago:

```json
{ "ok": false, "error": { "code": "unavailable",
    "message": "This car is no longer available.",
    "fieldErrors": null, "retryAfterSeconds": null, "currentVersion": null } }
```

Rate limited — sixth inquiry within the hour:

```json
{ "ok": false, "error": { "code": "rate_limited",
    "message": "You have sent too many inquiries. Try again later.",
    "fieldErrors": null, "retryAfterSeconds": 1680, "currentVersion": null } }
```

## 6. Listings

Six statuses, exactly: `draft`, `pending_review`, `published`, `rejected`,
`sold`, `archived`. `LISTING_TRANSITIONS` mirrors [MVP.md section 6](../MVP.md#6-listing-lifecycle)
row for row, and a test fails if the two ever disagree.

Nine actions in `LISTING_ACTION_RULES`:

| Action | Actor | From | Needs reason |
| --- | --- | --- | --- |
| `save` | owner | draft, rejected, pending_review, published | no |
| `submit` | owner | draft, rejected | no |
| `withdraw` | owner | pending_review | no |
| `archive` | owner | draft, pending_review, published, rejected, sold | no |
| `restore` | owner | archived | no |
| `mark_sold` | owner | published | no |
| `approve` | administrator | pending_review | no |
| `reject` | administrator | pending_review | **yes** |
| `remove` | administrator | published | **yes** |

`save` is the only action whose resulting status depends on *what* changed.
A **substantive** change (specifications, price, location, description, photos,
their order, the cover) moves `published → pending_review` and
`pending_review → draft`; `draft` and `rejected` keep their status; a
non-substantive change keeps the current status. **The server classifies the
edit — the client never sends a target status.** Publishing a change therefore
removes the car from public discovery until it is approved again, which B
should warn about before saving a published listing.

Draft versus submission validation: `VehicleSpecificationDraft` allows every
field to be `null`, so a draft can be saved half-finished. `submit` requires
complete, valid values plus at least one attached, validated photo. The
server-computed `readyToSubmit` flag on an owner listing says whether a submit
would pass, so B can enable the button without reimplementing the rules.

Projections: `PublicListingSummary` (cards) ⊂ `PublicListing` (detail, adds
description, photos, seller, `viewerHasFavorited`). `OwnerListingSummary`
(dashboard rows, adds `status`, `version`, `allowedActions`,
`latestRejectionReason`, `readyToSubmit`) ⊂ `OwnerListing` (adds the draft
specification, photos, and owner-safe `history`).

## 7. Search, sort, pagination

URL keys come from `SEARCH_PARAM_KEYS`: `q`, `make`, `model`, `year_min`,
`year_max`, `price_min`, `price_max`, `mileage_max`, `transmission`, `fuel`,
`condition`, `location`, `sort`, `page`. Prices in the URL are **minor units**,
like everywhere else.

Sorts are whitelisted: `newest` (default), `price_asc`, `price_desc`,
`year_desc`, `mileage_asc`. Every sort gets a listing-id tie-breaker so paging
is stable. Page size is fixed at 12 (`PAGE_SIZE`).

`totalCount` counts publication-filtered matches visible to the caller, so
`totalPages` is safe to render as a page list.

**Invalid input never errors.** A search URL is a user-editable string, so
unparsable numbers, out-of-range values, unknown enum values, `page < 1` or
`page > 500`, and contradictory ranges (`year_min > year_max`) are dropped
rather than rejected. The response echoes what was actually used in
`appliedFilters` and names what was dropped in `ignoredParams`, so B can show
"some filters were ignored" and keep the results on screen. Out-of-range pages
return an empty `items` array with the real `totalCount`, not a 404.

## 8. Photos: upload, staging, attachment, delivery

Limits (`PHOTO_LIMITS`, from MVP section 9): at most **10** photos per listing,
**5 MB** per file, a **40 MP** decoded-pixel ceiling, minimum 200 px per side.
Accepted types are JPEG, PNG, and WebP, decided by **sniffing the bytes** — the
declared MIME type and the file extension are never trusted.

Three steps, because Storage writes and database writes cannot share a
transaction:

1. **Upload** — `POST /api/uploads/listing-photos`, `multipart/form-data`, one
   file in the `file` field. The server validates, normalizes, strips metadata,
   writes a random private object, and returns a `StagedPhoto`
   (`stagedPhotoId`, dimensions, byte size, `expiresAt`, a `previewUrl` only
   the uploader can read). A staged photo belongs to no listing and is swept if
   never attached.
2. **Attach** — `SetListingPhotosInput` sends the *whole* set at once:
   `photos: PhotoRef[]` (array order = display order, mixing
   `{kind:'existing', photoId}` and `{kind:'staged', stagedPhotoId}`) plus
   `coverIndex`. Omitting an existing photo detaches it. One versioned,
   atomic command therefore covers add, remove, reorder, and cover selection —
   and all four are substantive changes.
3. **Deliver** — `GET /media/listing-photos/{photoId}` (`listingPhotoUrl()`),
   which checks current publication or owner/administrator access on every
   request and responds no-store. There are no public bucket URLs and no
   long-lived signed URLs, because those stay valid after a listing is hidden.

## 9. Interactions

**Favorites** are idempotent: `FavoriteResult` returns the resulting state, so
a double-click or a duplicate submit is a success, not a `conflict`. Uniqueness
is a database constraint, not a check-then-insert. A saved listing that is no
longer public comes back as `SavedListing` with `listing: null` — enough to
show an "unavailable" row and a working remove button, with no hidden data.

**Inquiries** require a signed-in, email-confirmed buyer, a published listing,
and a buyer who is not the seller. The message is the entire payload: MVP
section 4 makes it an initial message, not a thread, and a buyer may volunteer
a reply method inside the text. `SellerInquiry` deliberately has no buyer email
field — the application never discloses it automatically.

**Reports** need a confirmed account, a category from `REPORT_CATEGORIES`, and
an explanation. One open report per reporter per listing is a database
constraint. Reporters get `ReporterReport`, which has no internal notes.

Both forms carry a honeypot field named by `HONEYPOT_FIELD` (`website`) that
must stay empty. Limits (`INTERACTION_LIMITS`): 5 inquiries/hour, 1 per listing
per 10 minutes, 5 reports/day. **They are enforced inside the database
transaction**, so calling Supabase directly does not bypass them; a honeypot
and a disabled button are extras, not the control.

## 10. Moderation

`ModerationQueueItem` carries `viewerMayDecide: false` when the administrator
owns the listing — self-moderation is denied server-side regardless, this flag
only keeps the UI honest. Decisions take `expectedVersion`; `reject` and
`remove` require a reason (10–500 characters) that is shown to the owner, so
internal detail belongs in `ResolveReportInput.note` instead.

Resolving a report and removing a listing stay separate commands. Resolving
does not change publication status, and removing does not close reports.

## 11. Accounts and auth routes

`AUTH_ROUTES`: `/register`, `/login`, `/forgot-password`, `/reset-password`,
`/auth/confirm` (email confirmation), `/auth/callback` (recovery). The two
`/auth/*` handlers are A-owned; the pages are B's.

After a successful sign-in the destination is the validated `next` parameter,
otherwise `DEFAULT_SIGNED_IN_DESTINATION` (`/dashboard`). A `next` value must
be a **same-origin path** on the allowlist: absolute URLs, protocol-relative
`//evil.example` values, and unknown paths are replaced with the default, not
followed.

Outcomes arrive as `?notice=<AuthNotice>` on the redirect target:
`email_confirmed`, `link_expired`, `link_invalid`, `password_updated`,
`recovery_email_sent`. An expired or already-used link is never an error page:
it redirects to `/login?notice=link_expired` with an offer to request a new
one. Recovery requests always report success, so the form cannot be used to
discover which addresses have accounts. Password minimum length is 12,
matching `supabase/config.toml`.

## 12. Open questions for B's review (B-01)

1. **Enum values — mostly settled by the design references.** `FUEL_TYPES` is
   now gasoline, diesel, hybrid, electric (no LPG) and `VEHICLE_CONDITIONS` is
   excellent, good, fair, needs_work, both taken from the filter panel in
   `Ui design/web/02-Search-results.png`. `REPORT_CATEGORIES` is still a
   proposal. All of them become database check constraints in A-08, so changes
   are cheap now and cost a migration later.
2. **Currency.** Undecided in MVP section 13; the contract only assumes one.
3. **Listing title.** There is none — cards compose make/model/year. Say so if
   the designs need a seller-written headline.
4. **Ignored search params.** Confirm the "drop and notify" behaviour in
   section 7 suits the filter UI, rather than an error state.
5. **`readyToSubmit`.** Confirm one boolean is enough, or whether the editor
   needs the list of missing fields before submission is attempted.
