/**
 * Root layout: the shared chrome from the design references.
 *
 * Reads the verified viewer once per request and passes it down, so the header
 * shows real session state. That makes every page dynamic, which the design
 * requires anyway — the header is personalised on every screen.
 *
 * Developer B owns this file from B-02 onward. Keep the viewer read here
 * rather than in a client component; identity must stay server-derived.
 */
import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { BottomNav } from '@/components/bottom-nav';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { getViewer } from '@/server/auth/viewer';
import { getRequestClient } from '@/server/supabase/next';

import './globals.css';

export const metadata: Metadata = {
  title: 'AutoLinkX — cars from the people who drive them',
  description:
    'A marketplace where individual sellers list cars and buyers contact them directly. Every listing is reviewed before it goes live.',
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const viewer = await getViewer(await getRequestClient());

  // `suppressHydrationWarning` on <html>: browser extensions add attributes to
  // it before React hydrates, which React reports as a mismatch. It covers
  // this element's attributes only, nothing inside the tree.
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <SiteHeader viewer={viewer} />
        <main id="main">{children}</main>
        <SiteFooter />
        <BottomNav viewer={viewer} />
      </body>
    </html>
  );
}
