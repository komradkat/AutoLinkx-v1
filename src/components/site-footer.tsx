/**
 * Site footer, following the supplied design references. Static links only;
 * every destination is a real planned route from README.md.
 */
import Link from 'next/link';

import { AUTH_ROUTES } from '@/contracts';

const COLUMNS = [
  {
    heading: 'Marketplace',
    links: [
      { href: '/cars', label: 'Browse cars' },
      { href: '/dashboard/listings/new', label: 'Sell your car' },
      { href: '/saved', label: 'Saved cars' },
    ],
  },
  {
    heading: 'Account',
    links: [
      { href: AUTH_ROUTES.login, label: 'Sign in' },
      { href: AUTH_ROUTES.register, label: 'Create account' },
      { href: '/profile', label: 'Profile' },
    ],
  },
] as const;

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="shell">
        <div className="site-footer__grid">
          <div>
            <p className="brand" aria-hidden="true">
              <span className="brand__mark">▲</span>
              AutoLink<span className="brand__mark">X</span>
            </p>
            <p className="site-footer__about">
              A marketplace for individual sellers and buyers. Negotiation, inspection,
              payment and transfer are arranged directly between buyer and seller.
            </p>
          </div>

          {COLUMNS.map((column) => (
            <nav key={column.heading} aria-label={column.heading}>
              <h2 className="site-footer__heading">{column.heading}</h2>
              <ul className="site-footer__list">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href}>{link.label}</Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <p className="site-footer__legal">© 2026 AutoLinkX &amp; Co.</p>
      </div>
    </footer>
  );
}
