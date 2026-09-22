/**
 * Shared handling for confirmation and recovery links (A-06).
 *
 * Supabase sends either a `token_hash` + `type` pair or a PKCE `code`,
 * depending on the template and flow, so both are accepted. An invalid,
 * expired, or already-used link is never an error page: it redirects to the
 * sign-in screen with a notice and an obvious way to request a new one.
 *
 * Redirect targets are rebuilt from the configured APP_URL rather than the
 * request host, and the token itself is never logged or echoed back.
 */
import 'server-only';
import { NextResponse } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';

import { AUTH_ROUTES, type AuthNotice } from '@/contracts';
import { getPublicConfig } from '@/server/config/env';
import { safeRedirect } from '@/server/auth/redirects';
import { getRequestClient } from '@/server/supabase/next';

const OTP_TYPES: readonly EmailOtpType[] = [
  'signup',
  'invite',
  'magiclink',
  'recovery',
  'email_change',
  'email',
];

function destination(path: string, notice: AuthNotice): URL {
  const { APP_URL } = getPublicConfig();
  const url = new URL(path, APP_URL);
  url.searchParams.set('notice', notice);
  return url;
}

export interface LinkOptions {
  /** Where to send the visitor when the link checks out. */
  successPath: string;
  successNotice: AuthNotice;
}

export async function completeAuthLink(
  request: Request,
  options: LinkOptions,
): Promise<NextResponse> {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get('token_hash');
  const rawType = url.searchParams.get('type');
  const code = url.searchParams.get('code');

  // `next` arrives from the email link, so it is untrusted input.
  const next = safeRedirect(url.searchParams.get('next'), options.successPath);

  const client = await getRequestClient();

  if (tokenHash && rawType && OTP_TYPES.includes(rawType as EmailOtpType)) {
    const { error } = await client.auth.verifyOtp({
      type: rawType as EmailOtpType,
      token_hash: tokenHash,
    });
    if (!error) return NextResponse.redirect(destination(next, options.successNotice));
    return NextResponse.redirect(destination(AUTH_ROUTES.login, 'link_expired'));
  }

  if (code) {
    const { error } = await client.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(destination(next, options.successNotice));
    return NextResponse.redirect(destination(AUTH_ROUTES.login, 'link_expired'));
  }

  return NextResponse.redirect(destination(AUTH_ROUTES.login, 'link_invalid'));
}
