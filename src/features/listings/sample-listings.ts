/**
 * ⚠️ TEST-ONLY SAMPLE DATA — NOT A DATA SOURCE ⚠️
 *
 * The listings tables do not exist yet (A-08), so the discovery screens are
 * rendered from these fixtures to review layout and responsive behaviour. The
 * board calls this state **UI ready**, not integrated.
 *
 * Rules while this file exists:
 *
 * - Every screen that reads it must say on the page that the data is sample
 *   data. No visitor should ever mistake it for real inventory.
 * - It must never be imported by an action, a service, or a query as a
 *   fallback when a real read fails.
 * - A-12 replaces these reads with real queries and this file is deleted.
 *
 * The cars, sellers and descriptions here are invented for layout review and
 * follow the supplied design references.
 */
import type { PublicListing, PublicListingSummary } from '@/contracts';

/** Rendered as the page banner, so the warning cannot be silently dropped. */
export const SAMPLE_DATA_NOTICE =
  'Sample data. Real listings arrive with the listings milestone — nothing here is a car for sale.';

interface Sample extends PublicListingSummary {
  description: string;
  sellerName: string;
  sellerLocation: string;
  sellerMemberSince: string;
  publishedEmail: string | null;
  publishedPhone: string | null;
  /** Body colour for the placeholder silhouette; no photos exist yet. */
  colour: string;
  photoCount: number;
}

const CURRENCY = 'PHP';

