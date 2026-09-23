/**
 * Safe error mapping for account services (A-07).
 *
 * Provider failures must reach the caller as one of the agreed codes, with a
 * message that never leaks provider internals and never reveals whether an
 * account exists. These run against fake clients, so they need no database and
 * always run in CI.
 */
import { describe, expect, it } from 'vitest';

import { ACTION_ERROR_CODES } from '../../src/contracts';
import * as accounts from '../../src/features/accounts/service';
import type { RequestClient } from '../../src/server/supabase/request-client';

/** A client whose auth calls fail the way Supabase reports failures. */
function authFailing(error: { status?: number; code?: string; message?: string }): RequestClient {
  const failure = { data: { user: null, session: null }, error };
  return {
    auth: {
      signUp: async () => failure,
      signInWithPassword: async () => failure,
      resetPasswordForEmail: async () => ({ data: null, error }),
      getUser: async () => ({ data: { user: null }, error: null }),
    },
  } as unknown as RequestClient;
}

const goodRegistration = {
  email: 'someone@example.test',
  password: 'a-long-enough-password',
  displayName: 'Someone',
};

describe('every failure maps to an agreed code', () => {
  it.each([
    [{ status: 429, code: 'over_request_rate_limit' }, 'rate_limited'],
    [{ status: 400, code: 'invalid_credentials' }, 'invalid'],
    [{ status: 401, code: 'invalid_credentials' }, 'invalid'],
    [{ status: 403, code: 'email_not_confirmed' }, 'forbidden'],
    [{ status: 422, code: 'user_already_exists' }, 'conflict'],
    [{ status: 500, code: 'unexpected_failure' }, 'unavailable'],
  ])('%o becomes %s', async (error, expected) => {
    const result = await accounts.login(authFailing(error), {
      email: 'someone@example.test',
      password: 'a-long-enough-password',
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('unreachable');
    expect(result.error.code).toBe(expected);
    expect(ACTION_ERROR_CODES).toContain(result.error.code);
  });

  it('carries retry guidance only when rate limited', async () => {
    const limited = await accounts.login(authFailing({ status: 429, code: 'over_request_rate_limit' }), {
      email: 'someone@example.test',
      password: 'a-long-enough-password',
    });
    const refused = await accounts.login(authFailing({ status: 400, code: 'invalid_credentials' }), {
      email: 'someone@example.test',
      password: 'a-long-enough-password',
    });

    if (limited.ok || refused.ok) throw new Error('unreachable');
    expect(limited.error.retryAfterSeconds).toBeGreaterThan(0);
    expect(refused.error.retryAfterSeconds).toBeNull();
  });
});

describe('messages stay safe', () => {
  it('never repeats the provider message', async () => {
    const result = await accounts.login(
      authFailing({ status: 500, message: 'relation "auth.users" does not exist' }),
      { email: 'someone@example.test', password: 'a-long-enough-password' },
    );

    if (result.ok) throw new Error('unreachable');
    expect(result.error.message).not.toMatch(/relation|auth\.users|SQL/i);
  });

  it('answers a wrong password and an unknown account identically', async () => {
    const wrongPassword = await accounts.login(authFailing({ status: 400, code: 'invalid_credentials' }), {
      email: 'known@example.test',
      password: 'a-long-enough-password',
    });
    const unknownAccount = await accounts.login(authFailing({ status: 400, code: 'invalid_credentials' }), {
      email: 'nobody@example.test',
      password: 'a-long-enough-password',
    });

    if (wrongPassword.ok || unknownAccount.ok) throw new Error('unreachable');
    expect(wrongPassword.error).toEqual(unknownAccount.error);
  });

  it('keeps registration vague when the address is taken', async () => {
    const result = await accounts.register(
      authFailing({ status: 422, code: 'user_already_exists' }),
      goodRegistration,
    );

    if (result.ok) throw new Error('unreachable');
    // "conflict", not a message confirming the address has an account.
    expect(result.error.code).toBe('conflict');
    expect(result.error.message).not.toMatch(/already|exists|registered|taken/i);
  });

  it('reports recovery as sent even when the provider fails', async () => {
    const result = await accounts.requestRecovery(authFailing({ status: 500, code: 'unexpected_failure' }), {
      email: 'nobody@example.test',
    });

    // Anything else would let the form enumerate accounts.
    expect(result.ok).toBe(true);
  });

  it('passes a recovery rate limit through, since that is not a disclosure', async () => {
    const result = await accounts.requestRecovery(
      authFailing({ status: 429, code: 'over_email_send_rate_limit' }),
      { email: 'nobody@example.test' },
    );

    expect(result).toMatchObject({ ok: false, error: { code: 'rate_limited' } });
  });
});

describe('validation runs before the provider is called', () => {
  it('rejects a short password without contacting Auth', async () => {
    let called = false;
    const client = {
      auth: {
        signUp: async () => {
          called = true;
          return { data: { user: null, session: null }, error: null };
        },
      },
    } as unknown as RequestClient;

    const result = await accounts.register(client, { ...goodRegistration, password: 'short' });

    expect(called).toBe(false);
    expect(result).toMatchObject({ ok: false, error: { code: 'invalid' } });
    if (result.ok) throw new Error('unreachable');
    expect(result.error.fieldErrors).toMatchObject({ password: expect.any(Array) });
  });

  it('names every invalid field at once', async () => {
    const client = { auth: {} } as unknown as RequestClient;
    const result = await accounts.register(client, {
      email: 'not-an-email',
      password: 'short',
      displayName: '',
    });

    if (result.ok) throw new Error('unreachable');
    expect(Object.keys(result.error.fieldErrors ?? {}).sort()).toEqual([
      'displayName',
      'email',
      'password',
    ]);
  });
});
