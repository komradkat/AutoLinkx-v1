'use client';

/**
 * A listing photo that falls back to the drawn car when the file is missing.
 *
 * Not every sample listing has a photo, and once real uploads exist (A-10) a
 * delivery can fail or be withdrawn. Either way a broken-image icon would look
 * like a bug, so the drawing takes over instead.
 */
import { useState } from 'react';
import type { ReactNode } from 'react';

export function CarPhoto({
  src,
  alt,
  fallback,
}: {
  src: string;
  alt: string;
  fallback: ReactNode;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) return <>{fallback}</>;

  return (
    // Media is served by our own route rather than an optimizer-friendly
    // public URL, so next/image buys nothing here.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className="car-thumb car-thumb--photo"
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}
