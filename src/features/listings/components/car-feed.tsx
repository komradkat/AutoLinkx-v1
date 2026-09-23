'use client';

/**
 * Full-screen discovery feed, from `Ui design/mobile/01-Discover-feed.png`.
 *
 * Gestures:
 * - swipe up / down  → next or previous car (native scroll-snap)
 * - swipe right      → save the car, then the feed moves on
 * - tap the heart    → react to the car (stays on the same car)
 *
 * The sideways swipe moves the card with a transform, driven by pointer
 * events, which every current browser supports for touch, pen and mouse alike.
 *
 * Two earlier designs failed on real phones and are worth not repeating.
 * Fighting the browser for the gesture with `preventDefault()` lost the race
 * on a phone, where scrolling starts before script runs. Parking a horizontal
 * scroll track past a Save panel left the card resting *on* the Save panel
 * whenever layout settled after the code ran — so cards looked swiped before
 * anyone touched them, and there was nowhere further right to swipe. This
 * version has no resting offset: the card sits at zero until a finger moves it.
 *
 * Save in the rail does what a swipe does, so nobody needs a gesture
 * (WCAG 2.5.1).
 *
 * Saves and reactions live in component state for this visit only; favourites
 * arrive with the interactions milestone (A-15).
 */
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react';

import { CarThumb, formatMileage, formatPrice, labels } from './listing-card';
import type { SampleListing } from '../sample-listings';

/** How far right, in pixels, a drag must travel to count as a save. */
const SAVE_THRESHOLD = 90;

function toggled(set: ReadonlySet<string>, id: string): ReadonlySet<string> {
  const next = new Set(set);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

export function CarFeed({ listings }: { listings: readonly SampleListing[] }) {
  const [index, setIndex] = useState(0);
  const [saved, setSaved] = useState<ReadonlySet<string>>(new Set());
  const [reacted, setReacted] = useState<ReadonlySet<string>>(new Set());
  const [toast, setToast] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const cards = [...container.querySelectorAll<HTMLElement>('[data-feed-card]')];
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setIndex(cards.indexOf(entry.target as HTMLElement));
        }
      },
      { root: container, threshold: 0.6 },
    );

    for (const card of cards) observer.observe(card);
    return () => observer.disconnect();
  }, [listings]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(timer);
  }, [toast]);

  const save = useCallback((id: string, isLast: boolean) => {
    setSaved((previous) => new Set(previous).add(id));
    setToast(isLast ? 'Saved · that was the last car' : 'Saved');
  }, []);

  const unsave = useCallback((id: string) => {
    setSaved((previous) => toggled(previous, id));
    setToast('Removed from saved');
  }, []);

  /**
   * Scrolls the feed — and only the feed — to the car after `position`.
   *
   * Not `scrollIntoView()`: that scrolls every scrollable ancestor too, which
   * shifted the whole page and left empty space under the feed.
   */
  const advance = useCallback((position: number) => {
    const container = containerRef.current;
    if (!container) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    container.scrollTo({
      top: (position + 1) * container.clientHeight,
      behavior: reduceMotion ? 'auto' : 'smooth',
    });
  }, []);

  return (
    <div className="feed" ref={containerRef}>
      {listings.map((listing, position) => (
        <FeedCard
          key={listing.id}
          listing={listing}
          position={position}
          total={listings.length}
          isSaved={saved.has(listing.id)}
          isReacted={reacted.has(listing.id)}
          onSave={() => save(listing.id, position + 1 === listings.length)}
          onUnsave={() => unsave(listing.id)}
          onAdvance={() => advance(position)}
          onToggleReact={() => setReacted((previous) => toggled(previous, listing.id))}
        />
      ))}

      <p className="visually-hidden" role="status" aria-live="polite">
        Car {index + 1} of {listings.length}
      </p>

      {toast && (
        <p className="feed__toast" role="status" aria-live="polite">
          {toast}
        </p>
      )}

    </div>
  );
}

interface FeedCardProps {
  listing: SampleListing;
  position: number;
  total: number;
  isSaved: boolean;
  isReacted: boolean;
  onSave: () => void;
  onUnsave: () => void;
  onAdvance: () => void;
  onToggleReact: () => void;
}

