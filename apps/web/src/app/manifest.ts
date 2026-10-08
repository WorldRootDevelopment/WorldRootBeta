import type { MetadataRoute } from 'next';

/** Lets a browser install WorldRoot as an app with its own icon and window. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'WorldRoot',
    short_name: 'WorldRoot',
    description: 'Where stories take root. A home for text roleplay and collaborative storytelling.',
    start_url: '/home',
    display: 'standalone',
    background_color: '#fbfaf8',
    theme_color: '#2f6b4f',
    icons: [{ src: '/icon.svg', type: 'image/svg+xml', sizes: 'any', purpose: 'any' }],
  };
}