export const SAMPLE_LISTINGS: readonly Sample[] = [
  {
    id: 'sample-fortuner',
    make: 'Toyota',
    model: 'Fortuner 2.4 G',
    year: 2021,
    priceMinor: 156_000_000,
    currency: CURRENCY,
    mileageKm: 42_800,
    transmission: 'automatic',
    fuel: 'diesel',
    condition: 'excellent',
    location: 'Cebu City, Cebu',
    coverPhoto: null,
    publishedAt: '2026-09-22T02:00:00.000Z',
    colour: '#e8e4dc',
    photoCount: 8,
    sellerName: 'Marco D.',
    sellerLocation: 'Cebu City, Cebu',
    sellerMemberSince: '2026-03-01T00:00:00.000Z',
    publishedEmail: null,
    publishedPhone: null,
    description:
      'Single owner, bought brand new in Cebu in 2021. Casa-maintained every 10,000 km with complete service records; last PMS at 40,000 km. Original paint on most panels — the rear bumper was repainted after a minor parking scrape. New tires in June 2026. Registration valid until March 2027. Viewing in Banilad, Cebu City on weekends.',
  },
  {
    id: 'sample-raize',
    make: 'Toyota',
    model: 'Raize 1.0 Turbo E',
    year: 2023,
    priceMinor: 86_800_000,
    currency: CURRENCY,
    mileageKm: 15_600,
    transmission: 'automatic',
    fuel: 'gasoline',
    condition: 'excellent',
    location: 'Cebu City, Cebu',
    coverPhoto: null,
    publishedAt: '2026-09-21T02:00:00.000Z',
    colour: '#2f4f7a',
    photoCount: 7,
    sellerName: 'Liza P.',
    sellerLocation: 'Cebu City, Cebu',
    sellerMemberSince: '2026-05-01T00:00:00.000Z',
    publishedEmail: 'liza.sample@example.test',
    publishedPhone: null,
    description:
      'Lightly used city car, still under warranty. Complete casa service history and two keys. Selling because we moved abroad.',
  },
  {
    id: 'sample-vios',
    make: 'Toyota',
    model: 'Vios 1.3 XLE CVT',
    year: 2021,
    priceMinor: 64_800_000,
    currency: CURRENCY,
    mileageKm: 38_500,
    transmission: 'automatic',
    fuel: 'gasoline',
    condition: 'good',
    location: 'Cebu City, Cebu',
    coverPhoto: null,
    publishedAt: '2026-09-21T01:00:00.000Z',
    colour: '#efece6',
    photoCount: 7,
    sellerName: 'Ana R.',
    sellerLocation: 'Cebu City, Cebu',
    sellerMemberSince: '2026-02-01T00:00:00.000Z',
    publishedEmail: null,
    publishedPhone: '+63 900 000 0000',
    description: 'Daily driver, well maintained. Minor scratches on the rear door, shown in the photos.',
  },
  {
    id: 'sample-city',
    make: 'Honda',
    model: 'City 1.5 RS',
    year: 2022,
    priceMinor: 89_500_000,
    currency: CURRENCY,
    mileageKm: 21_300,
    transmission: 'automatic',
    fuel: 'gasoline',
    condition: 'excellent',
    location: 'Mandaue City, Cebu',
    coverPhoto: null,
    publishedAt: '2026-09-21T00:00:00.000Z',
    colour: '#1d2027',
    photoCount: 9,
    sellerName: 'Ben S.',
    sellerLocation: 'Mandaue City, Cebu',
    sellerMemberSince: '2026-06-01T00:00:00.000Z',
    publishedEmail: null,
    publishedPhone: null,
    description: 'Fresh from PMS. Non-smoker, garage kept, no flood history.',
  },
  {
    id: 'sample-almera',
    make: 'Nissan',
    model: 'Almera 1.0 Turbo VL',
    year: 2022,
    priceMinor: 79_800_000,
    currency: CURRENCY,
    mileageKm: 22_000,
    transmission: 'automatic',
    fuel: 'gasoline',
    condition: 'good',
    location: 'Talisay City, Cebu',
    coverPhoto: null,
    publishedAt: '2026-09-20T02:00:00.000Z',
    colour: '#20242c',
    photoCount: 7,
    sellerName: 'Rico M.',
    sellerLocation: 'Talisay City, Cebu',
    sellerMemberSince: '2026-04-01T00:00:00.000Z',
    publishedEmail: null,
    publishedPhone: null,
    description: 'Turbo variant with all options. Selling to upgrade to a bigger vehicle for the family.',
  },
  {
    id: 'sample-montero',
    make: 'Mitsubishi',
    model: 'Montero Sport GLS 2.4',
    year: 2020,
    priceMinor: 138_500_000,
    currency: CURRENCY,
    mileageKm: 61_000,
    transmission: 'automatic',
    fuel: 'diesel',
    condition: 'good',
    location: 'Davao City, Davao del Sur',
    coverPhoto: null,
    publishedAt: '2026-09-20T01:00:00.000Z',
    colour: '#6b6f77',
    photoCount: 8,
    sellerName: 'Tess V.',
    sellerLocation: 'Davao City, Davao del Sur',
    sellerMemberSince: '2026-01-01T00:00:00.000Z',
    publishedEmail: null,
    publishedPhone: null,
    description: 'Highway miles, recently replaced battery and tires. Some interior wear on the driver seat.',
  },
  {
    id: 'sample-territory',
    make: 'Ford',
    model: 'Territory 1.5 Titanium',
    year: 2023,
    priceMinor: 124_800_000,
    currency: CURRENCY,
    mileageKm: 12_400,
    transmission: 'automatic',
    fuel: 'gasoline',
    condition: 'excellent',
    location: 'Lapu-Lapu City, Cebu',
    coverPhoto: null,
    publishedAt: '2026-09-19T02:00:00.000Z',
    colour: '#2f4f7a',
    photoCount: 10,
    sellerName: 'Jun A.',
    sellerLocation: 'Lapu-Lapu City, Cebu',
    sellerMemberSince: '2026-07-01T00:00:00.000Z',
    publishedEmail: null,
    publishedPhone: null,
    description: 'Almost new, low mileage. Still has the original plastic on some interior trim.',
  },
  {
    id: 'sample-mirage',
    make: 'Mitsubishi',
    model: 'Mirage G4 GLS 1.2',
    year: 2021,
    priceMinor: 57_800_000,
    currency: CURRENCY,
    mileageKm: 27_400,
    transmission: 'automatic',
    fuel: 'gasoline',
    condition: 'fair',
    location: 'Mandaue City, Cebu',
    coverPhoto: null,
    publishedAt: '2026-09-19T01:00:00.000Z',
    colour: '#c9ccd2',
    photoCount: 6,
    sellerName: 'Grace L.',
    sellerLocation: 'Mandaue City, Cebu',
    sellerMemberSince: '2026-08-01T00:00:00.000Z',
    publishedEmail: null,
    publishedPhone: null,
    description: 'Economical daily car. Aircon recently serviced. Small dent on the rear bumper, priced accordingly.',
  },
  {
    id: 'sample-ranger',
    make: 'Ford',
    model: 'Ranger 2.0 XLT',
    year: 2022,
    priceMinor: 131_800_000,
    currency: CURRENCY,
    mileageKm: 29_700,
    transmission: 'automatic',
    fuel: 'diesel',
    condition: 'needs_work',
    location: 'Talisay City, Cebu',
    coverPhoto: null,
    publishedAt: '2026-09-17T02:00:00.000Z',
    colour: '#8a6a45',
    photoCount: 9,
    sellerName: 'Paolo T.',
    sellerLocation: 'Talisay City, Cebu',
    sellerMemberSince: '2026-03-15T00:00:00.000Z',
    publishedEmail: null,
    publishedPhone: null,
    description:
      'Runs well but needs suspension work at the front and a repaint on the tailgate. Priced below market for that reason — inspection welcome.',
  },
];

export function findSampleListing(id: string): Sample | undefined {
  return SAMPLE_LISTINGS.find((listing) => listing.id === id);
}

/** Shapes a sample into the real detail DTO, so the screens read the contract. */
export function toPublicListing(sample: Sample): PublicListing {
  return {
    ...sample,
    description: sample.description,
    photos: [],
    viewerHasFavorited: false,
    seller: {
      userId: `sample-seller-${sample.id}`,
      displayName: sample.sellerName,
      location: sample.sellerLocation,
      publishedEmail: sample.publishedEmail,
      publishedPhone: sample.publishedPhone,
      memberSince: sample.sellerMemberSince,
    },
  };
}
