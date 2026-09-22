/**
 * Safe redirect destinations (A-06).
 *
 * Auth flows carry a `next` parameter through links and emails, which makes it
 * attacker-supplied input. Anything that is not a known same-origin path is
 * replaced with the default rather than followed, so the app cannot be used to
 * bounce someone to another site while they trust our domain.
 */
import 'server-only';

import { AUTH_ROUTES, DEFAULT_SIGNED_IN_DESTINATION } from '@/contracts';

/**
 * Paths a signed-in user may be sent to after an auth flow. Prefix matching
 * covers nested routes such as `/dashboard/listings/new`.
 */
const ALLOWED_PREFIXES = [
  '/',
  '/cars',
  '/saved',
  '/profile',
  '/dashboard',
  AUTH_ROUTES.login,
  AUTH_ROUTES.register,
] as const;

/**
 * Returns a safe same-origin path. Rejects absolute URLs, protocol-relative
 * `//evil.example` values, backslash variants that some parsers normalise to
 * slashes, and anything outside the allowlist.
 */
export function safeRedirect(
  candidate: string | null | undefined,
  fallback: string = DEFAULT_SIGNED_IN_DESTINATION,
): string {
  if (!candidate) return fallback;

  const value = candidate.trim();

  // Must be a plain path. `//host`, `/\host`, `https://…` and `javascript:…`
  // all fail this test.
  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) {
    return fallback;
  }

  // Resolve against a fixed base so traversal and encoded tricks normalise
  // before the allowlist check.
  let path: string;
  try {
    const url = new URL(value, 'https://autolinkx.invalid');
    if (url.origin !== 'https://autolinkx.invalid') return fallback;
    path = url.pathname + url.search;
  } catch {
    return fallback;
  }

  const pathname = path.split('?')[0] ?? '/';
  const allowed = ALLOWED_PREFIXES.some(
    (prefix) => pathname === prefix || (prefix !== '/' && pathname.startsWith(`${prefix}/`)),
  );

  return allowed ? path : fallback;
}
