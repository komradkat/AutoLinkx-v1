/**
 * Session refresh (A-04). Next 16 renamed the middleware convention to proxy.
 *
 * Its only job is to keep the access token fresh and write refreshed cookies
 * back on a response that can carry them, together with the no-store headers
 * `@supabase/ssr` supplies. A Server Component cannot set cookies, so without
 * this a session would expire mid-visit.
 *
 * **This is not an authorization layer.** It does not decide who may see a
 * route. Proxy runs before rendering and can be skipped by a matcher change,
 * so every Server Action, Route Handler, and query authorizes independently
 * (AGENTS.md, "Security and data rules").
 */
import { NextResponse, type NextRequest } from 'next/server';

import { createRequestClient } from '@/server/supabase/request-client';

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const client = createRequestClient({
    getAll: () => request.cookies.getAll().map(({ name, value }) => ({ name, value })),
    setAll: (cookiesToSet, headers) => {
      for (const { name, value } of cookiesToSet) {
        request.cookies.set(name, value);
      }

      response = NextResponse.next({ request });

      for (const { name, value, options } of cookiesToSet) {
        response.cookies.set(name, value, options);
      }

      // Responses carrying auth cookies must never reach a shared cache, or
      // one visitor could be served another's session token.
      for (const [header, value] of Object.entries(headers)) {
        response.headers.set(header, value);
      }
    },
  });

  // Reads the user, refreshing the token when needed; the refresh is what
  // triggers setAll above. The result is deliberately unused: authorization
  // happens in the action or query that actually touches data.
  await client.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    /*
     * Everything except static assets and image files. Auth callbacks and
     * media routes are included on purpose: they need a current session.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
