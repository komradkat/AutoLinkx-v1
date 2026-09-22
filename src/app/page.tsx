/**
 * Homepage shell, following `Ui design/web/01-Home.png`.
 *
 * Built: the hero, the sell-your-car panel, and the three-step explainer —
 * everything in the design that is static copy. Deliberately absent: the
 * search form, the live listing count and the "Latest cars" grid, because no
 * listing table exists yet (A-08, A-12). Nothing here shows invented cars.
 */
import Link from 'next/link';

import { getViewer } from '@/server/auth/viewer';
import { getRequestClient } from '@/server/supabase/next';

const STEPS = [
  {
    title: 'List your car',
    body: 'Add details and at least one photo. Save a draft any time.',
  },
  {
    title: 'We review it',
    body: 'An administrator checks the listing before it becomes public.',
  },
  {
    title: 'Buyers send inquiries',
    body: 'Read them in your dashboard. Arrange replies, viewing and payment directly with the buyer.',
  },
];

const FOUNDATION = [
  { state: 'ready', label: 'Accounts', body: 'Sessions are verified and refreshed on every request.' },
  { state: 'pending', label: 'Profiles', body: 'Display name, location and contact preferences (A-05).' },
  { state: 'pending', label: 'Listings', body: 'Drafts, review, photos and the seller dashboard (A-08 to A-11).' },
  { state: 'pending', label: 'Discovery', body: 'Search, filters and car details (A-12, A-13).' },
] as const;

export default async function HomePage() {
  const viewer = await getViewer(await getRequestClient());

  return (
    <>
      <section className="hero">
        <div className="shell hero__grid">
          <div>
            <h1>Find a car from the person who drives it.</h1>
            <p className="hero__lede">
              Cars listed by individual sellers. Every listing is reviewed before it goes
              live, and you arrange everything else directly with the seller.
            </p>
          </div>

          <div className="panel">
            <p className="panel__title">Selling a car?</p>
            <p className="panel__note">Create a listing and submit it for review.</p>
            <p style={{ marginBottom: 0, marginTop: 'var(--space-4)' }}>
              <Link className="button button--primary" href="/dashboard/listings/new">
                Sell your car →
              </Link>
            </p>
          </div>
        </div>
      </section>

      <section className="section shell">
        <h2>How AutoLinkX works</h2>
        <p style={{ color: 'var(--text-muted)' }}>
          No payments, financing or delivery on the platform.
        </p>
        <ol className="status-list" style={{ marginTop: 'var(--space-5)' }}>
          {STEPS.map((step, index) => (
            <li className="status-list__item" key={step.title}>
              <span className="badge" aria-hidden="true">
                {index + 1}
              </span>
              <span>
                <strong>{step.title}</strong>
                <br />
                {step.body}
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section className="section shell">
        <div className="card">
          <p className="eyebrow">Build status</p>
          <h2>What works today</h2>
          <p style={{ color: 'var(--text-muted)' }}>
            {viewer.status === 'signed_in'
              ? `You are signed in as ${viewer.displayName}. The header above reads that from a verified session, not from a cookie claim.`
              : 'You are browsing as a visitor. Sign-in screens arrive with the account milestone.'}
          </p>
          <ul className="status-list">
            {FOUNDATION.map((item) => (
              <li className="status-list__item" key={item.label}>
                <span
                  className={`badge badge--${item.state}`}
                >
                  {item.state === 'ready' ? 'Ready' : 'Planned'}
                </span>
                <span>
                  <strong>{item.label}</strong> — {item.body}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
