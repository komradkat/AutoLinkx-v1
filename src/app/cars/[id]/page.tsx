/**
 * Car details, following `Ui design/web/03-Car-details.png`.
 *
 * **Rendered from test-only sample data** until A-08 and A-12 land. The
 * inquiry, save and report controls are shown as the design specifies but
 * explain that they are not connected yet — no control here pretends to work.
 */
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { AUTH_ROUTES } from '@/contracts';
import {
  CarThumb,
  formatMileage,
  formatPrice,
  labels,
} from '@/features/listings/components/listing-card';
import {
  SAMPLE_DATA_NOTICE,
  findSampleListing,
  toPublicListing,
} from '@/features/listings/sample-listings';
import { getViewer } from '@/server/auth/viewer';
import { getRequestClient } from '@/server/supabase/next';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const sample = findSampleListing((await params).id);
  if (!sample) return { title: 'Car not found — AutoLinkX' };
  return { title: `${sample.year} ${sample.make} ${sample.model} — AutoLinkX` };
}

export default async function CarDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const sample = findSampleListing((await params).id);
  if (!sample) notFound();

  const listing = toPublicListing(sample);
  const viewer = await getViewer(await getRequestClient());
  const title = `${listing.year} ${listing.make} ${listing.model}`;
  const publishedOn = new Date(listing.publishedAt).toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  const memberSince = new Date(listing.seller.memberSince).toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'short',
  });

  return (
    <>
      <div className="shell" style={{ paddingTop: 'var(--space-5)' }}>
        <nav aria-label="Breadcrumb" className="breadcrumb">
          <Link href="/cars">Cars for sale</Link> <span aria-hidden="true">›</span> {listing.make}{' '}
          <span aria-hidden="true">›</span> {title}
        </nav>
        <div className="notice notice--info" role="status">
          <p className="notice__title">Sample listing</p>
          <p style={{ marginBottom: 0 }}>{SAMPLE_DATA_NOTICE}</p>
        </div>
      </div>

      <section className="section shell">
        <div className="details">
          <div>
            <figure className="gallery">
              <CarThumb colour={sample.colour} label={`Placeholder image for ${title}`} />
              <figcaption className="gallery__caption">
                Photos arrive with the upload milestone. This listing would carry{' '}
                {sample.photoCount}.
              </figcaption>
            </figure>

            <div className="card" style={{ marginTop: 'var(--space-5)' }}>
              <h2>Specifications</h2>
              <dl className="spec-grid">
                <div>
                  <dt>Make</dt>
                  <dd>{listing.make}</dd>
                </div>
                <div>
                  <dt>Model</dt>
                  <dd>{listing.model}</dd>
                </div>
                <div>
                  <dt>Year</dt>
                  <dd>{listing.year}</dd>
                </div>
                <div>
                  <dt>Mileage</dt>
                  <dd>{formatMileage(listing.mileageKm)}</dd>
                </div>
                <div>
                  <dt>Transmission</dt>
                  <dd>{labels.transmission(listing.transmission)}</dd>
                </div>
                <div>
                  <dt>Fuel type</dt>
                  <dd>{labels.fuel(listing.fuel)}</dd>
                </div>
                <div>
                  <dt>Condition</dt>
                  <dd>{labels.condition(listing.condition)}</dd>
                </div>
                <div>
                  <dt>Location</dt>
                  <dd>{listing.location}</dd>
                </div>
              </dl>
            </div>

            <div className="card" style={{ marginTop: 'var(--space-5)' }}>
              <h2>Description from the seller</h2>
              <p style={{ marginBottom: 0 }}>{listing.description}</p>
            </div>
          </div>

          <aside className="details__rail">
            <div className="card">
              <p className="details__badges">
                <span className="badge">{labels.condition(listing.condition)} condition</span>
              </p>
              <h1 className="details__title">{title}</h1>
              <p className="details__price">{formatPrice(listing.priceMinor, listing.currency)}</p>
              <ul className="listing-card__specs">
                <li>{formatMileage(listing.mileageKm)}</li>
                <li>{labels.transmission(listing.transmission)}</li>
                <li>{labels.fuel(listing.fuel)}</li>
              </ul>
              <p className="listing-card__location">{listing.location}</p>
              <p className="field__hint">Published {publishedOn}</p>

              {viewer.status === 'signed_in' ? (
                <p className="field__hint" style={{ marginBottom: 0 }}>
                  Sending an inquiry arrives with the interactions milestone. Your account
                  email is never shared with the seller.
                </p>
              ) : (
                <p style={{ marginBottom: 0 }}>
                  <Link className="button button--primary" href={`${AUTH_ROUTES.login}?next=/cars`}>
                    Sign in to contact sellers
                  </Link>
                </p>
              )}
            </div>

            <div className="card" style={{ marginTop: 'var(--space-4)' }}>
              <p className="eyebrow">Seller</p>
              <div className="seller">
                <span className="avatar" aria-hidden="true">
                  {listing.seller.displayName.slice(0, 2).toUpperCase()}
                </span>
                <div>
                  <p style={{ fontWeight: 700, marginBottom: 0 }}>{listing.seller.displayName}</p>
                  <p className="field__hint" style={{ marginBottom: 0 }}>
                    Individual seller · {listing.seller.location} · Member since {memberSince}
                  </p>
                </div>
              </div>

              {listing.seller.publishedEmail || listing.seller.publishedPhone ? (
                <p className="field__hint" style={{ marginTop: 'var(--space-3)', marginBottom: 0 }}>
                  Published contact: {listing.seller.publishedEmail ?? listing.seller.publishedPhone}
                </p>
              ) : (
                <p className="field__hint" style={{ marginTop: 'var(--space-3)', marginBottom: 0 }}>
                  This seller keeps contact details private. Send an inquiry and include how
                  you would like them to reply.
                </p>
              )}
            </div>

            <div className="notice notice--info" style={{ marginTop: 'var(--space-4)' }}>
              <p style={{ marginBottom: 0 }}>
                AutoLinkX does not inspect cars or handle payments. See the car in person and
                check documents before paying.
              </p>
            </div>
          </aside>
        </div>
      </section>

      {/* Mobile only: price and the primary action stay reachable. */}
      <div className="details__sticky">
        <p className="details__sticky-price">
          {formatPrice(listing.priceMinor, listing.currency)}
          <span className="details__sticky-note">Seller replies outside AutoLinkX</span>
        </p>
        {viewer.status === 'signed_in' ? (
          <span className="field__hint" style={{ textAlign: 'right', marginBottom: 0 }}>
            Inquiries arrive with the interactions milestone
          </span>
        ) : (
          <Link className="button button--primary" href={`${AUTH_ROUTES.login}?next=/cars`}>
            Sign in to inquire
          </Link>
        )}
      </div>
    </>
  );
}
