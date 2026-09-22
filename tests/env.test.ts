/**
 * Startup configuration validation (A-03).
 *
 * The rules worth protecting: a missing variable must fail loudly and name
 * itself, the privileged key must stay out of the ordinary path, and no
 * error message may ever carry a secret value into a log.
 */
import { describe, expect, it } from 'vitest';

import { getPublicConfig, getSecretConfig, type EnvSource } from '../src/server/config/env';

const valid: EnvSource = {
  APP_URL: 'http://localhost:3000',
  SUPABASE_URL: 'http://127.0.0.1:54321',
  SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_local',
  MARKETPLACE_CURRENCY: 'PHP',
  LISTING_PHOTOS_BUCKET: 'listing-photos',
  LOG_LEVEL: 'info',
};

describe('public configuration', () => {
  it('parses a complete environment', () => {
    expect(getPublicConfig(valid)).toMatchObject({
      APP_URL: 'http://localhost:3000',
      MARKETPLACE_CURRENCY: 'PHP',
      LOG_LEVEL: 'info',
    });
  });

  it('defaults the log level', () => {
    const withoutLogLevel = { ...valid, LOG_LEVEL: undefined };
    expect(getPublicConfig(withoutLogLevel).LOG_LEVEL).toBe('info');
  });

  it('names every missing variable', () => {
    expect(() => getPublicConfig({})).toThrow(/APP_URL: is missing/);
    expect(() => getPublicConfig({})).toThrow(/SUPABASE_PUBLISHABLE_KEY: is missing/);
  });

  it('rejects a currency that is not an ISO-4217 code', () => {
    expect(() => getPublicConfig({ ...valid, MARKETPLACE_CURRENCY: 'euro' })).toThrow(
      /MARKETPLACE_CURRENCY: must be a three-letter uppercase/,
    );
  });

  it('rejects a non-absolute Supabase URL', () => {
    expect(() => getPublicConfig({ ...valid, SUPABASE_URL: '127.0.0.1:54321' })).toThrow(
      /SUPABASE_URL: must be an absolute http/,
    );
  });

  it('ignores the privileged key, so pages cannot depend on it', () => {
    const config = getPublicConfig({ ...valid, SUPABASE_SECRET_KEY: 'sb_secret_value' });
    expect(Object.values(config)).not.toContain('sb_secret_value');
  });
});

describe('privileged configuration', () => {
  it('reads the secret key only when asked', () => {
    expect(getSecretConfig({ SUPABASE_SECRET_KEY: 'sb_secret_value' })).toEqual({
      SUPABASE_SECRET_KEY: 'sb_secret_value',
    });
  });

  it('fails with an actionable message when it is absent', () => {
    expect(() => getSecretConfig({})).toThrow(/SUPABASE_SECRET_KEY: is missing/);
  });
});

describe('error messages never leak values', () => {
  it.each([
    ['MARKETPLACE_CURRENCY', 'not-a-currency-code'],
    ['SUPABASE_URL', 'sb_secret_looking_value'],
    ['APP_URL', 'https://user:hunter2@example.com'],
  ])('omits the rejected %s value', (name, value) => {
    try {
      getPublicConfig({ ...valid, [name]: value });
      throw new Error('expected a validation failure');
    } catch (error) {
      expect((error as Error).message).not.toContain(value);
      expect((error as Error).message).toContain(name);
    }
  });

  it('omits the secret value when the privileged key is malformed', () => {
    try {
      getSecretConfig({ SUPABASE_SECRET_KEY: '' });
      throw new Error('expected a validation failure');
    } catch (error) {
      expect((error as Error).message).toContain('SUPABASE_SECRET_KEY');
    }
  });
});
