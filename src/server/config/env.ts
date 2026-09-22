/**
 * Startup configuration (A-03).
 *
 * Two deliberately separate readers:
 *
 * - `getPublicConfig()` — ordinary values every request may need. Safe to read
 *   anywhere on the server.
 * - `getSecretConfig()` — privileged credentials. Read only from server-only
 *   modules that genuinely need to bypass RLS (Auth administration, validated
 *   Storage writes, maintenance).
 *
 * Splitting them means a missing secret key cannot break ordinary pages, and
 * a careless import cannot drag the secret into a bundle that does not need
 * it. Validation failures name the variable and the rule, never the value.
 */
import 'server-only';
import { z } from 'zod';

/**
 * An absolute http(s) URL with no embedded credentials. These values end up in
 * redirects, Auth configuration, and logs, where a `user:password@host` form
 * would leak a credential and confuse origin comparisons.
 */
function httpUrl(example: string) {
  const message = `must be an absolute http(s) URL without embedded credentials, e.g. ${example}`;
  return z.url({ message }).refine((value) => {
    let url: URL;
    try {
      url = new URL(value);
    } catch {
      return false; // `z.url()` is laxer than the WHATWG parser; never throw from here.
    }
    const isHttp = url.protocol === 'http:' || url.protocol === 'https:';
    return isHttp && url.username === '' && url.password === '';
  }, message);
}

const publicSchema = z.object({
  APP_URL: httpUrl('http://localhost:3000'),
  SUPABASE_URL: httpUrl('http://127.0.0.1:54321'),
  SUPABASE_PUBLISHABLE_KEY: z.string().min(1, 'must not be empty'),
  MARKETPLACE_CURRENCY: z
    .string()
    .regex(/^[A-Z]{3}$/, 'must be a three-letter uppercase ISO-4217 code, e.g. PHP'),
  LISTING_PHOTOS_BUCKET: z.string().min(1, 'must not be empty'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

const secretSchema = z.object({
  SUPABASE_SECRET_KEY: z.string().min(1, 'must not be empty'),
});

export type PublicConfig = z.infer<typeof publicSchema>;
export type SecretConfig = z.infer<typeof secretSchema>;

/** Source of values; injectable so tests never mutate `process.env`. */
export type EnvSource = Record<string, string | undefined>;

/**
 * Builds an actionable message naming each offending variable and its rule.
 * Values are never interpolated: this text reaches logs and error pages.
 */
function describeFailure(error: z.ZodError, context: string): string {
  const lines = error.issues.map((issue) => {
    const name = issue.path.join('.') || '(root)';
    const reason = issue.code === 'invalid_type' ? 'is missing' : issue.message;
    return `  - ${name}: ${reason}`;
  });
  return `Invalid ${context} configuration. Copy .env.example to .env.local and fix:\n${lines.join('\n')}`;
}

let cachedPublic: PublicConfig | null = null;

export function getPublicConfig(source: EnvSource = process.env): PublicConfig {
  if (source === process.env && cachedPublic) return cachedPublic;

  const parsed = publicSchema.safeParse(source);
  if (!parsed.success) throw new Error(describeFailure(parsed.error, 'application'));

  if (source === process.env) cachedPublic = parsed.data;
  return parsed.data;
}

/**
 * Privileged credentials. Every caller must already have established the
 * authorized actor and target: these values bypass row-level security.
 */
export function getSecretConfig(source: EnvSource = process.env): SecretConfig {
  const parsed = secretSchema.safeParse(source);
  if (!parsed.success) throw new Error(describeFailure(parsed.error, 'privileged'));
  return parsed.data;
}

/** Test seam; production code has no reason to call this. */
export function resetConfigCache(): void {
  cachedPublic = null;
}
