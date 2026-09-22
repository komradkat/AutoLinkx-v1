/**
 * Viewer mapping (A-04).
 *
 * The rules under test: a broken token is a visitor rather than an error, an
 * unconfirmed account cannot inquire or sell, and nobody is an administrator
 * until A-05 adds the membership table.
 */
import { describe, expect, it } from 'vitest';

import { getViewer, requireViewer } from '../../src/server/auth/viewer';
import type { RequestClient } from '../../src/server/supabase/request-client';

/** A client that answers `getUser()` and nothing else. */
function clientReturning(result: { user?: Record<string, unknown> | null; error?: unknown }): RequestClient {
  return {
    auth: {
      getUser: async () => ({
        data: { user: result.user ?? null },
        error: result.error ?? null,
      }),
    },
  } as unknown as RequestClient;
}

function userClient(overrides: Record<string, unknown> = {}): RequestClient {
  return clientReturning({
    user: {
      id: '11111111-1111-4111-8111-111111111111',
      email: 'seller@example.test',
      email_confirmed_at: '2026-09-01T00:00:00.000Z',
      user_metadata: { display_name: 'Sam Seller' },
      ...overrides,
    },
  });
}

describe('getViewer', () => {
  it('reports anonymous when there is no user', async () => {
    const viewer = await getViewer(clientReturning({ user: null }));
    expect(viewer.status).toBe('anonymous');
    expect(viewer.capabilities).toEqual({
      canFavorite: false,
      canInquire: false,
      canReport: false,
      canSell: false,
      canModerate: false,
    });
  });

  it('treats an expired or malformed token as anonymous, not an error', async () => {
    const viewer = await getViewer(
      clientReturning({ error: { message: 'invalid claim: missing sub claim' } }),
    );
    expect(viewer.status).toBe('anonymous');
  });

  it('returns a safe DTO for a confirmed user', async () => {
    const viewer = await getViewer(userClient());
    expect(viewer).toMatchObject({
      status: 'signed_in',
      id: '11111111-1111-4111-8111-111111111111',
      displayName: 'Sam Seller',
      emailConfirmed: true,
      isAdministrator: false,
    });
  });

  it('never exposes the account email or any token', async () => {
    const viewer = await getViewer(userClient());
    const serialized = JSON.stringify(viewer);
    expect(serialized).not.toContain('seller@example.test');
    expect(serialized).not.toMatch(/token|jwt|refresh/i);
  });

  it('withholds inquiry, report and sell capabilities until the email is confirmed', async () => {
    const viewer = await getViewer(userClient({ email_confirmed_at: null, confirmed_at: null }));
    expect(viewer.capabilities).toMatchObject({
      canFavorite: true,
      canInquire: false,
      canReport: false,
      canSell: false,
    });
  });

  it('ignores an administrator claim planted in user metadata', async () => {
    const viewer = await getViewer(
      userClient({ user_metadata: { display_name: 'Mallory', is_admin: true, role: 'admin' } }),
    );
    expect(viewer).toMatchObject({ isAdministrator: false });
    expect(viewer.capabilities.canModerate).toBe(false);
  });

  it('falls back to a neutral display name instead of leaking the email', async () => {
    const viewer = await getViewer(userClient({ user_metadata: {} }));
    expect(viewer).toMatchObject({ displayName: 'Member' });
  });
});

describe('requireViewer', () => {
  it('denies an anonymous caller with unauthenticated', async () => {
    const result = await requireViewer(clientReturning({ user: null }));
    expect(result).toMatchObject({ ok: false, error: { code: 'unauthenticated' } });
  });

  it('denies an unconfirmed caller with forbidden', async () => {
    const client = userClient({ email_confirmed_at: null, confirmed_at: null });
    expect(await requireViewer(client, { confirmed: true })).toMatchObject({
      ok: false,
      error: { code: 'forbidden' },
    });
  });

  it('denies moderation to every caller while membership is unimplemented', async () => {
    expect(await requireViewer(userClient(), { administrator: true })).toMatchObject({
      ok: false,
      error: { code: 'forbidden' },
    });
  });

  it('admits a confirmed caller when no extra requirement applies', async () => {
    const result = await requireViewer(userClient(), { confirmed: true });
    expect(result.ok).toBe(true);
  });

  it('returns errors shaped like the shared contract', async () => {
    const result = await requireViewer(clientReturning({ user: null }));
    if (result.ok) throw new Error('expected a denial');
    expect(result.error).toEqual({
      code: 'unauthenticated',
      message: expect.any(String),
      fieldErrors: null,
      retryAfterSeconds: null,
      currentVersion: null,
    });
  });
});
