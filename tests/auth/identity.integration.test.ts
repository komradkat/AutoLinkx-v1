/**
 * Identity against real local Supabase Auth (A-04).
 *
 * Unit tests prove the mapping; this proves the wiring — that a sign-in
 * actually lands in cookies, that a second client built from those cookies
 * sees the same user, that a tampered cookie degrades to anonymous, and that
 * two sessions never bleed into each other.
 *
 * Skipped automatically when the local stack is not running. A-07 adds the
 * disposable-Supabase CI job that makes these mandatory.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { getViewer } from '../../src/server/auth/viewer';
import { createAdminClient } from '../../src/server/supabase/admin-client';
import {
  createRequestClient,
  type CookieAdapter,
  type CookieRecord,
  type CookieToSet,
} from '../../src/server/supabase/request-client';

const supabaseUrl = process.env.SUPABASE_URL;

async function stackIsUp(): Promise<boolean> {
  if (!supabaseUrl || !process.env.SUPABASE_SECRET_KEY) return false;
  try {
    const response = await fetch(`${supabaseUrl}/auth/v1/health`, {
      signal: AbortSignal.timeout(2000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

const localSupabaseRunning = await stackIsUp();

/** A cookie jar standing in for one browser across several requests. */
function cookieJar(): CookieAdapter & { headersSeen: Record<string, string>[] } {
  const jar = new Map<string, string>();
  const headersSeen: Record<string, string>[] = [];

  return {
    headersSeen,
    getAll: (): CookieRecord[] =>
      [...jar.entries()].map(([name, value]) => ({ name, value })),
    setAll: (cookies: CookieToSet[], headers: Record<string, string>) => {
      headersSeen.push(headers);
      for (const { name, value } of cookies) {
        if (value === '') jar.delete(name);
        else jar.set(name, value);
      }
    },
  };
}

const password = 'local-test-password-1234';
const confirmed = { email: `a04-confirmed-${Date.now()}@example.test`, id: '' };
const unconfirmed = { email: `a04-unconfirmed-${Date.now()}@example.test`, id: '' };

describe.skipIf(!localSupabaseRunning)('identity against local Supabase', () => {
  beforeAll(async () => {
    const admin = createAdminClient();

    const created = await admin.auth.admin.createUser({
      email: confirmed.email,
      password,
      email_confirm: true,
      user_metadata: { display_name: 'Sam Seller' },
    });
    if (created.error) throw created.error;
    confirmed.id = created.data.user.id;

    const pending = await admin.auth.admin.createUser({
      email: unconfirmed.email,
      password,
      email_confirm: false,
    });
    if (pending.error) throw pending.error;
    unconfirmed.id = pending.data.user.id;
  });

  afterAll(async () => {
    const admin = createAdminClient();
    for (const id of [confirmed.id, unconfirmed.id]) {
      if (id) await admin.auth.admin.deleteUser(id);
    }
  });

  it('sees no user before anyone signs in', async () => {
    const viewer = await getViewer(createRequestClient(cookieJar()));
    expect(viewer.status).toBe('anonymous');
  });

  it('carries a signed-in session across requests through cookies', async () => {
    const jar = cookieJar();

    const signIn = await createRequestClient(jar).auth.signInWithPassword({
      email: confirmed.email,
      password,
    });
    expect(signIn.error).toBeNull();

    // A separate client, as a later request would build: cookies are the only
    // thing carried over.
    const viewer = await getViewer(createRequestClient(jar));
    expect(viewer).toMatchObject({
      status: 'signed_in',
      id: confirmed.id,
      displayName: 'Sam Seller',
      emailConfirmed: true,
      isAdministrator: false,
    });
  });

  it('sends no-store headers with every auth cookie write', async () => {
    const jar = cookieJar();
    await createRequestClient(jar).auth.signInWithPassword({ email: confirmed.email, password });

    const cacheHeaders = jar.headersSeen.find((headers) => 'Cache-Control' in headers);
    expect(cacheHeaders?.['Cache-Control']).toMatch(/no-store/);
  });

  it('reports an unconfirmed account as signed in but unable to inquire', async () => {
    const jar = cookieJar();
    const signIn = await createRequestClient(jar).auth.signInWithPassword({
      email: unconfirmed.email,
      password,
    });

    // Local Auth is configured to require confirmation, so the sign-in itself
    // is refused; either way the viewer must not gain confirmed capabilities.
    if (signIn.error) {
      expect(await getViewer(createRequestClient(jar))).toMatchObject({ status: 'anonymous' });
      return;
    }

    const viewer = await getViewer(createRequestClient(jar));
    expect(viewer).toMatchObject({ emailConfirmed: false });
    expect(viewer.capabilities).toMatchObject({ canInquire: false, canSell: false });
  });

  it('treats a tampered session cookie as anonymous', async () => {
    const jar = cookieJar();
    await createRequestClient(jar).auth.signInWithPassword({ email: confirmed.email, password });

    const tampered: CookieAdapter = {
      getAll: () =>
        jar.getAll().map(({ name, value }) => ({ name, value: `${value.slice(0, -4)}AAAA` })),
      setAll: () => {},
    };

    expect(await getViewer(createRequestClient(tampered))).toMatchObject({ status: 'anonymous' });
  });

  it('treats a syntactically broken cookie as anonymous rather than crashing', async () => {
    const broken: CookieAdapter = {
      getAll: () => [{ name: 'sb-127-auth-token', value: 'not-a-token' }],
      setAll: () => {},
    };

    expect(await getViewer(createRequestClient(broken))).toMatchObject({ status: 'anonymous' });
  });

  it('keeps two sessions isolated', async () => {
    const sellerJar = cookieJar();
    await createRequestClient(sellerJar).auth.signInWithPassword({
      email: confirmed.email,
      password,
    });

    const visitorJar = cookieJar();

    const [seller, visitor] = await Promise.all([
      getViewer(createRequestClient(sellerJar)),
      getViewer(createRequestClient(visitorJar)),
    ]);

    expect(seller.status).toBe('signed_in');
    expect(visitor.status).toBe('anonymous');
  });

  it('denies an ordinary user the administrator capability', async () => {
    const jar = cookieJar();
    await createRequestClient(jar).auth.signInWithPassword({ email: confirmed.email, password });

    const viewer = await getViewer(createRequestClient(jar));
    expect(viewer).toMatchObject({ isAdministrator: false });
    expect(viewer.capabilities.canModerate).toBe(false);
  });
});
