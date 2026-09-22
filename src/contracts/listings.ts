/**
 * Listing statuses, lifecycle actions, vehicle data, and search.
 *
 * The transition table mirrors MVP.md section 6 exactly and is verified
 * against that document by `tests/contracts.test.ts`. It is a shared source of
 * shape, not of authority: PostgreSQL functions remain the enforcing state
 * machine (A-09).
 *
 * Status: proposed interface (A-01). No service implements it yet.
 */
import type { ActionResult, IsoDateTime, ListingId, PhotoId, UserId } from './common';
import type { PublicSellerProfile } from './accounts';

export const LISTING_STATUSES = [
  'draft',
  'pending_review',
  'published',
  'rejected',
  'sold',
  'archived',
] as const;

export type ListingStatus = (typeof LISTING_STATUSES)[number];

export const LISTING_ACTIONS = [
  'save',
  'submit',
  'withdraw',
  'archive',
  'restore',
  'mark_sold',
  'approve',
  'reject',
  'remove',
] as const;

export type ListingAction = (typeof LISTING_ACTIONS)[number];

export type ActorRole = 'owner' | 'administrator' | 'system';

export interface ListingTransition {
  from: ListingStatus;
  to: ListingStatus;
  actor: Exclude<ActorRole, 'system'>;
}

/** Every permitted status change (MVP.md section 6). All others are denied. */
export const LISTING_TRANSITIONS: readonly ListingTransition[] = [
  { from: 'draft', to: 'pending_review', actor: 'owner' },
  { from: 'rejected', to: 'pending_review', actor: 'owner' },
  { from: 'pending_review', to: 'published', actor: 'administrator' },
  { from: 'pending_review', to: 'rejected', actor: 'administrator' },
  { from: 'pending_review', to: 'draft', actor: 'owner' },
  { from: 'published', to: 'pending_review', actor: 'owner' },
  { from: 'published', to: 'sold', actor: 'owner' },
  { from: 'published', to: 'rejected', actor: 'administrator' },
  { from: 'draft', to: 'archived', actor: 'owner' },
  { from: 'pending_review', to: 'archived', actor: 'owner' },
  { from: 'published', to: 'archived', actor: 'owner' },
  { from: 'rejected', to: 'archived', actor: 'owner' },
  { from: 'sold', to: 'archived', actor: 'owner' },
  { from: 'archived', to: 'draft', actor: 'owner' },
] as const;

export interface ListingActionRule {
  actor: Exclude<ActorRole, 'system'>;
  /** Statuses the action may be invoked from. */
  from: readonly ListingStatus[];
  requiresReason: boolean;
  requiresExpectedVersion: boolean;
}

/**
 * `save` is the only action whose resulting status depends on the change: a
 * substantive edit moves `published` to `pending_review` and `pending_review`
 * to `draft`; `draft` and `rejected` keep their status, and a non-substantive
 * edit keeps the current status. The server classifies the edit; the client
 * never sends a target status.
 */
export const LISTING_ACTION_RULES: Readonly<Record<ListingAction, ListingActionRule>> = {
  save: {
    actor: 'owner',
    from: ['draft', 'rejected', 'pending_review', 'published'],
    requiresReason: false,
    requiresExpectedVersion: true,
  },
  submit: {
    actor: 'owner',
    from: ['draft', 'rejected'],
    requiresReason: false,
    requiresExpectedVersion: true,
  },
  withdraw: {
    actor: 'owner',
    from: ['pending_review'],
    requiresReason: false,
    requiresExpectedVersion: true,
  },
  archive: {
    actor: 'owner',
    from: ['draft', 'pending_review', 'published', 'rejected', 'sold'],
    requiresReason: false,
    requiresExpectedVersion: true,
  },
  restore: {
    actor: 'owner',
    from: ['archived'],
    requiresReason: false,
    requiresExpectedVersion: true,
  },
  mark_sold: {
    actor: 'owner',
    from: ['published'],
    requiresReason: false,
    requiresExpectedVersion: true,
  },
  approve: {
    actor: 'administrator',
    from: ['pending_review'],
    requiresReason: false,
    requiresExpectedVersion: true,
  },
  reject: {
    actor: 'administrator',
    from: ['pending_review'],
    requiresReason: true,
    requiresExpectedVersion: true,
  },
  remove: {
    actor: 'administrator',
    from: ['published'],
    requiresReason: true,
    requiresExpectedVersion: true,
  },
};

