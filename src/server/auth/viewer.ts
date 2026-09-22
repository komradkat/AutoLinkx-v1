/**
 * Verified identity (A-04).
 *
 * Identity always comes from `auth.getUser()`, which validates the token with
 * the Auth server. `getSession()` is never used for authorization: it reports
 * whatever the cookie claims, and a cookie is attacker-controlled input.
 *
 * Nothing here reads an actor id from a form, a header, or a query parameter.
 */
import 'server-only';

import type { ActionError, Viewer, ViewerCapabilities } from '@/contracts';

import type { RequestClient } from '../supabase/request-client';

const ANONYMOUS_CAPABILITIES: ViewerCapabilities = {
  canFavorite: false,
  canInquire: false,
  canReport: false,
  canSell: false,
  canModerate: false,
};

/** Shown when a profile has no display name yet; never derived from an email. */
const FALLBACK_DISPLAY_NAME = 'Member';

/**
 * Administrator membership.
 *
 * A-05 adds the membership table in `app_private` and this reads from it. It
 * fails closed until then: no caller is an administrator, so a moderation
 * command cannot succeed on an unenforced assumption. It must never fall back
 * to user metadata, which users can edit.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- A-05 reads the membership table with both arguments; the signature is the one it will fill in.
export async function isAdministrator(client: RequestClient, userId: string): Promise<boolean> {
  return false;
}

function capabilitiesFor(emailConfirmed: boolean, administrator: boolean): ViewerCapabilities {
  return {
    canFavorite: true, // signed in is enough (MVP.md section 9)
    canInquire: emailConfirmed,
    canReport: emailConfirmed,
    canSell: emailConfirmed,
    canModerate: administrator,
  };
}

/**
 * The safe identity DTO for this request. Anonymous on any failure: an
 * expired, malformed, or revoked token is not an error page, it is a visitor.
 */
export async function getViewer(client: RequestClient): Promise<Viewer> {
  const { data, error } = await client.auth.getUser();

  if (error || !data.user) {
    return { status: 'anonymous', capabilities: ANONYMOUS_CAPABILITIES };
  }

  const { user } = data;
  const emailConfirmed = Boolean(user.email_confirmed_at ?? user.confirmed_at);
  const administrator = await isAdministrator(client, user.id);

  // A-05 replaces this with the profiles row; user_metadata is user-editable,
  // so it may name a person but must never decide what they may do.
  const metadataName = user.user_metadata?.display_name;
  const displayName =
    typeof metadataName === 'string' && metadataName.trim() !== ''
      ? metadataName.trim()
      : FALLBACK_DISPLAY_NAME;

  return {
    status: 'signed_in',
    id: user.id,
    displayName,
    emailConfirmed,
    isAdministrator: administrator,
    capabilities: capabilitiesFor(emailConfirmed, administrator),
  };
}

export interface ViewerRequirement {
  /** Reject a signed-in user whose email is not confirmed yet. */
  confirmed?: boolean;
  /** Reject anyone without current administrator membership. */
  administrator?: boolean;
}

export type SignedInViewer = Extract<Viewer, { status: 'signed_in' }>;

export type ViewerCheck =
  | { ok: true; viewer: SignedInViewer }
  | { ok: false; error: ActionError };

function denial(code: ActionError['code'], message: string): ViewerCheck {
  return {
    ok: false,
    error: { code, message, fieldErrors: null, retryAfterSeconds: null, currentVersion: null },
  };
}

/**
 * The gate every Server Action and Route Handler calls first. Returns the
 * agreed error codes rather than throwing, so callers can answer with the
 * shared result envelope instead of an error page.
 */
export async function requireViewer(
  client: RequestClient,
  requirement: ViewerRequirement = {},
): Promise<ViewerCheck> {
  const viewer = await getViewer(client);

  if (viewer.status !== 'signed_in') {
    return denial('unauthenticated', 'Sign in to continue.');
  }

  if (requirement.confirmed && !viewer.emailConfirmed) {
    return denial('forbidden', 'Confirm your email address to continue.');
  }

  if (requirement.administrator && !viewer.isAdministrator) {
    return denial('forbidden', 'You do not have access to this area.');
  }

  return { ok: true, viewer };
}
