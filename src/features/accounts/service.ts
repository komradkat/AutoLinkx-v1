/**
 * Account services (A-06).
 *
 * Every function takes an already-built request client and returns the shared
 * `ActionResult`, so callers answer with the agreed error codes instead of
 * leaking provider messages. Identity is never passed in: it comes from the
 * verified session inside these calls.
 */
import 'server-only';
import type { AuthError, PostgrestError } from '@supabase/supabase-js';
import type { z } from 'zod';

import type { ActionError, ActionResult, FieldErrors, OwnProfile } from '@/contracts';
import { getPublicConfig } from '@/server/config/env';
import { requireViewer } from '@/server/auth/viewer';
import type { RequestClient } from '@/server/supabase/request-client';

import {
  loginSchema,
  passwordUpdateSchema,
  profileUpdateSchema,
  recoveryRequestSchema,
  registerSchema,
} from './schemas';

function fail(
  code: ActionError['code'],
  message: string,
  extra: Partial<ActionError> = {},
): { ok: false; error: ActionError } {
  return {
    ok: false,
    error: {
      code,
      message,
      fieldErrors: null,
      retryAfterSeconds: null,
      currentVersion: null,
      ...extra,
    },
  };
}

/** Turns a Zod failure into the contract's field-error map. */
function invalid(error: z.ZodError): { ok: false; error: ActionError } {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || 'form';
    (fieldErrors[key] ??= []).push(issue.message);
  }
  return fail('invalid', 'Check the highlighted fields.', {
    fieldErrors: fieldErrors as FieldErrors,
  });
}

/**
 * Maps a Supabase Auth failure to a safe code. Sign-in failures are
 * deliberately flattened into one message: distinguishing "no such account"
 * from "wrong password" turns the form into an account-existence oracle.
 */
function fromAuthError(error: AuthError): { ok: false; error: ActionError } {
  const status = error.status ?? 0;
  const code = error.code ?? '';

  if (status === 429 || code.includes('rate_limit')) {
    return fail('rate_limited', 'Too many attempts. Try again in a few minutes.', {
      retryAfterSeconds: 60,
    });
  }

  if (code === 'email_not_confirmed') {
    return fail('forbidden', 'Confirm your email address before signing in.');
  }

  if (code === 'weak_password') {
    return fail('invalid', 'Check the highlighted fields.', {
      fieldErrors: { password: ['Choose a stronger password.'] },
    });
  }

  if (code === 'user_already_exists' || code === 'email_exists') {
    // Registration stays deliberately vague for the same reason as sign-in.
    return fail('conflict', 'That email address cannot be used to register.');
  }

  if (status === 400 || status === 401) {
    return fail('invalid', 'Those sign-in details did not match.');
  }

  return fail('unavailable', 'Accounts are temporarily unavailable. Try again shortly.');
}

function fromPostgrestError(error: PostgrestError): { ok: false; error: ActionError } {
  if (error.message.includes('display_name_invalid')) {
    return fail('invalid', 'Check the highlighted fields.', {
      fieldErrors: { displayName: ['Enter the name other people will see.'] },
    });
  }
  if (error.message.includes('location_invalid')) {
    return fail('invalid', 'Check the highlighted fields.', {
      fieldErrors: { location: ['That location is too long.'] },
    });
  }
  if (error.message.includes('unauthenticated')) {
    return fail('unauthenticated', 'Sign in to continue.');
  }
  return fail('unavailable', 'That change could not be saved. Try again shortly.');
}

export async function register(
  client: RequestClient,
  raw: unknown,
): Promise<ActionResult<{ confirmationRequired: boolean }>> {
  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) return invalid(parsed.error);

  const { APP_URL } = getPublicConfig();
  const { data, error } = await client.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { display_name: parsed.data.displayName },
      emailRedirectTo: `${APP_URL}/auth/confirm`,
    },
  });

  if (error) return fromAuthError(error);

  // With confirmations enabled there is no session yet; the profile row is
  // created by the database trigger, not here.
  return { ok: true, data: { confirmationRequired: data.session === null } };
}

