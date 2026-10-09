'use client';

import { SITE_THEME_KEYS, SITE_THEMES, toSiteTheme, type SiteThemeKey } from '@worldroot/contracts';
import { Lock } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type CSSProperties } from 'react';
import { send } from '@/features/scenes/api';

/**
 * A small picture of each theme: its page, a panel and a button. These are
 * fixed colors, not the live theme, so every swatch shows its own look
 * whatever theme the page around it is in.
 */
const SWATCHES: Record<SiteThemeKey, { page: string; panel: string; edge: string; ink: string; button: string; buttonInk: string; radius: string; font: string }> = {
  default: { page: 'linear-gradient(135deg, #fff8f2, #f3dfd0)', panel: 'rgba(255,255,255,0.75)', edge: '#ead9cb', ink: '#4a3b30', button: 'linear-gradient(#d9b89e, #b58e70)', buttonInk: '#2d2118', radius: '10px', font: 'inherit' },
  book: { page: '#eadcbd', panel: '#f5ecd6', edge: '#b89b6a', ink: '#3a2a1a', button: '#6b4a2a', buttonInk: '#f8efd9', radius: '3px', font: 'Georgia, serif' },
  aero: { page: 'linear-gradient(160deg, #bfe9ff, #7fd4ff 45%, #9be88a)', panel: 'rgba(255,255,255,0.6)', edge: '#ffffff', ink: '#103a5c', button: 'linear-gradient(#9fe0ff, #2f9be8)', buttonInk: '#062a45', radius: '12px', font: 'inherit' },
  win95: { page: '#c0c0c0', panel: '#c0c0c0', edge: '#808080', ink: '#000000', button: '#c0c0c0', buttonInk: '#000000', radius: '0', font: 'Tahoma, Arial, sans-serif' },
  glass: { page: 'linear-gradient(135deg, #ff9ec7, #8fa8ff 50%, #7ee0d0)', panel: 'rgba(255,255,255,0.35)', edge: 'rgba(255,255,255,0.9)', ink: '#1f2340', button: 'linear-gradient(#7d9bff, #4b63f0)', buttonInk: '#ffffff', radius: '16px', font: 'inherit' },
};

function Swatch({ theme }: { theme: SiteThemeKey }) {
  const look = SWATCHES[theme];
  const bevel = theme === 'win95' ? { borderStyle: 'solid', borderWidth: 2, borderColor: '#ffffff #808080 #808080 #ffffff' } : { border: `1px solid ${look.edge}` };
  return (
    <span aria-hidden="true" className="flex h-20 w-full items-center justify-center overflow-hidden rounded-xl p-3" style={{ background: look.page, fontFamily: look.font } as CSSProperties}>
      <span className="flex w-full items-center justify-between gap-2 px-3 py-2" style={{ background: look.panel, borderRadius: look.radius, color: look.ink, ...bevel } as CSSProperties}>
        <span className="text-sm font-semibold">Aa</span>
        <span className="px-2.5 py-1 text-xs font-medium" style={{ background: look.button, color: look.buttonInk, borderRadius: theme === 'win95' ? 0 : '999px', ...(theme === 'win95' ? bevel : {}) } as CSSProperties}>
          Post
        </span>
      </span>
    </span>
  );
}

interface SiteThemePickerProps {
  /** The theme in use now. */
  theme: string;
  /** Whether this account has Heartwood, which the themes other than the default come with. */
  heartwood: boolean;
}

/** Choose how the whole site looks for you. The choice is saved at once and follows you to every device. */
export function SiteThemePicker({ theme: saved, heartwood }: SiteThemePickerProps) {
  const router = useRouter();
  const [theme, setTheme] = useState<SiteThemeKey>(toSiteTheme(saved));
  const [error, setError] = useState<string | null>(null);

  const show = (key: SiteThemeKey) => {
    if (key === 'default') delete document.documentElement.dataset.skin;
    else document.documentElement.dataset.skin = key;
  };

  const pick = async (key: SiteThemeKey) => {
    const before = theme;
    setTheme(key);
    setError(null);
    // Shown straight away, then put back if the server says no.
    show(key);
    const result = await send('PUT', '/api/v1/profile/site-theme', { theme: key });
    if (!result.ok) {
      setTheme(before);
      show(before);
      return setError(result.message);
    }
    router.refresh();
  };

  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <div role="radiogroup" aria-label="Site Theme" className="grid gap-3 sm:grid-cols-2">
        {SITE_THEME_KEYS.map((key) => {
          const { label, note, free } = SITE_THEMES[key];
          const allowed = free || heartwood;
          const chosen = theme === key;
          return (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={chosen}
              disabled={!allowed}
              onClick={() => pick(key)}
              className={`wr-glass flex flex-col gap-3 rounded-2xl p-3 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${chosen ? 'ring-2 ring-accent' : ''} ${allowed ? 'hover:border-line-strong' : 'opacity-70'}`}
            >
              <Swatch theme={key} />
              <span className="flex items-start justify-between gap-3">
                <span className="min-w-0">
                  <span className="block font-display text-sm font-semibold text-ink">
                    {label}
                    {chosen ? <span className="ml-2 text-xs font-medium text-accent-text">In Use</span> : null}
                  </span>
                  <span className="block text-xs text-ink-muted">{note}</span>
                </span>
                {allowed ? null : (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-surface-sunken px-2 py-1 text-xs font-medium text-ink-muted">
                    <Lock className="size-3" aria-hidden="true" />
                    Heartwood
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
      {heartwood ? null : (
        <p className="text-sm text-ink-muted">
          The other themes come with WorldRoot Heartwood, which is coming soon.{' '}
          <Link href="/store" className="font-medium text-accent-text underline">
            See The Store
          </Link>
        </p>
      )}
    </div>
  );
}