export function canTransition(from: ListingStatus, to: ListingStatus): boolean {
  return LISTING_TRANSITIONS.some((transition) => transition.from === from && transition.to === to);
}

/**
 * UI hint: which controls to show. Authorization still happens in the command.
 * An administrator looking at their own listing gets owner actions only,
 * because self-moderation is denied (MVP.md section 5).
 */
export function allowedActionsFor(
  status: ListingStatus,
  role: Exclude<ActorRole, 'system'>,
): readonly ListingAction[] {
  return LISTING_ACTIONS.filter((action) => {
    const rule = LISTING_ACTION_RULES[action];
    return rule.actor === role && rule.from.includes(status);
  });
}

export const TRANSMISSIONS = ['manual', 'automatic'] as const;

/** Values taken from the supplied design references, not invented here. */
export const FUEL_TYPES = ['gasoline', 'diesel', 'hybrid', 'electric'] as const;
export const VEHICLE_CONDITIONS = ['excellent', 'good', 'fair', 'needs_work'] as const;

export type Transmission = (typeof TRANSMISSIONS)[number];
export type FuelType = (typeof FUEL_TYPES)[number];
export type VehicleCondition = (typeof VEHICLE_CONDITIONS)[number];

/** Submission bounds. Drafts may hold incomplete values; submissions may not. */
export const LISTING_LIMITS = {
  makeMax: 60,
  modelMax: 60,
  locationMax: 120,
  descriptionMax: 4000,
  yearMin: 1900,
  /** Inclusive upper bound; the server resolves it as current year + 1. */
  yearMaxOffsetFromCurrentYear: 1,
  /** Integer minor units, strictly positive. */
  priceMinorMin: 1,
  priceMinorMax: 1_000_000_000,
  mileageKmMin: 0,
  mileageKmMax: 2_000_000,
} as const;

/** Complete, validated vehicle data as returned by the server. */
export interface VehicleSpecification {
  make: string;
  model: string;
  year: number;
  /** Integer minor units of `currency` (e.g. cents). Never a float. */
  priceMinor: number;
  /** ISO-4217, from server configuration. Identical for every listing. */
  currency: string;
  mileageKm: number;
  transmission: Transmission;
  fuel: FuelType;
  condition: VehicleCondition;
  location: string;
  description: string;
}

/** Draft-stage vehicle data. Any field may be missing until submission. */
export type VehicleSpecificationDraft = {
  [K in keyof Omit<VehicleSpecification, 'currency'>]: VehicleSpecification[K] | null;
};

export interface ListingPhoto {
  id: PhotoId;
  /** Authorized delivery path from `media.ts`; never a Storage public URL. */
  url: string;
  /** 0-based display order; contiguous and unique within a listing. */
  position: number;
  isCover: boolean;
  width: number;
  height: number;
}

/** Card projection for public lists. No description, no seller contacts. */
export interface PublicListingSummary {
  id: ListingId;
  make: string;
  model: string;
  year: number;
  priceMinor: number;
  currency: string;
  mileageKm: number;
  transmission: Transmission;
  fuel: FuelType;
  condition: VehicleCondition;
  location: string;
  coverPhoto: ListingPhoto | null;
  publishedAt: IsoDateTime;
}

