/**
 * Next.js binding for the request-scoped client (A-04).
 *
 * Kept apart from `request-client.ts` so the client itself stays testable
 * without a Next request context.
 */
import 'server-only';
import { cookies } from 'next/headers';

import {
  createRequestClient,
  type CookieAdapter,
  type RequestClient,
} from './request-client';

/**
 * Builds a client bound to this request's cookies.
 *
 * Server Components may read cookies but not write them, so a refresh written
 * during a render would throw. That write is swallowed here and the proxy
 * performs the refresh on a response that can carry cookies and the
 * accompanying no-store headers. In Server Actions and Route Handlers the
 * write succeeds normally.
 */
export async function getRequestClient(): Promise<RequestClient> {
  const store = await cookies();

  const adapter: CookieAdapter = {
    getAll: () => store.getAll().map(({ name, value }) => ({ name, value })),
    setAll: (cookiesToSet) => {
      try {
        for (const { name, value, options } of cookiesToSet) {
          store.set(name, value, options);
        }
      } catch {
        // Rendering a Server Component: the proxy owns this refresh.
      }
    },
  };

  return createRequestClient(adapter);
}
