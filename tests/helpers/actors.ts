/**
 * Test actors for permission tests (A-05).
 *
 * Every actor signs in with an ordinary password and uses the publishable key,
 * because that is how a real caller reaches the Data API. The service role is
 * used only to create and delete the accounts themselves — never as the actor
 * under test, since it bypasses row-level security and would prove nothing.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { createAdminClient } from '../../src/server/supabase/admin-client';
import type { Database } from '../../src/server/database.types';

export const ACTOR_PASSWORD = 'local-test-password-1234';

export interface Actor {
  id: string;
  email: string;
  displayName: string;
  /** Signed-in client carrying this user's token. */
  client: SupabaseClient<Database>;
}

export function anonymousClient(): SupabaseClient<Database> {
  return createClient<Database>(
    process.env.SUPABASE_URL as string,
    process.env.SUPABASE_PUBLISHABLE_KEY as string,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

export async function localStackIsUp(): Promise<boolean> {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY) return false;
  try {
    const response = await fetch(`${process.env.SUPABASE_URL}/auth/v1/health`, {
      signal: AbortSignal.timeout(2000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/** Creates a confirmed account and returns a client signed in as that user. */
/**
 * A deliberately untyped view of a client, for probes that try to reach
 * something the generated types do not contain — `app_private` is absent from
 * `Database` precisely because it is not exposed. The test asserts the API
 * refuses the call; TypeScript cannot express an attack.
 */
export function offContract(client: SupabaseClient<Database>): SupabaseClient {
  return client as unknown as SupabaseClient;
}

export async function createActor(label: string, displayName: string): Promise<Actor> {
  const admin = createAdminClient();
  const email = `a05-${label}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.test`;

  const created = await admin.auth.admin.createUser({
    email,
    password: ACTOR_PASSWORD,
    email_confirm: true,
    user_metadata: { display_name: displayName },
  });
  if (created.error) throw created.error;

  const client = anonymousClient();
  const signIn = await client.auth.signInWithPassword({ email, password: ACTOR_PASSWORD });
  if (signIn.error) throw signIn.error;

  return { id: created.data.user.id, email, displayName, client };
}

/** Grants membership the way the operator bootstrap will: privileged, explicit. */
export async function grantAdministrator(userId: string): Promise<void> {
  // `app_private` is not exposed through the Data API, so even the service
  // role cannot insert the row directly: it goes through the operator-only
  // function, exactly as the bootstrap command will.
  const admin = createAdminClient();
  const { error } = await admin.rpc('grant_administrator', { p_user_id: userId });
  if (error) throw error;
}

export async function deleteActors(...actors: Actor[]): Promise<void> {
  const admin = createAdminClient();
  for (const actor of actors) {
    await actor.client.auth.signOut();
    await admin.auth.admin.deleteUser(actor.id);
  }
}

/** A cookie jar standing in for one browser across several requests. */
export function cookieJar() {
  const jar = new Map<string, string>();
  return {
    getAll: () => [...jar.entries()].map(([name, value]) => ({ name, value })),
    setAll: (cookies: { name: string; value: string }[]) => {
      for (const { name, value } of cookies) {
        if (value === '') jar.delete(name);
        else jar.set(name, value);
      }
    },
  };
}

/** Reads the most recent message the local mail catcher received. */
export async function latestEmail(): Promise<{ to: string; body: string } | null> {
  const base = 'http://127.0.0.1:54424';
  const list = await fetch(`${base}/api/v1/messages?limit=1`).then((r) => r.json());
  const summary = list.messages?.[0];
  if (!summary) return null;

  const message = await fetch(`${base}/api/v1/message/${summary.ID}`).then((r) => r.json());
  return {
    to: summary.To?.[0]?.Address ?? '',
    body: `${message.Text ?? ''}\n${message.HTML ?? ''}`,
  };
}

export async function clearMailbox(): Promise<void> {
  await fetch('http://127.0.0.1:54424/api/v1/messages', { method: 'DELETE' });
}
