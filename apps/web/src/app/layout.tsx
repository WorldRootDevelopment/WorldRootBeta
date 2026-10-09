import type { Metadata, Viewport } from 'next';
import { Heebo, Pacifico, Source_Serif_4 } from 'next/font/google';
import { cookies } from 'next/headers';
import type { ReactNode } from 'react';
import { getSeason } from '@worldroot/core';
import { THEME_COOKIE } from '@/features/shell/theme';
import { database } from '@/lib/server';
import './globals.css';

// Heebo and Pacifico are the two faces of the WorldRoot site. Pacifico is for the name only.
const interfaceFont = Heebo({ subsets: ['latin'], variable: '--font-interface' });
const wordmarkFont = Pacifico({ subsets: ['latin'], weight: '400', variable: '--font-wordmark' });
const storyFont = Source_Serif_4({
  subsets: ['latin', 'latin-ext'],
  style: ['normal', 'italic'],
  variable: '--font-story',
});

export const metadata: Metadata = {
  title: { default: 'WorldRoot', template: '%s · WorldRoot' },
  description: 'Where stories take root. A home for text roleplay and collaborative storytelling.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Tints the browser or app window to match the page in each theme.
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fff8f2' },
    { media: '(prefers-color-scheme: dark)', color: '#1d1814' },
  ],
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  // An explicit choice is rendered on the server so the page never flashes the wrong theme.
  const stored = (await cookies()).get(THEME_COOKIE)?.value;
  const theme = stored === 'light' || stored === 'dark' ? stored : undefined;
  // The look staff have switched on for the whole site. A problem reading it must never stop a page from showing.
  const season = await database()
    .then(({ db }) => getSeason(db))
    .catch(() => 'none' as const);

  return (
    <html lang="en" data-theme={theme} data-season={season === 'none' ? undefined : season} className={`${interfaceFont.variable} ${storyFont.variable} ${wordmarkFont.variable}`}>
      <body className="min-h-dvh">
        {/* A stripe in the colors of the site look. Hidden unless a look is on. */}
        <div aria-hidden="true" className="wr-season-bar" />
        {children}
      </body>
    </html>
  );
}
