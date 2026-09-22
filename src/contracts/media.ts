/**
 * Photo upload, staging, attachment, and authorized delivery.
 *
 * Storage writes and database writes are not one transaction: the browser
 * uploads one file, the server validates and stages it, and a later versioned
 * command attaches the staged objects to a listing atomically (A-10).
 *
 * Status: proposed interface (A-01). No handler implements it yet.
 */
import type { ActionResult, IsoDateTime, ListingId, PhotoId, StagedPhotoId } from './common';
import type { ListingPhoto } from './listings';

export const PHOTO_LIMITS = {
  maxPerListing: 10,
  maxFileBytes: 5 * 1024 * 1024,
  /** Decoded pixel ceiling, rejecting decompression bombs before processing. */
  maxDecodedPixels: 40_000_000,
  minDimension: 200,
} as const;

/** Sniffed from the bytes. A declared MIME type or extension is never trusted. */
export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export type AcceptedImageType = (typeof ACCEPTED_IMAGE_TYPES)[number];

/** Route Handler, A-owned. One file per request, `multipart/form-data`. */
export const UPLOAD_ROUTE = '/api/uploads/listing-photos';
export const UPLOAD_FILE_FIELD = 'file';

/** Authorized delivery prefix; checks publication or owner/admin access. */
export const MEDIA_ROUTE_PREFIX = '/media/listing-photos';

export function listingPhotoUrl(photoId: PhotoId): string {
  return `${MEDIA_ROUTE_PREFIX}/${photoId}`;
}

/**
 * A validated, normalized object in private Storage, owned by the uploader and
 * not yet part of any listing. Expires and is swept if never attached.
 */
export interface StagedPhoto {
  stagedPhotoId: StagedPhotoId;
  width: number;
  height: number;
  byteSize: number;
  contentType: AcceptedImageType;
  expiresAt: IsoDateTime;
  /** Authorized preview path, readable only by the uploader. */
  previewUrl: string;
}

export type UploadPhotoResult = ActionResult<StagedPhoto>;

export type PhotoRef =
  | { kind: 'existing'; photoId: PhotoId }
  | { kind: 'staged'; stagedPhotoId: StagedPhotoId };

/**
 * One atomic command for the whole photo set: array order is display order,
 * omitted existing photos are detached, and `coverIndex` selects the cover.
 * Attaching, reordering, removing, and choosing a cover are all substantive
 * changes, so a published listing returns to `pending_review`.
 */
export interface SetListingPhotosInput {
  listingId: ListingId;
  expectedVersion: number;
  photos: readonly PhotoRef[];
  /** Index into `photos`; the server rejects an out-of-range value. */
  coverIndex: number;
}

export type SetListingPhotosResult = ActionResult<{
  photos: readonly ListingPhoto[];
  version: number;
}>;
