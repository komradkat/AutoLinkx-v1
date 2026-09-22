/**
 * Shared primitives for every AutoLinkX contract.
 *
 * Plain serializable TypeScript only: no Supabase clients, no secrets, no
 * environment reads, no server imports. Safe in Server and Client Components.
 *
 * Status: proposed interface (A-01). No service implements it yet.
 */

/** UUID text as produced by PostgreSQL/Supabase. */
export type UserId = string;
export type ListingId = string;
export type PhotoId = string;
export type StagedPhotoId = string;
export type InquiryId = string;
export type ReportId = string;
export type AuditEventId = string;

/** ISO-8601 UTC instant, e.g. `2026-09-22T14:29:00.000Z`. Never a `Date`. */
export type IsoDateTime = string;

/**
 * The only error codes an action may return.
 *
 * Unexpected failures are NOT modelled here: they are thrown and handled by
 * the route's error boundary, so a `false` result always carries a safe,
 * user-presentable meaning.
 */
export const ACTION_ERROR_CODES = [
  'unauthenticated', // no verified session; send the viewer to /login
  'forbidden', // verified, but not allowed (wrong owner, not an administrator, unconfirmed email)
  'invalid', // input failed validation; see fieldErrors
  'conflict', // stale expectedVersion or duplicate; see currentVersion
  'unavailable', // target missing, or hidden from this viewer (also used for "not found")
  'rate_limited', // account or IP limit reached; see retryAfterSeconds
] as const;

export type ActionErrorCode = (typeof ACTION_ERROR_CODES)[number];

/** Input-name → messages. Keys match the contract field names below. */
export type FieldErrors = Readonly<Record<string, readonly string[]>>;

export interface ActionError {
  code: ActionErrorCode;
  /** Safe to render. Never contains SQL, provider internals, or private data. */
  message: string;
  /** Only meaningful for `invalid`. */
  fieldErrors: FieldErrors | null;
  /** Only meaningful for `rate_limited`. */
  retryAfterSeconds: number | null;
  /** Only meaningful for `conflict` on a versioned row; refetch and retry. */
  currentVersion: number | null;
}

export type ActionResult<TData = null> =
  | { ok: true; data: TData }
  | { ok: false; error: ActionError };

export interface PageMeta {
  page: number; // 1-based
  pageSize: number;
  /** Matches visible to this viewer, after publication/ownership filtering. */
  totalCount: number;
  totalPages: number;
}

export interface Paginated<TItem> extends PageMeta {
  items: readonly TItem[];
}

/** Server-supplied marketplace configuration; one currency per deployment. */
export interface MarketplaceConfig {
  /** ISO-4217, e.g. `EUR`. Source: server configuration, not user input. */
  currency: string;
  /** Minor units per major unit as a power of ten: 2 for EUR/USD, 0 for JPY. */
  currencyMinorUnitExponent: number;
  pageSize: number;
}

/** Fixed page size for every paginated public list (MVP §7). */
export const PAGE_SIZE = 12;

export function isOk<T>(result: ActionResult<T>): result is { ok: true; data: T } {
  return result.ok;
}
