/**
 * Administrator queues, decisions, and audit projections.
 *
 * Administrator membership is re-read from the database for every sensitive
 * query and command; it never comes from a session claim, user metadata, or a
 * client-supplied flag. Resolving a report and removing a listing stay
 * separate operations (MVP.md section 5).
 *
 * Status: proposed interface (A-01). No service implements it yet.
 */
import type { ActionResult, AuditEventId, IsoDateTime, ListingId, ReportId, UserId } from './common';
import type { ReportCategory, ReportStatus } from './interactions';
import type { ActorRole, ListingPhoto, ListingStatus, VehicleSpecification } from './listings';

export const MODERATION_LIMITS = {
  rejectionReasonMin: 10,
  rejectionReasonMax: 500,
  resolutionNoteMax: 1000,
} as const;

export interface ModerationQueueItem {
  listingId: ListingId;
  status: ListingStatus;
  version: number;
  seller: { userId: UserId; displayName: string };
  make: string;
  model: string;
  year: number;
  priceMinor: number;
  currency: string;
  photoCount: number;
  coverPhotoUrl: string | null;
  submittedAt: IsoDateTime;
  openReportCount: number;
  /** false when the administrator owns this listing; self-moderation is denied. */
  viewerMayDecide: boolean;
}

/** Full administrator audit row, including the acting administrator. */
export interface ModerationAuditEntry {
  id: AuditEventId;
  occurredAt: IsoDateTime;
  fromStatus: ListingStatus | null;
  toStatus: ListingStatus;
  actorRole: ActorRole;
  actor: { userId: UserId; displayName: string } | null;
  reason: string | null;
}

export interface ModerationListingDetail extends ModerationQueueItem {
  specification: VehicleSpecification;
  photos: readonly ListingPhoto[];
  history: readonly ModerationAuditEntry[];
  reports: readonly ModerationReport[];
}

export interface ModerationReport {
  id: ReportId;
  listingId: ListingId;
  category: ReportCategory;
  explanation: string;
  status: ReportStatus;
  reporter: { userId: UserId; displayName: string };
  createdAt: IsoDateTime;
  /** Internal note: administrators only, never in a reporter projection. */
  resolutionNote: string | null;
  resolvedBy: { userId: UserId; displayName: string } | null;
  resolvedAt: IsoDateTime | null;
}

export interface ApproveListingInput {
  listingId: ListingId;
  expectedVersion: number;
}

export interface RejectListingInput {
  listingId: ListingId;
  expectedVersion: number;
  /** Required and shown to the owner. Keep internal detail out of it. */
  reason: string;
}

/** Removal of an already published listing; result status is `rejected`. */
export interface RemoveListingInput {
  listingId: ListingId;
  expectedVersion: number;
  reason: string;
}

export type ModerationDecisionResult = ActionResult<{
  listingId: ListingId;
  status: ListingStatus;
  version: number;
}>;

export interface ResolveReportInput {
  reportId: ReportId;
  resolution: Exclude<ReportStatus, 'open'>;
  /** Internal note; optional, never returned to the reporter. */
  note: string | null;
}

export type ResolveReportResult = ActionResult<{ reportId: ReportId; status: ReportStatus }>;
