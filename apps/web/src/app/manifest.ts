import type { MetadataRoute } from 'next';

/** Lets a browser install WorldRoot as an app with its own icon and window. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'WorldRoot',
    short_name: 'WorldRoot',
    description: 'Where stories take root. A home for text roleplay and collaborative storytelling.',
    start_url: '/home',
    display: 'standalone',
    background_color: '#fff8f2',
    theme_color: '#d77b57',
    // Browsers want fixed-size pictures before they will offer to install the app. The drawing is kept for those that prefer it.
    icons: [
      { src: '/icon-192.png', type: 'image/png', sizes: '192x192', purpose: 'any' },
      { src: '/icon-512.png', type: 'image/png', sizes: '512x512', purpose: 'any' },
      { src: '/icon.svg', type: 'image/svg+xml', sizes: 'any', purpose: 'any' },
    ],
  };
}
