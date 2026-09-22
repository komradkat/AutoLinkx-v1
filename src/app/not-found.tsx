/**
 * Not-found state (part of B-04).
 *
 * The header and footer link to every planned route. Until each screen is
 * built, this page says so plainly instead of pretending the feature exists
 * or showing a bare 404. It keeps the shell navigable without fake screens.
 */
import Link from 'next/link';

export default function NotFound() {
  return (
    <section className="section shell">
      <div className="card">
        <p className="eyebrow">Not found</p>
        <h1 style={{ fontSize: 'clamp(1.6rem, 1.2rem + 1.6vw, 2.4rem)' }}>
          This screen is not built yet.
        </h1>
        <p style={{ color: 'var(--text-muted)' }}>
          The navigation reflects the full marketplace from the design references, but only
          the foundation is implemented so far. Browsing, saved cars, account screens and
          the seller dashboard arrive with their milestones.
        </p>
        <p style={{ marginBottom: 0 }}>
          <Link className="button button--primary" href="/">
            Back to the homepage
          </Link>
        </p>
      </div>
    </section>
  );
}
