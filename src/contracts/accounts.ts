/**
 * Viewer identity, profiles, contact publication, and account actions.
 *
 * Identity is always derived on the server from the verified Supabase session.
 * No input here carries a user id: a client cannot nominate a seller, a buyer,
 * or an administrator.
 *
 * Status: proposed interface (A-01). No service implements it yet.
 */
import type { ActionResult, IsoDateTime, UserId } from './common';

/** UI hints only. Every action re-checks permission on the server. */
export interface ViewerCapabilities {
  canFavorite: boolean; // signed in
  canInquire: boolean; // signed in + confirmed email
  canReport: boolean; // signed in + confirmed email
  canSell: boolean; // signed in + confirmed email
  canModerate: boolean; // current administrator membership
}

export type Viewer =
  | { status: 'anonymous'; capabilities: ViewerCapabilities }
  | {
      status: 'signed_in';
      id: UserId;
      displayName: string;
      emailConfirmed: boolean;
      isAdministrator: boolean;
      capabilities: ViewerCapabilities;
    };

/**
 * The signed-in user's own profile. Private fields (`contactEmail`,
 * `contactPhone`, `accountEmail`) are returned only to their owner.
 */
export interface OwnProfile {
  userId: UserId;
  displayName: string;
  location: string | null;
  /** Supabase Auth login address. Private: never in a public projection. */
  accountEmail: string;
  /** Private contact values, independent of the Auth login address. */
  contactEmail: string | null;
  contactPhone: string | null;
  /** Explicit consent, default false. Publishes the value above, if present. */
  publishContactEmail: boolean;
  publishContactPhone: boolean;
  updatedAt: IsoDateTime;
}

/** Public seller projection. Contains only opted-in values. */
export interface PublicSellerProfile {
  userId: UserId;
  displayName: string;
  location: string | null;
  /** null unless the seller published it; never the Auth login address. */
  publishedEmail: string | null;
  publishedPhone: string | null;
  memberSince: IsoDateTime;
}

export interface ProfileUpdateInput {
  displayName: string;
  location: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  publishContactEmail: boolean;
  publishContactPhone: boolean;
}

export const PROFILE_LIMITS = {
  displayNameMax: 60,
  locationMax: 120,
  contactPhoneMax: 32,
  contactEmailMax: 254,
} as const;

export interface RegisterInput {
  email: string;
  password: string;
  displayName: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

/** Recovery always reports success, so the response cannot enumerate accounts. */
export interface RecoveryRequestInput {
  email: string;
}

export interface PasswordUpdateInput {
  password: string;
}

/** Matches `supabase/config.toml` `auth.minimum_password_length`. */
export const PASSWORD_MIN_LENGTH = 12;

export type RegisterResult = ActionResult<{ confirmationRequired: boolean }>;
export type LoginResult = ActionResult<{ redirectTo: string }>;
export type RecoveryRequestResult = ActionResult<null>;
export type PasswordUpdateResult = ActionResult<null>;
export type ProfileUpdateResult = ActionResult<OwnProfile>;

export const AUTH_ROUTES = {
  register: '/register',
  login: '/login',
  forgotPassword: '/forgot-password',
  resetPassword: '/reset-password',
  /** Email confirmation link target (Route Handler, A-owned). */
  confirm: '/auth/confirm',
  /** Recovery / OAuth-style callback target (Route Handler, A-owned). */
  callback: '/auth/callback',
} as const;

/** Destination after a successful sign-in when nothing else is requested. */
export const DEFAULT_SIGNED_IN_DESTINATION = '/dashboard';

/**
 * Callback outcome, surfaced as `?notice=<code>` on the redirect target.
 * Handlers never redirect to an absolute or protocol-relative URL supplied by
 * the caller; `next` must be a same-origin path on the allowlist.
 */
export const AUTH_NOTICES = [
  'email_confirmed',
  'link_expired',
  'link_invalid',
  'password_updated',
  'recovery_email_sent',
] as const;

export type AuthNotice = (typeof AUTH_NOTICES)[number];
