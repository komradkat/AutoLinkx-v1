/**
 * Cars for sale, following `Ui design/web/02-Search-results.png`.
 *
 * **Rendered from test-only sample data.** The listings tables do not exist
 * yet (A-08) and neither do the public queries (A-12, A-13), so the filters
 * narrow the fixtures in memory. The URL keys, sort values and page size are
 * the real ones from the contract, so wiring this to live queries later is a
 * swap of the data source, not a rewrite.
 */
import type { Metadata } from 'next';
import Link from 'next/link';

import {
  DEFAULT_LISTING_SORT,
  FUEL_TYPES,
  LISTING_SORTS,
  PAGE_SIZE,
  SEARCH_PARAM_KEYS,
  TRANSMISSIONS,
  VEHICLE_CONDITIONS,
  type ListingSort,
} from '@/contracts';
import { FilterDrawer } from '@/features/listings/components/filter-drawer';
import { ListingCard, labels } from '@/features/listings/components/listing-card';
import { SAMPLE_DATA_NOTICE, SAMPLE_LISTINGS } from '@/features/listings/sample-listings';

export const metadata: Metadata = { title: 'Cars for sale — AutoLinkX' };

type Params = Record<string, string | string[] | undefined>;

function one(params: Params, key: string): string {
  const value = params[key];
  return typeof value === 'string' ? value : '';
}

