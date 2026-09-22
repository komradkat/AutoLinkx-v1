import type { Metadata } from 'next';
import Link from 'next/link';

import { AUTH_ROUTES } from '@/contracts';
import { PasswordForm } from '@/features/accounts/components/account-forms';
import { Notice } from '@/components/form-controls';
import { getViewer } from '@/server/auth/viewer';
import { getRequestClient } from '@/server/supabase/next';

export const metadata: Metadata = { title: 'Choose a new password — AutoLinkX' };

export default async function ResetPasswordPage() {
  const viewer = await getViewer(await getRequestClient());

  // The recovery link establishes a session; without one there is nothing to
  // reset. The action re-checks this, so this is presentation, not a guard.
  if (viewer.status !== 'signed_in') {
    return (
      <section className="section shell form-page">
        <h1>Choose a new password</h1>
        <Notice tone="error" title="This page needs a valid recovery link.">
          <p style={{ marginBottom: 0 }}>
            Open the most recent link from your email, or{' '}
            <Link href={AUTH_ROUTES.forgotPassword}>request a new one</Link>.
          </p>
        </Notice>
      </section>
    );
  }

  return (
    <section className="section shell form-page">
      <h1>Choose a new password</h1>
      <PasswordForm />
    </section>
  );
}
