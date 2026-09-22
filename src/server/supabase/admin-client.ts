/**
 * Privileged Supabase client (A-04).
 *
 * This client authenticates with the secret key and therefore **bypasses
 * row-level security entirely**. It exists for the few operations a user's own
 * token cannot perform: Auth administration, validated Storage writes, and
 * maintenance jobs.
 *
 * Rules for every caller:
 *
 * 1. Establish the authorized actor and target *first*, with
 *    `requireViewer()` or an equivalent check. This client answers no
 *    authorization questions.
 * 2. Scope each call to that verified target. Never pass a filter straight
 *    from user input.
 * 3. Never reach for it to make an RLS failure go away. A denial usually means
 *    the policy or the query is wrong.
 *
 * It is deliberately not exported from any barrel file, so an import of it is
 * visible in review.
 */
import 'server-only';
import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

import { getPublicConfig, getSecretConfig } from '../config/env';
import type { Database } from '../database.types';

export type AdminClient = SupabaseClient<Database>;

/**
 * Creates a client with no user session attached. Sessions are never
 * persisted or refreshed: there is no user to refresh, and persistence would
 * let one request's state reach another.
 */
export function createAdminClient(): AdminClient {
  const { SUPABASE_URL } = getPublicConfig();
  const { SUPABASE_SECRET_KEY } = getSecretConfig();

  return createClient<Database>(SUPABASE_URL, SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