export async function login(
  client: RequestClient,
  raw: unknown,
): Promise<ActionResult<{ userId: string }>> {
  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) return invalid(parsed.error);

  const { data, error } = await client.auth.signInWithPassword(parsed.data);
  if (error) return fromAuthError(error);

  return { ok: true, data: { userId: data.user.id } };
}

export async function logout(client: RequestClient): Promise<ActionResult<null>> {
  const { error } = await client.auth.signOut();
  if (error) return fromAuthError(error);
  return { ok: true, data: null };
}

/**
 * Always reports success. A different answer for a known and an unknown
 * address would let anyone test which emails have accounts.
 */
export async function requestRecovery(
  client: RequestClient,
  raw: unknown,
): Promise<ActionResult<null>> {
  const parsed = recoveryRequestSchema.safeParse(raw);
  if (!parsed.success) return invalid(parsed.error);

  const { APP_URL } = getPublicConfig();
  const { error } = await client.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${APP_URL}/auth/callback?next=/reset-password`,
  });

  // Only a rate limit is surfaced; anything else is swallowed on purpose.
  if (error && (error.status === 429 || (error.code ?? '').includes('rate_limit'))) {
    return fromAuthError(error);
  }

  return { ok: true, data: null };
}

/** Requires the recovery session created by the callback handler. */
export async function updatePassword(
  client: RequestClient,
  raw: unknown,
): Promise<ActionResult<null>> {
  const parsed = passwordUpdateSchema.safeParse(raw);
  if (!parsed.success) return invalid(parsed.error);

  const check = await requireViewer(client);
  if (!check.ok) return { ok: false, error: check.error };

  const { error } = await client.auth.updateUser({ password: parsed.data.password });
  if (error) return fromAuthError(error);

  return { ok: true, data: null };
}

export async function getOwnProfile(client: RequestClient): Promise<ActionResult<OwnProfile>> {
  const check = await requireViewer(client);
  if (!check.ok) return { ok: false, error: check.error };

  const [profile, contacts, user] = await Promise.all([
    client
      .from('profiles')
      .select('user_id, display_name, location, updated_at')
      .eq('user_id', check.viewer.id)
      .single(),
    client.rpc('get_my_contacts'),
    client.auth.getUser(),
  ]);

  if (profile.error) return fromPostgrestError(profile.error);
  if (contacts.error) return fromPostgrestError(contacts.error);

  const contact = contacts.data?.[0];

  return {
    ok: true,
    data: {
      userId: profile.data.user_id,
      displayName: profile.data.display_name,
      location: profile.data.location,
      accountEmail: user.data.user?.email ?? '',
      contactEmail: contact?.contact_email ?? null,
      contactPhone: contact?.contact_phone ?? null,
      publishContactEmail: contact?.publish_email ?? false,
      publishContactPhone: contact?.publish_phone ?? false,
      updatedAt: profile.data.updated_at,
    },
  };
}

export async function updateProfile(
  client: RequestClient,
  raw: unknown,
): Promise<ActionResult<OwnProfile>> {
  const parsed = profileUpdateSchema.safeParse(raw);
  if (!parsed.success) return invalid(parsed.error);

  const check = await requireViewer(client, { confirmed: true });
  if (!check.ok) return { ok: false, error: check.error };

  // The function takes no user id: it writes the caller's own row.
  const { error } = await client.rpc('update_profile', {
    p_display_name: parsed.data.displayName,
    p_location: parsed.data.location,
    p_contact_email: parsed.data.contactEmail,
    p_contact_phone: parsed.data.contactPhone,
    p_publish_email: parsed.data.publishContactEmail,
    p_publish_phone: parsed.data.publishContactPhone,
  });

  if (error) return fromPostgrestError(error);

  return getOwnProfile(client);
}
