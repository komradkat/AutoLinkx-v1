/**
 * Listing card and its supporting pieces (B-02's card component, built
 * alongside the discovery screens).
 *
 * No photos exist yet (A-10), so the thumbnail is a drawn silhouette rather
 * than a stock image — it stays useful afterwards as the no-photo fallback.
 */
import Link from 'next/link';

import { CarPhoto } from './car-photo';
import type { CSSProperties } from 'react';

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

/**
 * Listing artwork: a real photo when there is one, otherwise a drawn car.
 *
 * The placeholder is deliberately not flat — a tinted body, glass, a soft
 * ground shadow — and it draws on a transparent background so the surface
 * behind it can tint per car. It stays useful after A-10 as the no-photo state.
 */
export function CarThumb({
  colour,
  label,
  imageUrl,
}: {
  colour: string;
  label: string;
  imageUrl?: string | null;
}) {
  if (imageUrl) {
    return <CarPhoto src={imageUrl} alt={label} fallback={<CarDrawing colour={colour} label={label} />} />;
  }
  return <CarDrawing colour={colour} label={label} />;
}

/** The drawn car: placeholder artwork and the no-photo fallback. */
function CarDrawing({ colour, label }: { colour: string; label: string }) {
  // Same colour, same gradient — sharing an id between cards is harmless.
  const uid = `car-${colour.replace(/[^a-z0-9]/gi, '')}`;

  return (
    <svg className="car-thumb" viewBox="0 0 400 190" role="img" aria-label={label}>
      <defs>
        <linearGradient id={`${uid}-body`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={colour} stopOpacity="1" />
          <stop offset="62%" stopColor={colour} stopOpacity="0.94" />
          <stop offset="100%" stopColor={colour} stopOpacity="0.74" />
        </linearGradient>
        <linearGradient id={`${uid}-glass`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3b4657" />
          <stop offset="100%" stopColor="#222a36" />
        </linearGradient>
        <radialGradient id={`${uid}-shadow`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#14161c" stopOpacity="0.3" />
          <stop offset="70%" stopColor="#14161c" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#14161c" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Grounding shadow, so the car sits on a surface rather than floating. */}
      <ellipse cx="200" cy="152" rx="165" ry="20" fill={`url(#${uid}-shadow)`} />

      <path
        d="M44 128 L49 92 Q54 74 78 71 L146 66 Q172 44 216 44 L262 44 Q292 49 310 71 L342 79 Q358 84 358 102 L358 128 Q358 134 351 134 L51 134 Q44 134 44 128 Z"
        fill={`url(#${uid}-body)`}
      />
      {/* Shoulder highlight */}
      <path
        d="M52 96 Q60 80 80 77 L146 72 Q172 50 216 50 L260 50 Q288 55 304 76"
        fill="none"
        stroke="#ffffff"
        strokeOpacity="0.3"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path d="M156 70 L176 52 Q194 49 210 49 L210 69 Z" fill={`url(#${uid}-glass)`} />
      <path d="M220 49 L258 50 Q282 55 296 73 L220 69 Z" fill={`url(#${uid}-glass)`} />
      {/* Door line and handle */}
      <path d="M214 72 L214 130" stroke="#14161c" strokeOpacity="0.16" strokeWidth="2" />
      <rect x="226" y="92" width="16" height="4" rx="2" fill="#14161c" fillOpacity="0.22" />
      {/* Lights */}
      <rect x="44" y="96" width="10" height="12" rx="4" fill="#ffd9a0" fillOpacity="0.9" />
      <rect x="348" y="96" width="10" height="12" rx="4" fill="#d7263d" fillOpacity="0.75" />

      <g>
        <circle cx="120" cy="132" r="27" fill="#191d24" />
        <circle cx="120" cy="132" r="12" fill="#b9bec7" />
        <circle cx="120" cy="132" r="5" fill="#7d838d" />
      </g>
      <g>
        <circle cx="290" cy="132" r="27" fill="#191d24" />
        <circle cx="290" cy="132" r="12" fill="#b9bec7" />
        <circle cx="290" cy="132" r="5" fill="#7d838d" />
      </g>
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
  publishedAt: string;
  colour: string;
  photoCount: number;
}

/** "Fortuner 2.4 G" → base "Fortuner", variant "2.4 G", as the design styles them. */
function splitModel(model: string): { base: string; variant: string } {
  const [base = model, ...rest] = model.split(' ');
  return { base, variant: rest.join(' ') };
}

function listedOn(iso: string): string {
  return new Date(iso).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
}

/* Small inline icons; strokes inherit the text colour. */
function Icon({ name }: { name: 'photo' | 'gauge' | 'gear' | 'fuel' | 'pin' | 'heart' }) {
  const paths: Record<typeof name, string> = {
    photo: 'M3 7h3l2-2h8l2 2h3v12H3z M12 10a3.5 3.5 0 1 0 0 7a3.5 3.5 0 0 0 0-7',
    gauge: 'M4 17a8 8 0 1 1 16 0 M12 17l4-5',
    gear: 'M6 5v14 M12 5v14 M18 5v7 M6 12h12',
    fuel: 'M5 20V5h9v15 M5 11h9 M14 8h3l2 3v7a1.5 1.5 0 0 1-3 0v-4h-2',
    pin: 'M12 21s-6-5.6-6-11a6 6 0 0 1 12 0c0 5.4-6 11-6 11z M12 8a2 2 0 1 0 0 4a2 2 0 0 0 0-4',
    heart: 'M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z',
  };
  return (
    <svg className="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d={paths[name]} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ListingCard({ listing }: { listing: CardListing }) {
  const { base, variant } = splitModel(listing.model);
  const title = `${listing.year} ${listing.make} ${listing.model}`;

  return (
    <article className="listing-card">
      <div className="listing-card__media" style={{ '--tint': listing.colour } as CSSProperties}>
        <CarThumb colour={listing.colour} label={`Image for ${title}`} imageUrl={`/assets/cars/${listing.id}.jpg`} />
        {/*
          Visual only while the page runs on sample data: saving arrives with
          the interactions milestone, so this is not a button yet.
        */}
        <span className="listing-card__save" aria-hidden="true">
          <Icon name="heart" />
        </span>
        <span className="listing-card__photos">
          <Icon name="photo" />
          <span>
            {listing.photoCount}
            <span className="visually-hidden"> photos</span>
          </span>
        </span>
      </div>

      <div className="listing-card__body">
        <h3 className="listing-card__title">
          <Link href={`/cars/${listing.id}`} className="listing-card__link">
            {listing.year} {listing.make} {base}
            {variant && <span className="listing-card__variant"> {variant}</span>}
          </Link>
        </h3>

        <p className="listing-card__price">{formatPrice(listing.priceMinor, listing.currency)}</p>

        <ul className="listing-card__specs">
          <li>
            <Icon name="gauge" />
            {formatMileage(listing.mileageKm)}
          </li>
          <li>
            <Icon name="gear" />
            {labels.transmission(listing.transmission)}
          </li>
          <li className="listing-card__fuel">
            <Icon name="fuel" />
            {labels.fuel(listing.fuel)}
          </li>
        </ul>

        <div className="listing-card__footer">
          <span className="listing-card__location">
            <Icon name="pin" />
            {listing.location.split(',')[0]}
          </span>
          <span className="listing-card__listed">Listed {listedOn(listing.publishedAt)}</span>
        </div>
      </div>
    </article>
  );
}