/** Detail projection for `/cars/[id]`. Only ever a published listing. */
export interface PublicListing extends PublicListingSummary {
  description: string;
  photos: readonly ListingPhoto[];
  seller: PublicSellerProfile;
  /** Always false for anonymous viewers. */
  viewerHasFavorited: boolean;
}

/** Owner-safe lifecycle event. Administrator identity is never exposed. */
export interface ListingAuditEntry {
  id: string;
  occurredAt: IsoDateTime;
  fromStatus: ListingStatus | null;
  toStatus: ListingStatus;
  actorRole: ActorRole;
  /** Owner-safe rejection/removal reason; null when none was required. */
  reason: string | null;
}

export interface OwnerListingSummary {
  id: ListingId;
  sellerId: UserId;
  status: ListingStatus;
  /** Increments on every committed mutation; send it back as expectedVersion. */
  version: number;
  make: string | null;
  model: string | null;
  year: number | null;
  priceMinor: number | null;
  currency: string;
  coverPhoto: ListingPhoto | null;
  photoCount: number;
  /** Whether the current data would pass submission validation. */
  readyToSubmit: boolean;
  allowedActions: readonly ListingAction[];
  latestRejectionReason: string | null;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
  publishedAt: IsoDateTime | null;
}

export interface OwnerListing extends OwnerListingSummary {
  specification: VehicleSpecificationDraft;
  photos: readonly ListingPhoto[];
  history: readonly ListingAuditEntry[];
}

export interface CreateDraftInput {
  specification: VehicleSpecificationDraft;
}

export interface SaveListingInput {
  listingId: ListingId;
  expectedVersion: number;
  specification: VehicleSpecificationDraft;
}

/** Actions that carry no payload beyond the versioned target. */
export interface ListingCommandInput {
  listingId: ListingId;
  expectedVersion: number;
}

/** Shared shape for every owner command: where the listing ended up. */
export type ListingCommandResult = ActionResult<{
  listingId: ListingId;
  status: ListingStatus;
  version: number;
}>;

export type CreateDraftResult = ActionResult<{ listingId: ListingId; version: number }>;

export const LISTING_SORTS = [
  'newest',
  'price_asc',
  'price_desc',
  'year_desc',
  'mileage_asc',
] as const;

export type ListingSort = (typeof LISTING_SORTS)[number];
export const DEFAULT_LISTING_SORT: ListingSort = 'newest';

/** URL keys for `/cars`. Prices are minor units, exactly as in the DTOs. */
export const SEARCH_PARAM_KEYS = {
  keyword: 'q',
  make: 'make',
  model: 'model',
  yearMin: 'year_min',
  yearMax: 'year_max',
  priceMinorMin: 'price_min',
  priceMinorMax: 'price_max',
  mileageKmMax: 'mileage_max',
  transmission: 'transmission',
  fuel: 'fuel',
  condition: 'condition',
  location: 'location',
  sort: 'sort',
  page: 'page',
} as const;

export const SEARCH_LIMITS = { keywordMax: 80, maxPage: 500 } as const;

export interface ListingSearchFilters {
  keyword: string | null;
  make: string | null;
  model: string | null;
  yearMin: number | null;
  yearMax: number | null;
  priceMinorMin: number | null;
  priceMinorMax: number | null;
  mileageKmMax: number | null;
  transmission: Transmission | null;
  fuel: FuelType | null;
  condition: VehicleCondition | null;
  location: string | null;
}

export interface ListingSearchParams extends ListingSearchFilters {
  sort: ListingSort;
  page: number;
}

/**
 * Search never fails on bad URL input: unparsable, out-of-range and
 * contradictory values (min greater than max) are dropped and named in
 * `ignoredParams`, so a hand-edited URL renders results with a notice instead
 * of an error page.
 */
export interface ListingSearchResult {
  items: readonly PublicListingSummary[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  appliedFilters: ListingSearchFilters;
  sort: ListingSort;
  /** URL keys that were present but not applied. */
  ignoredParams: readonly string[];
}
