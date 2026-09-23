'use client';

/**
 * Tab bar items, from `Ui design/mobile/00-Mobile-overview.png`.
 *
 * A client component only because it needs the current path to mark the
 * active tab; identity still comes from the server as props.
 */
import Link from 'next/link';
import { usePathname } from 'next/navigation';

type IconName = 'discover' | 'search' | 'saved' | 'account' | 'sell';

function TabIcon({ name }: { name: IconName }) {
  const paths: Record<IconName, string> = {
    discover: 'M12 3a9 9 0 1 0 0 18a9 9 0 0 0 0-18z M15.5 8.5l-2 5-5 2 2-5z',
    search: 'M10.5 4a6.5 6.5 0 1 0 0 13a6.5 6.5 0 0 0 0-13z M15.5 15.5L20 20',
    saved: 'M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z',
    account: 'M12 12a4 4 0 1 0 0-8a4 4 0 0 0 0 8z M4.5 20a7.5 7.5 0 0 1 15 0',
    sell: 'M12 5v14 M5 12h14',
  };
  return (
    <svg className="tab-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d={paths[name]}
        fill="none"
        stroke="currentColor"
        strokeWidth={name === 'sell' ? 2.4 : 1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const ACCOUNT_PATHS = ['/profile', '/login', '/register', '/forgot-password', '/reset-password'];

function isActive(pathname: string, tab: IconName): boolean {
  switch (tab) {
    case 'discover':
      return pathname === '/' || pathname.startsWith('/feed');
    case 'search':
      return pathname.startsWith('/cars');
    case 'sell':
      return pathname.startsWith('/dashboard/listings/new');
    case 'saved':
      return pathname.startsWith('/saved');
    case 'account':
      return ACCOUNT_PATHS.some((path) => pathname.startsWith(path));
  }
}

export function BottomNavLinks({
  accountHref,
  initials,
}: {
  accountHref: string;
  /** Present when signed in: the avatar replaces the generic account icon. */
  initials: string | null;
}) {
  const pathname = usePathname() ?? '/';

  const tabs: { name: IconName; href: string; label: string }[] = [
    { name: 'discover', href: '/feed', label: 'Discover' },
    { name: 'search', href: '/cars', label: 'Search' },
    { name: 'sell', href: '/dashboard/listings/new', label: 'Sell' },
    { name: 'saved', href: '/saved', label: 'Saved' },
    { name: 'account', href: accountHref, label: 'Account' },
  ];

  return (
    <>
      {tabs.map((tab) => {
        const active = isActive(pathname, tab.name);
        const className = [
          'tab',
          tab.name === 'sell' ? 'tab--sell' : '',
          active ? 'is-active' : '',
        ]
          .filter(Boolean)
          .join(' ');

        return (
          <Link
            key={tab.name}
            className={className}
            href={tab.href}
            aria-current={active ? 'page' : undefined}
          >
            {tab.name === 'sell' ? (
              <span className="tab__sell">
                <TabIcon name="sell" />
              </span>
            ) : tab.name === 'account' && initials ? (
              <span className="tab__avatar" aria-hidden="true">
                {initials}
              </span>
            ) : (
              <TabIcon name={tab.name} />
            )}
            <span className="tab__label">{tab.label}</span>
          </Link>
        );
      })}
    </>
  );
}
