/**
 * Favorites, buyer inquiries, the seller inbox, and listing reports.
 *
 * Every input names a listing, never an actor: the buyer and the reporter come
 * from the verified session, and account limits are enforced inside the
 * database transaction so a direct Supabase call cannot bypass them (A-16/A-17).
 *
 * Status: proposed interface (A-01). No service implements it yet.
 */
import type { ActionResult, InquiryId, IsoDateTime, ListingId, ReportId } from './common';
import type { PublicListingSummary } from './listings';

/** Shared hidden field name; a non-empty value is treated as spam. */
export const HONEYPOT_FIELD = 'website';

/** Enforced in SQL, not in the UI (MVP.md section 9). */
export const INTERACTION_LIMITS = {
  inquiriesPerHour: 5,
  inquiriesPerListingCooldownMinutes: 10,
  reportsPerDay: 5,
  inquiryMessageMin: 20,
  inquiryMessageMax: 2000,
  reportExplanationMin: 20,
  reportExplanationMax: 1000,
} as const;

export interface FavoriteInput {
  listingId: ListingId;
}

/** Idempotent: repeating add or remove returns the same state, not an error. */
export type FavoriteResult = ActionResult<{ listingId: ListingId; favorited: boolean }>;

/**
 * A saved listing. `listing` is null when the car is no longer publicly
 * available; the row then carries no hidden data, and removal still works.
 */
export interface SavedListing {
  listingId: ListingId;
  savedAt: IsoDateTime;
  listing: PublicListingSummary | null;
}

export interface InquiryInput {
  listingId: ListingId;
  /**
   * The whole message. A buyer may volunteer a reply method inside it; the
   * application never attaches their account email automatically.
   */
  message: string;
  /** Honeypot; must be empty. */
  website: string;
}

export type InquiryResult = ActionResult<{ inquiryId: InquiryId; createdAt: IsoDateTime }>;

/** Seller inbox row. The buyer's account email is deliberately absent. */
export interface SellerInquiry {
  id: InquiryId;
  listing: { id: ListingId; make: string; model: string; year: number };
  buyerDisplayName: string;
  message: string;
  createdAt: IsoDateTime;
  readAt: IsoDateTime | null;
}

export interface MarkInquiryReadInput {
  inquiryId: InquiryId;
}

export const REPORT_CATEGORIES = [
  'suspected_fraud',
  'incorrect_details',
  'offensive_content',
  'duplicate_listing',
  'sold_elsewhere',
  'other',
] as const;

export type ReportCategory = (typeof REPORT_CATEGORIES)[number];

export const REPORT_STATUSES = ['open', 'resolved', 'dismissed'] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

export interface ReportInput {
  listingId: ListingId;
  category: ReportCategory;
  explanation: string;
  /** Honeypot; must be empty. */
  website: string;
}

export type ReportResult = ActionResult<{ reportId: ReportId; createdAt: IsoDateTime }>;

/** Reporter-facing projection. Internal resolution notes are never included. */
export interface ReporterReport {
  id: ReportId;
  listingId: ListingId;
  category: ReportCategory;
  status: ReportStatus;
  createdAt: IsoDateTime;
  resolvedAt: IsoDateTime | null;
}
