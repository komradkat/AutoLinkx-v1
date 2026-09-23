/**
 * Discover feed (mobile Feed mode). Test-only sample data until A-12.
 */
import type { Metadata } from 'next';

import { CarFeed } from '@/features/listings/components/car-feed';
import { DiscoveryTabs } from '@/features/listings/components/discovery-tabs';
import { SAMPLE_LISTINGS } from '@/features/listings/sample-listings';

export const metadata: Metadata = { title: 'Discover — AutoLinkX' };

export default function FeedPage() {
  return (
    <div className="discover discover--feed">
      <div className="discover__bar shell">
        <DiscoveryTabs current="/feed" />
      </div>
      <CarFeed listings={SAMPLE_LISTINGS} />
    </div>
  );
}