function number(params: Params, key: string): number | null {
  const raw = one(params, key);
  if (raw === '') return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

export default async function CarsPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;

  const keyword = one(params, SEARCH_PARAM_KEYS.keyword).trim().toLowerCase();
  const transmission = one(params, SEARCH_PARAM_KEYS.transmission);
  const fuel = one(params, SEARCH_PARAM_KEYS.fuel);
  const condition = one(params, SEARCH_PARAM_KEYS.condition);
  const priceMax = number(params, SEARCH_PARAM_KEYS.priceMinorMax);
  const yearMin = number(params, SEARCH_PARAM_KEYS.yearMin);
  const sortParam = one(params, SEARCH_PARAM_KEYS.sort);
  const sort: ListingSort = (LISTING_SORTS as readonly string[]).includes(sortParam)
    ? (sortParam as ListingSort)
    : DEFAULT_LISTING_SORT;

  const matches = SAMPLE_LISTINGS.filter((listing) => {
    const haystack = `${listing.make} ${listing.model} ${listing.location}`.toLowerCase();
    if (keyword && !haystack.includes(keyword)) return false;
    if (transmission && listing.transmission !== transmission) return false;
    if (fuel && listing.fuel !== fuel) return false;
    if (condition && listing.condition !== condition) return false;
    if (priceMax !== null && listing.priceMinor > priceMax * 100) return false;
    if (yearMin !== null && listing.year < yearMin) return false;
    return true;
  });

  const sorted = [...matches].sort((a, b) => {
    switch (sort) {
      case 'price_asc':
        return a.priceMinor - b.priceMinor;
      case 'price_desc':
        return b.priceMinor - a.priceMinor;
      case 'year_desc':
        return b.year - a.year;
      case 'mileage_asc':
        return a.mileageKm - b.mileageKm;
      default:
        return b.publishedAt.localeCompare(a.publishedAt);
    }
  });

  const page = sorted.slice(0, PAGE_SIZE);

  // Drives the "Filters · N" chip in the mobile design.
  const activeFilters = [keyword, transmission, fuel, condition, priceMax, yearMin].filter(
    (value) => value !== '' && value !== null,
  ).length;

  return (
    <>
      <div className="shell" style={{ paddingTop: 'var(--space-5)' }}>
        <nav aria-label="Breadcrumb" className="breadcrumb">
          <Link href="/">Home</Link> <span aria-hidden="true">›</span> Cars for sale
        </nav>
        <div className="notice notice--info" role="status">
          <p className="notice__title">Sample listings</p>
          <p style={{ marginBottom: 0 }}>{SAMPLE_DATA_NOTICE}</p>
        </div>
      </div>

      <section className="section shell">
        <h1>Cars for sale</h1>

        <div className="results">
          <FilterDrawer activeFilters={activeFilters}>
            <form className="filters card" method="get" aria-label="Filter cars">
              <h2 className="filters__heading">Filters</h2>

            <div className="field">
              <label className="field__label" htmlFor={SEARCH_PARAM_KEYS.keyword}>
                Keyword
              </label>
              <input
                className="field__control"
                id={SEARCH_PARAM_KEYS.keyword}
                name={SEARCH_PARAM_KEYS.keyword}
                defaultValue={one(params, SEARCH_PARAM_KEYS.keyword)}
                placeholder="Make, model or city"
              />
            </div>

            <div className="field">
              <label className="field__label" htmlFor={SEARCH_PARAM_KEYS.yearMin}>
                Year from
              </label>
              <input
                className="field__control"
                id={SEARCH_PARAM_KEYS.yearMin}
                name={SEARCH_PARAM_KEYS.yearMin}
                inputMode="numeric"
                defaultValue={one(params, SEARCH_PARAM_KEYS.yearMin)}
              />
            </div>

            <div className="field">
              <label className="field__label" htmlFor={SEARCH_PARAM_KEYS.priceMinorMax}>
                Maximum price (₱)
              </label>
              <input
                className="field__control"
                id={SEARCH_PARAM_KEYS.priceMinorMax}
                name={SEARCH_PARAM_KEYS.priceMinorMax}
                inputMode="numeric"
                defaultValue={one(params, SEARCH_PARAM_KEYS.priceMinorMax)}
              />
            </div>

            <div className="field">
              <label className="field__label" htmlFor={SEARCH_PARAM_KEYS.transmission}>
                Transmission
              </label>
              <select
                className="field__control"
                id={SEARCH_PARAM_KEYS.transmission}
                name={SEARCH_PARAM_KEYS.transmission}
                defaultValue={transmission}
              >
                <option value="">Any</option>
                {TRANSMISSIONS.map((value) => (
                  <option key={value} value={value}>
                    {labels.transmission(value)}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label className="field__label" htmlFor={SEARCH_PARAM_KEYS.fuel}>
                Fuel type
              </label>
              <select
                className="field__control"
                id={SEARCH_PARAM_KEYS.fuel}
                name={SEARCH_PARAM_KEYS.fuel}
                defaultValue={fuel}
              >
                <option value="">Any</option>
                {FUEL_TYPES.map((value) => (
                  <option key={value} value={value}>
                    {labels.fuel(value)}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label className="field__label" htmlFor={SEARCH_PARAM_KEYS.condition}>
                Condition
              </label>
              <select
                className="field__control"
                id={SEARCH_PARAM_KEYS.condition}
                name={SEARCH_PARAM_KEYS.condition}
                defaultValue={condition}
              >
                <option value="">Any</option>
                {VEHICLE_CONDITIONS.map((value) => (
                  <option key={value} value={value}>
                    {labels.condition(value)}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label className="field__label" htmlFor={SEARCH_PARAM_KEYS.sort}>
                Sort by
              </label>
              <select
                className="field__control"
                id={SEARCH_PARAM_KEYS.sort}
                name={SEARCH_PARAM_KEYS.sort}
                defaultValue={sort}
              >
                <option value="newest">Newest</option>
                <option value="price_asc">Price: low to high</option>
                <option value="price_desc">Price: high to low</option>
                <option value="year_desc">Year: newest first</option>
                <option value="mileage_asc">Mileage: lowest first</option>
              </select>
            </div>

              <div className="form__actions">
                <button className="button button--primary" type="submit">
                  Show {sorted.length} cars
                </button>
                <Link className="linkish" href="/cars">
                  Reset all
                </Link>
              </div>
            </form>
          </FilterDrawer>

          <div>
            <p className="results__count" role="status">
              <strong>{sorted.length}</strong> {sorted.length === 1 ? 'car matches' : 'cars match'}
            </p>

            {page.length === 0 ? (
              <div className="card">
                <h2>No cars match those filters</h2>
                <p style={{ marginBottom: 0 }}>
                  Widen the price or year range, or <Link href="/cars">clear all filters</Link>.
                </p>
              </div>
            ) : (
              <ul className="listing-grid">
                {page.map((listing) => (
                  <li key={listing.id}>
                    <ListingCard listing={listing} />
                  </li>
                ))}
              </ul>
            )}

            <p className="results__pagination">
              Showing 1–{page.length} of {sorted.length} cars · pagination arrives with real
              listings
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
