'use server';

/**
 * Account Server Actions (A-06).
 *
 * The public surface Developer B's forms call. Each one builds a
 * request-scoped client, validates, and returns the shared `ActionResult`;
 * none accepts an actor id. Authorization happens here and in the database,
 * never in the page that renders the form.
 */
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import type { ActionResult, OwnProfile } from '@/contracts';
import { AUTH_ROUTES } from '@/contracts';
import { safeRedirect } from '@/server/auth/redirects';
import { getRequestClient } from '@/server/supabase/next';

import * as service from './service';

function field(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === 'string' ? value : '';
}

function checkbox(form: FormData, name: string): boolean {
  return form.get(name) !== null;
}

export async function registerAction(
  _previous: ActionResult<{ confirmationRequired: boolean }> | null,
  form: FormData,
): Promise<ActionResult<{ confirmationRequired: boolean }>> {
  const client = await getRequestClient();
  return service.register(client, {
    email: field(form, 'email'),
    password: field(form, 'password'),
    displayName: field(form, 'displayName'),
  });
}

export async function loginAction(
  _previous: ActionResult<{ userId: string }> | null,
  form: FormData,
): Promise<ActionResult<{ userId: string }>> {
  const client = await getRequestClient();
  const result = await service.login(client, {
    email: field(form, 'email'),
    password: field(form, 'password'),
  });

  if (!result.ok) return result;

  // `next` comes from the URL, so it is attacker-supplied until checked.
  redirect(safeRedirect(field(form, 'next')));
}

export async function logoutAction(): Promise<void> {
  const client = await getRequestClient();
  await service.logout(client);
  revalidatePath('/', 'layout');
  redirect('/');
}

export async function requestRecoveryAction(
  _previous: ActionResult<null> | null,
  form: FormData,
): Promise<ActionResult<null>> {
  const client = await getRequestClient();
  return service.requestRecovery(client, { email: field(form, 'email') });
}

export async function updatePasswordAction(
  _previous: ActionResult<null> | null,
  form: FormData,
): Promise<ActionResult<null>> {
  const client = await getRequestClient();
  const result = await service.updatePassword(client, { password: field(form, 'password') });

  if (!result.ok) return result;

  redirect(`${AUTH_ROUTES.login}?notice=password_updated`);
}

export async function updateProfileAction(
  _previous: ActionResult<OwnProfile> | null,
  form: FormData,
): Promise<ActionResult<OwnProfile>> {
  const client = await getRequestClient();
  const result = await service.updateProfile(client, {
    displayName: field(form, 'displayName'),
    location: field(form, 'location'),
    contactEmail: field(form, 'contactEmail'),
    contactPhone: field(form, 'contactPhone'),
    publishContactEmail: checkbox(form, 'publishContactEmail'),
    publishContactPhone: checkbox(form, 'publishContactPhone'),
  });

  if (result.ok) revalidatePath('/profile');
  return result;
}
