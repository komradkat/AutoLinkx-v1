/**
 * The account journey against real local Supabase (A-06).
 *
 * Registration, the confirmation link out of the local mail catcher, sign-in
 * before and after confirming, profile editing, publication consent, and
 * recovery — through the same service functions the Server Actions call.
 *
 * Skipped when the local stack is not running.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import * as accounts from '../../src/features/accounts/service';
import { createAdminClient } from '../../src/server/supabase/admin-client';
import { createRequestClient } from '../../src/server/supabase/request-client';
import { anonymousClient, clearMailbox, cookieJar, latestEmail, localStackIsUp } from '../helpers/actors';

const stackIsUp = await localStackIsUp();

const email = `a06-journey-${Date.now()}@example.test`;
const password = 'local-journey-password-1234';
let userId = '';

/** A fresh browser: its own cookie jar, its own client per request. */
function browser() {
  const jar = cookieJar();
  return { jar, client: () => createRequestClient(jar) };
}

describe.skipIf(!stackIsUp)('account journey', () => {
  beforeAll(async () => {
    await clearMailbox();
  });

  afterAll(async () => {
    if (!userId) return;
    await createAdminClient().auth.admin.deleteUser(userId);
  });

  it('rejects a short password before touching Auth', async () => {
    const result = await accounts.register(browser().client(), {
      email,
      password: 'short',
      displayName: 'Ana Reyes',
    });

    expect(result).toMatchObject({ ok: false, error: { code: 'invalid' } });
    if (result.ok) throw new Error('unreachable');
    expect(result.error.fieldErrors).toMatchObject({ password: expect.any(Array) });
  });

  it('registers an account and asks for confirmation', async () => {
    const result = await accounts.register(browser().client(), {
      email,
      password,
      displayName: 'Ana Reyes',
    });

    expect(result).toMatchObject({ ok: true, data: { confirmationRequired: true } });
  }, 20_000);

  it('creates the profile row from the sign-up name', async () => {
    const { data } = await anonymousClient()
      .from('profiles')
      .select('user_id, display_name')
      .eq('display_name', 'Ana Reyes')
      .limit(1)
      .single();

    expect(data?.display_name).toBe('Ana Reyes');
    userId = data?.user_id ?? '';
    expect(userId).not.toBe('');
  });

  it('refuses sign-in until the email is confirmed', async () => {
    const result = await accounts.login(browser().client(), { email, password });
    expect(result).toMatchObject({ ok: false, error: { code: 'forbidden' } });
  }, 20_000);

  it('sends a confirmation link that works', async () => {
    const mail = await latestEmail();
    expect(mail?.to).toBe(email);

    const tokenHash = mail?.body.match(/token_hash=([A-Za-z0-9_-]+)/)?.[1];
    expect(tokenHash, 'confirmation link carries a token').toBeTruthy();

    const session = browser();
    const { error } = await session.client().auth.verifyOtp({
      type: 'email',
      token_hash: tokenHash as string,
    });

    expect(error).toBeNull();
  }, 20_000);

  it('signs in once confirmed', async () => {
    const result = await accounts.login(browser().client(), { email, password });
    expect(result).toMatchObject({ ok: true });
  }, 20_000);

  it('flattens a wrong password into one neutral message', async () => {
    const wrong = await accounts.login(browser().client(), { email, password: 'wrong-password-here' });
    const unknown = await accounts.login(browser().client(), {
      email: `nobody-${Date.now()}@example.test`,
      password: 'wrong-password-here',
    });

    expect(wrong).toMatchObject({ ok: false, error: { code: 'invalid' } });
    // Identical answers, so the form cannot be used to test which emails exist.
    if (wrong.ok || unknown.ok) throw new Error('unreachable');
    expect(wrong.error.message).toBe(unknown.error.message);
  }, 30_000);

  describe('as a signed-in user', () => {
    const session = browser();

    beforeAll(async () => {
      const result = await accounts.login(session.client(), { email, password });
      if (!result.ok) throw new Error('sign-in failed in setup');
    }, 20_000);

    it('returns the own-profile view, including the private account email', async () => {
      const result = await accounts.getOwnProfile(session.client());
      expect(result).toMatchObject({
        ok: true,
        data: {
          displayName: 'Ana Reyes',
          accountEmail: email,
          publishContactEmail: false,
          publishContactPhone: false,
        },
      });
    });

    it('saves a profile and publishes only what was consented to', async () => {
      const result = await accounts.updateProfile(session.client(), {
        displayName: 'Ana R.',
        location: 'Cebu City',
        contactEmail: 'ana.public@example.test',
        contactPhone: '+63 900 000 0001',
        publishContactEmail: true,
        publishContactPhone: false,
      });

      expect(result).toMatchObject({ ok: true, data: { displayName: 'Ana R.' } });

      const seenByAnyone = await anonymousClient()
        .from('profiles')
        .select('display_name, location, published_email, published_phone')
        .eq('user_id', userId)
        .single();

      expect(seenByAnyone.data).toEqual({
        display_name: 'Ana R.',
        location: 'Cebu City',
        published_email: 'ana.public@example.test',
        published_phone: null,
      });
    }, 20_000);

    it('never publishes the sign-in address', async () => {
      const { data } = await anonymousClient()
        .from('profiles')
        .select('published_email, published_phone')
        .eq('user_id', userId)
        .single();

      expect(JSON.stringify(data)).not.toContain(email);
    });

    it('rejects an empty display name with a field error', async () => {
      const result = await accounts.updateProfile(session.client(), {
        displayName: '  ',
        location: '',
        contactEmail: '',
        contactPhone: '',
        publishContactEmail: false,
        publishContactPhone: false,
      });

      expect(result).toMatchObject({ ok: false, error: { code: 'invalid' } });
      if (result.ok) throw new Error('unreachable');
      expect(result.error.fieldErrors).toMatchObject({ displayName: expect.any(Array) });
    });

    it('signs out', async () => {
      const client = session.client();
      expect(await accounts.logout(client)).toMatchObject({ ok: true });
      expect(await accounts.getOwnProfile(session.client())).toMatchObject({
        ok: false,
        error: { code: 'unauthenticated' },
      });
    }, 20_000);
  });

  describe('recovery', () => {
    it('reports success for an unknown address too', async () => {
      const result = await accounts.requestRecovery(browser().client(), {
        email: `nobody-${Date.now()}@example.test`,
      });
      expect(result).toMatchObject({ ok: true });
    }, 20_000);

    it('sends a recovery link for a real account', async () => {
      await clearMailbox();
      const result = await accounts.requestRecovery(browser().client(), { email });
      expect(result).toMatchObject({ ok: true });

      const mail = await latestEmail();
      expect(mail?.to).toBe(email);
      expect(mail?.body).toMatch(/token_hash=|type=recovery/);
    }, 20_000);

    it('refuses a password change without a session', async () => {
      const result = await accounts.updatePassword(browser().client(), { password });
      expect(result).toMatchObject({ ok: false, error: { code: 'unauthenticated' } });
    });
  });
});
