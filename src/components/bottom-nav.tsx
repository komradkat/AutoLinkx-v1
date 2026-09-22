/**
 * Mobile bottom tab bar, from `Ui design/mobile/00-Mobile-overview.png`.
 *
 * Hidden from 960px up, where the header navigation takes over. Sell is the
 * raised centre action, as in the design.
 *
 * Only Discover, Search and Account lead anywhere today; the rest reach the
 * not-built-yet screen until their milestones land.
 */
import Link from 'next/link';

import type { Viewer } from '@/contracts';
import { AUTH_ROUTES } from '@/contracts';

export function BottomNav({ viewer }: { viewer: Viewer }) {
  const accountHref = viewer.status === 'signed_in' ? '/profile' : AUTH_ROUTES.login;

  return (
    <nav className="bottom-nav" aria-label="Main">
      <Link className="bottom-nav__item" href="/">
        <span className="bottom-nav__icon" aria-hidden="true">
          ◎
        </span>
        Discover
      </Link>
      <Link className="bottom-nav__item" href="/cars">
        <span className="bottom-nav__icon" aria-hidden="true">
          ⌕
        </span>
        Search
      </Link>
      <Link className="bottom-nav__item bottom-nav__item--sell" href="/dashboard/listings/new">
        <span className="bottom-nav__sell" aria-hidden="true">
          +
        </span>
        <span className="bottom-nav__sell-label">Sell</span>
      </Link>
      <Link className="bottom-nav__item" href="/saved">
        <span className="bottom-nav__icon" aria-hidden="true">
          ♡
        </span>
        Saved
      </Link>
      <Link className="bottom-nav__item" href={accountHref}>
        <span className="bottom-nav__icon" aria-hidden="true">
          ☺
        </span>
        Account
      </Link>
    </nav>
  );
}
