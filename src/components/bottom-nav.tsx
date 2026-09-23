/**
 * Mobile tab bar, from `Ui design/mobile/00-Mobile-overview.png`.
 *
 * Dark bar, line icons, the current tab highlighted, and Sell as the orange
 * centre action. Hidden from 960px up, where the header takes over.
 *
 * Identity is read on the server and passed down; the client part only knows
 * the current path. Saved and Sell reach the not-built-yet screen until their
 * milestones land.
 */
import type { Viewer } from '@/contracts';
import { AUTH_ROUTES } from '@/contracts';

import { BottomNavLinks } from './bottom-nav-links';

function initialsOf(name: string): string {
  const letters = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] ?? '')
    .join('');
  return letters.toUpperCase() || 'A';
}

export function BottomNav({ viewer }: { viewer: Viewer }) {
  const signedIn = viewer.status === 'signed_in';

  return (
    <nav className="bottom-nav" aria-label="Main">
      <BottomNavLinks
        accountHref={signedIn ? '/profile' : AUTH_ROUTES.login}
        initials={signedIn ? initialsOf(viewer.displayName) : null}
      />
    </nav>
  );
}
