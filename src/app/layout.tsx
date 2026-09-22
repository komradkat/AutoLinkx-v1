/**
 * SCAFFOLD PLACEHOLDER — Developer A, task A-02.
 *
 * `src/app/**` belongs to Developer B. This root layout exists only so the
 * project type-checks and builds from a clean install; it carries no design
 * tokens, fonts, styles, navigation, or branding. Replace it wholesale in
 * B-02 and delete this comment.
 */
import type { ReactNode } from 'react';

export const metadata = { title: 'AutoLinkX', description: 'Car marketplace' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
