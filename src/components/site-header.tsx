/**
 * Site header, following `Ui design/web/01-Home.png` (signed out) and
 * `07-Saved-cars.png` (signed in).
 *
 * The account area is the one part of the design backed by working code: it
 * renders the verified `Viewer` from A-04. Counters on Saved and Inquiries are
 * omitted until the interaction tables exist (A-15, A-16).
 *
 * Developer B owns presentation (B-02); replace freely, but keep the viewer
 * prop rather than reading identity in a client component.
 */
import Link from 'next/link';

import type { Viewer } from '@/contracts';
import { AUTH_ROUTES } from '@/contracts';

function initials(displayName: string): string {
  const parts = displayName.trim().split(/\s+/).slice(0, 2);
  const letters = parts.map((part) => part[0] ?? '').join('');
  return letters.toUpperCase() || 'A';
}

function AccountArea({ viewer }: { viewer: Viewer }) {
  if (viewer.status !== 'signed_in') {
    return (
      <nav className="account-nav" aria-label="Account">
        <Link className="account-nav__link" href="/saved">
          Saved
        </Link>
        <Link className="account-nav__link" href={AUTH_ROUTES.login}>
          Sign in
        </Link>
        <Link className="button button--primary" href={AUTH_ROUTES.register}>
          Create account
        </Link>
      </nav>
    );
  }

  return (
    <nav className="account-nav" aria-label="Account">
      <Link className="account-nav__link" href="/saved">
        Saved
      </Link>
      <Link className="account-nav__link" href="/dashboard">
        My listings
      </Link>
      <Link className="account-nav__link" href="/dashboard/inquiries">
        Inquiries
      </Link>
      <span className="account-nav__identity">
        <span className="avatar" aria-hidden="true">
          {initials(viewer.displayName)}
        </span>
        <span>
          {viewer.displayName}
          {!viewer.emailConfirmed && (
            <span className="account-nav__state"> · email not confirmed</span>
          )}
        </span>
      </span>
    </nav>
  );
}

export function SiteHeader({ viewer }: { viewer: Viewer }) {
  return (
    <header className="site-header">
      <div className="shell site-header__inner">
        <Link className="brand" href="/">
          <span className="brand__mark" aria-hidden="true">
            ▲
          </span>
          AutoLink<span className="brand__mark">X</span>
        </Link>

        <nav className="site-nav" aria-label="Marketplace">
          <Link className="site-nav__link" href="/cars">
            Browse cars
          </Link>
          <Link className="site-nav__link" href="/dashboard/listings/new">
            Sell your car
          </Link>
        </nav>

        <AccountArea viewer={viewer} />
      </div>
    </header>
  );
}
