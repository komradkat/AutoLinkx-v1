/**
 * Request-scoped Supabase client (A-04).
 *
 * One client per request, carrying that caller's identity. Never a module
 * level client: a shared instance would leak one user's session into another
 * user's request, and `@supabase/ssr` only emits the required no-store cache
 * headers on a client's first cookie write.
 *
 * This module is framework-agnostic on purpose — it takes a cookie adapter
 * rather than importing `next/headers` — so proxy, route handlers, server
 * components, and tests can all supply their own.
 */
import 'server-only';
import { createServerClient } from '@supabase/ssr';
import type { CookieOptions } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

import { getPublicConfig } from '../config/env';
import type { Database } from '../database.types';

export interface CookieRecord {
  name: string;
  value: string;
}

export interface CookieToSet extends CookieRecord {
  options: CookieOptions;
}

/**
 * Where cookies are read from and written to for one request.
 *
 * `setAll` receives the headers the library requires alongside any auth
 * cookie write (`Cache-Control: private, no-store`, `Expires`, `Pragma`).
 * Dropping them would let a shared cache serve one user's session token to
 * another, so every adapter that can write a response must apply them.
 */
export interface CookieAdapter {
  getAll(): CookieRecord[];
  setAll(cookies: CookieToSet[], headers: Record<string, string>): void;
}

export type RequestClient = SupabaseClient<Database>;

/**
 * A client bound to the caller's cookies. Its queries run as that user, so
 * row-level security applies. Use this for everything except the narrow
 * privileged operations in `admin-client.ts`.
 */
export function createRequestClient(cookies: CookieAdapter): RequestClient {
  const { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } = getPublicConfig();

  return createServerClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll: () => cookies.getAll(),
      setAll: (cookiesToSet, headers) => cookies.setAll(cookiesToSet, headers),
    },
  });
}

/**
 * Adapter for contexts that may read cookies but cannot write them, such as
 * Server Components. Writes are dropped deliberately: the proxy refreshes
 * tokens and writes them back on a response that can carry headers.
 */
export function readOnlyCookieAdapter(getAll: () => CookieRecord[]): CookieAdapter {
  return {
    getAll,
    setAll: () => {
      /* The proxy owns refreshed cookies for this request. */
    },
  };
}