function FeedCard({
  listing,
  position,
  total,
  isSaved,
  isReacted,
  onSave,
  onUnsave,
  onAdvance,
  onToggleReact,
}: FeedCardProps) {
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const drag = useRef<{ x: number; y: number; axis: 'x' | 'y' | null } | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const title = `${listing.year} ${listing.make} ${listing.model}`;
  const isLast = position + 1 === total;

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  /** Save, fly the card off, then move the feed to the next car. */
  function commitSave() {
    onSave();
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
      setOffset(0);
      onAdvance();
      return;
    }
    setLeaving(true);
    timers.current.push(
      setTimeout(() => {
        onAdvance();
        timers.current.push(
          setTimeout(() => {
            setLeaving(false);
            setOffset(0);
          }, 480),
        );
      }, 260),
    );
  }

  function onPointerDown(event: ReactPointerEvent<HTMLElement>) {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    drag.current = { x: event.clientX, y: event.clientY, axis: null };
  }

  function onPointerMove(event: ReactPointerEvent<HTMLElement>) {
    const start = drag.current;
    if (!start || leaving) return;

    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;

    // Decide the axis once: up and down belong to the feed's own scrolling.
    if (start.axis === null) {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
      start.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
      if (start.axis === 'y') {
        drag.current = null;
        return;
      }
      setDragging(true);
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        // Best effort: the drag still works without capture.
      }
    }

    setOffset(Math.max(0, dx)); // right only
  }

  function onPointerEnd() {
    const wasHorizontal = drag.current?.axis === 'x';
    drag.current = null;
    setDragging(false);
    if (wasHorizontal && offset > SAVE_THRESHOLD) commitSave();
    else setOffset(0);
  }

  function onSaveButton() {
    if (isSaved) onUnsave();
    else commitSave();
  }

  const revealed = leaving ? 1 : Math.min(1, offset / SAVE_THRESHOLD);
  /** Past the threshold: releasing now saves, and the panel says so. */
  const armed = leaving || offset > SAVE_THRESHOLD;

  return (
    <article
      className="feed__card"
      data-feed-card
      // Each car tints its own backdrop, so the feed does not repeat one colour.
      style={{ '--tint': listing.colour } as CSSProperties}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
      onClickCapture={(event) => {
        // A drag that ends on a link must not also follow it.
        if (offset > 6) {
          event.preventDefault();
          event.stopPropagation();
        }
      }}
    >
      {/* Behind the card, revealed as it moves right. */}
      {(offset > 0 || leaving) && (
        <div
          className="feed__save-pane"
          data-armed={armed || undefined}
          aria-hidden="true"
          style={{ '--reveal': revealed } as CSSProperties}
        >
          <span className="feed__save-badge">
            <svg viewBox="0 0 24 24" width="26" height="26">
              <path
                d="M6 3h12v18l-6-4-6 4z"
                fill={armed ? 'currentColor' : 'none'}
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span className="feed__save-label">{armed ? 'Release to save' : 'Keep sliding'}</span>
        </div>
      )}

      <div
        className="feed__slide"
        data-dragging={dragging || undefined}
        data-leaving={leaving || undefined}
        style={{
          // Slight lift and tilt while moving, so the card feels picked up.
          transform: leaving
            ? 'translateX(118%) rotate(9deg) scale(0.94)'
            : offset
              ? `translateX(${offset}px) rotate(${offset / 60}deg) scale(${1 - Math.min(offset, 160) / 4000})`
              : undefined,
        }}
      >
        {/*
          The photo is shown whole, over a blurred copy of itself: cropping to
          fill cut the cars in half, and a plain backdrop left hard edges.
        */}
        <div
          className="feed__media"
          style={{ '--photo': `url(/assets/cars/${listing.id}.jpg)` } as CSSProperties}
        >
          <CarThumb
            colour={listing.colour}
            label={`Image for ${title}`}
            imageUrl={`/assets/cars/${listing.id}.jpg`}
          />
        </div>

        {isSaved && (
          <span className="feed__saved">
            <svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true">
              <path d="M6 3h12v18l-6-4-6 4z" fill="currentColor" />
            </svg>
            Saved
          </span>
        )}

        <span className="feed__counter">
          {position + 1} / {total}
        </span>

        <div className="feed__overlay">
          <div className="feed__info">
            <p className="feed__chips">
              <span className="feed__chip">{labels.condition(listing.condition)}</span>
              <span className="feed__chip">{listing.photoCount} photos</span>
            </p>
            <h2 className="feed__title">{title}</h2>
            <p className="feed__price">{formatPrice(listing.priceMinor, listing.currency)}</p>
            <ul className="feed__specs">
              <li>{formatMileage(listing.mileageKm)}</li>
              <li>{labels.transmission(listing.transmission)}</li>
              <li>{labels.fuel(listing.fuel)}</li>
              <li>{listing.location.split(',')[0]}</li>
            </ul>
            <Link className="feed__cta" href={`/cars/${listing.id}`}>
              Full details &amp; specs ›
            </Link>
          </div>
        </div>

        <div className="feed__rail">
          <button
            // Extensions stamp attributes such as `fdprocessedid` onto buttons
            // before React hydrates; suppressing covers this element only.
            suppressHydrationWarning
            className={isReacted ? 'feed__action is-reacted' : 'feed__action'}
            type="button"
            aria-pressed={isReacted}
            aria-label={isReacted ? 'Remove your reaction' : 'React to this car'}
            onClick={onToggleReact}
          >
            <span className="feed__action-icon" aria-hidden="true">
              {isReacted ? '♥' : '♡'}
            </span>
            {isReacted ? 'Reacted' : 'React'}
          </button>

          <button
            suppressHydrationWarning
            className={isSaved ? 'feed__action is-saved' : 'feed__action'}
            type="button"
            aria-pressed={isSaved}
            aria-label={isSaved ? 'Remove from saved' : 'Save this car'}
            onClick={onSaveButton}
          >
            <span className="feed__action-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="17" height="17">
                <path
                  d="M6 3h12v18l-6-4-6 4z"
                  fill={isSaved ? 'currentColor' : 'none'}
                  stroke="currentColor"
                  strokeWidth="1.9"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            {isSaved ? 'Saved' : 'Save'}
          </button>

          <Link className="feed__action" href={`/cars/${listing.id}`}>
            <span className="feed__action-icon" aria-hidden="true">
              ⋯
            </span>
            Details
          </Link>
        </div>

        <p className="feed__hint">
          {isLast
            ? 'That is every sample car'
            : `Swipe up for the next · swipe right to save · ${position + 1} of ${total}`}
        </p>
      </div>
    </article>
  );
}
