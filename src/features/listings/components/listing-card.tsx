/**
 * Listing card and its supporting pieces (B-02's card component, built
 * alongside the discovery screens).
 *
 * No photos exist yet (A-10), so the thumbnail is a drawn silhouette rather
 * than a stock image — it stays useful afterwards as the no-photo fallback.
 */
import Link from 'next/link';

import type { FuelType, Transmission, VehicleCondition } from '@/contracts';

export function formatPrice(priceMinor: number, currency: string): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(priceMinor / 100);
}

export function formatMileage(km: number): string {
  return `${new Intl.NumberFormat('en-PH').format(km)} km`;
}

const CONDITION_LABELS: Record<VehicleCondition, string> = {
  excellent: 'Excellent',
  good: 'Good',
  fair: 'Fair',
  needs_work: 'Needs work',
};

const FUEL_LABELS: Record<FuelType, string> = {
  gasoline: 'Gasoline',
  diesel: 'Diesel',
  hybrid: 'Hybrid',
  electric: 'Electric',
};

const TRANSMISSION_LABELS: Record<Transmission, string> = {
  automatic: 'Automatic',
  manual: 'Manual',
};

export const labels = {
  condition: (value: VehicleCondition) => CONDITION_LABELS[value],
  fuel: (value: FuelType) => FUEL_LABELS[value],
  transmission: (value: Transmission) => TRANSMISSION_LABELS[value],
};

/** Placeholder artwork; also the fallback when a listing has no photo. */
export function CarThumb({ colour, label }: { colour: string; label: string }) {
  return (
    <svg className="car-thumb" viewBox="0 0 320 150" role="img" aria-label={label}>
      <rect width="320" height="150" fill="#e7e3da" />
      <ellipse cx="160" cy="118" rx="120" ry="10" fill="#d6d1c6" />
      <path
        d="M40 104 L44 76 Q48 62 66 60 L118 56 Q140 40 176 40 L214 40 Q238 44 252 62 L276 68 Q288 72 288 86 L288 104 Z"
        fill={colour}
        stroke="#1d2027"
        strokeOpacity="0.12"
      />
      <path d="M126 58 L142 46 Q156 44 172 44 L172 58 Z" fill="#2b3340" opacity="0.85" />
      <path d="M180 44 L212 44 Q232 48 242 60 L180 58 Z" fill="#2b3340" opacity="0.85" />
      <circle cx="98" cy="104" r="22" fill="#20242c" />
      <circle cx="98" cy="104" r="9" fill="#9aa0aa" />
      <circle cx="232" cy="104" r="22" fill="#20242c" />
      <circle cx="232" cy="104" r="9" fill="#9aa0aa" />
    </svg>
  );
}

export interface CardListing {
  id: string;
  make: string;
  model: string;
  year: number;
  priceMinor: number;
  currency: string;
  mileageKm: number;
  transmission: Transmission;
  fuel: FuelType;
  location: string;
  colour: string;
  photoCount: number;
}

export function ListingCard({ listing }: { listing: CardListing }) {
  const title = `${listing.year} ${listing.make} ${listing.model}`;

  return (
    <article className="listing-card">
      <div className="listing-card__media">
        <CarThumb colour={listing.colour} label={`Placeholder image for ${title}`} />
        <span className="listing-card__photos">{listing.photoCount} photos</span>
      </div>
      <div className="listing-card__body">
        <h3 className="listing-card__title">
          <Link href={`/cars/${listing.id}`}>{title}</Link>
        </h3>
        <p className="listing-card__price">{formatPrice(listing.priceMinor, listing.currency)}</p>
        <ul className="listing-card__specs">
          <li>{formatMileage(listing.mileageKm)}</li>
          <li>{labels.transmission(listing.transmission)}</li>
          <li>{labels.fuel(listing.fuel)}</li>
        </ul>
        <p className="listing-card__location">{listing.location}</p>
      </div>
    </article>
  );
}
