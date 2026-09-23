/**
 * Feed / List switch, from the mobile design's top segmented control.
 *
 * Two ways through the same inventory: the full-screen feed, where a swipe
 * right saves a car, and the filterable list. Hidden on wide screens, where the list is the only
 * discovery surface in the web design.
 */
import Link from 'next/link';

const TABS = [
  { href: '/feed', label: 'Feed' },
  { href: '/cars', label: 'List' },
] as const;

export function DiscoveryTabs({ current }: { current: '/feed' | '/cars' }) {
  return (
    <div className="discover__row">
      {/* On mobile the site header is hidden, so the brand lives here. */}
      <Link className="brand discover__brand" href="/">
        <span className="brand__mark" aria-hidden="true">
          ▲
        </span>
        AutoLink<span className="brand__mark">X</span>
      </Link>
      <nav className="segmented" aria-label="Browsing mode">
      {TABS.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={tab.href === current ? 'segmented__item is-current' : 'segmented__item'}
          aria-current={tab.href === current ? 'page' : undefined}
        >
          {tab.label}
        </Link>
      ))}
      </nav>
    </div>
  );
}
