import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Notice } from '@/components/form-controls';
import { AUTH_ROUTES } from '@/contracts';
import { logoutAction } from '@/features/accounts/actions';
import { ProfileForm } from '@/features/accounts/components/account-forms';
import { getOwnProfile } from '@/features/accounts/service';
import { getRequestClient } from '@/server/supabase/next';

export const metadata: Metadata = { title: 'Your profile — AutoLinkX' };

export default async function ProfilePage() {
  const client = await getRequestClient();
  const result = await getOwnProfile(client);

  if (!result.ok) {
    if (result.error.code === 'unauthenticated') {
      redirect(`${AUTH_ROUTES.login}?next=/profile`);
    }

    return (
      <section className="section shell form-page">
        <h1>Your profile</h1>
        <Notice tone="error" title={result.error.message}>
          <p style={{ marginBottom: 0 }}>
            <Link href="/">Back to the homepage</Link>
          </p>
        </Notice>
      </section>
    );
  }

  return (
    <section className="section shell form-page">
      <h1>Your profile</h1>
      <p style={{ color: 'var(--text-muted)' }}>
        Control what other people see. Nothing here is published unless you say so.
      </p>
      <ProfileForm profile={result.data} />

      {/* The header holds sign out on desktop; on mobile it is hidden. */}
      <form action={logoutAction} className="profile__signout">
        <button className="button button--outline" type="submit">
          Sign out
        </button>
      </form>
    </section>
  );
}
