import type { SeasonKey } from '@worldroot/contracts';
import type { ReactNode } from 'react';

/**
 * The banner across the top of every page while a site look is on: a small
 * illustrated scene for the occasion. Each scene is drawn once in a tile and
 * repeated along the width of the page, so it fills any screen without
 * stretching. It is decoration only and is hidden from screen readers.
 */

const HEIGHT = 72;

/** A scene tile repeated across the full width. */
function Tiled({ id, width, children }: { id: string; width: number; children: ReactNode }) {
  return (
    <svg aria-hidden="true" className="block w-full" height={HEIGHT} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id={id} width={width} height={HEIGHT} patternUnits="userSpaceOnUse">
          {children}
        </pattern>
      </defs>
      <rect width="100%" height={HEIGHT} fill={`url(#${id})`} />
    </svg>
  );
}

const Star = ({ x, y, r = 0.9, o = 0.85 }: { x: number; y: number; r?: number; o?: number }) => <circle cx={x} cy={y} r={r} fill="#fff" opacity={o} />;

function Pumpkin({ x, y, s = 1, face = true }: { x: number; y: number; s?: number; face?: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x="-1.5" y="-12.5" width="3" height="5" rx="1" fill="#4f7a1f" />
      <ellipse cx="-6" cy="0" rx="6" ry="8" fill="#d9600a" />
      <ellipse cx="6" cy="0" rx="6" ry="8" fill="#d9600a" />
      <ellipse cx="0" cy="0" rx="7" ry="8.6" fill="#f5821f" />
      <ellipse cx="-2" cy="-3" rx="2.5" ry="4" fill="#ffab57" opacity="0.5" />
      {face ? (
        <g fill="#ffe27a">
          <path d="M-5 -2.500 -2 -2.500 -3.500 -5.500z" />
          <path d="M5 -2.500 2 -2.500 3.500 -5.500z" />
          <path d="M-5 2 Q0 6.500 5 2 L3.500 2 2.500 3.500 1 2 -1 2 -2.500 3.500 -3.500 2z" />
        </g>
      ) : null}
    </g>
  );
}

function Ghost({ x, y, s = 1, flip = false }: { x: number; y: number; s?: number; flip?: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -s : s} ${s})`} opacity="0.93">
      <path d="M-8 10 V-2 a8 8 0 0 1 16 0 V10 l-2.700 -3 -2.700 3 -2.600 -3 -2.700 3 -2.600 -3z" fill="#f4f1ff" />
      <ellipse cx="-3" cy="-2" rx="1.4" ry="2" fill="#241344" />
      <ellipse cx="3" cy="-2" rx="1.4" ry="2" fill="#241344" />
      <ellipse cx="0" cy="3" rx="1.300" ry="1.700" fill="#241344" />
    </g>
  );
}

/** Pumpkins, ghosts and a witch crossing the moon, under a night sky. */
function Halloween() {
  return (
    <Tiled id="wr-banner-halloween" width={480}>
      <linearGradient id="wr-banner-night" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#120a2e" />
        <stop offset="0.6" stopColor="#2b1458" />
        <stop offset="1" stopColor="#4a1f6b" />
      </linearGradient>
      <rect width="480" height={HEIGHT} fill="url(#wr-banner-night)" />
      {[
        [14, 10], [46, 24], [88, 8], [132, 30], [168, 12], [206, 22], [244, 7], [276, 28], [318, 14], [348, 38], [420, 9], [452, 30], [470, 14], [300, 44], [60, 40],
      ].map(([x, y], index) => (
        <Star key={index} x={x!} y={y!} r={index % 3 === 0 ? 1.300 : 0.800} o={index % 2 === 0 ? 0.9 : 0.55} />
      ))}
      {/* The moon, and the witch crossing it. */}
      <circle cx="384" cy="27" r="25" fill="#fde9a8" opacity="0.16" />
      <circle cx="384" cy="27" r="17" fill="#fde9a8" />
      <circle cx="378" cy="22" r="3" fill="#f3d98a" opacity="0.7" />
      <circle cx="391" cy="33" r="2" fill="#f3d98a" opacity="0.7" />
      <g fill="#150a26" stroke="#150a26">
        <path d="M356 33 406 24" strokeWidth="1.800" strokeLinecap="round" fill="none" />
        <path d="M357 33 343 29 345 38z" strokeWidth="0.500" />
        <path d="M374 30 Q362 22 354 28 Q366 27 373 33z" strokeWidth="0.500" />
        <path d="M374 30 382 16 390 27z" strokeWidth="0.500" />
        <circle cx="383" cy="14" r="3.200" strokeWidth="0" />
        <path d="M378.500 12.500 388.500 11 384.500 1z" strokeWidth="0.500" />
        <ellipse cx="383.500" cy="12" rx="7.500" ry="1.700" strokeWidth="0" />
      </g>
      {/* The ground, with a bare tree. */}
      <path d="M0 72 V59 Q60 47 120 57 T240 55 T360 60 T480 59 V72z" fill="#0d0720" />
      <path d="M24 60 V40 M24 48 16 40 M24 44 31 36 M16 40 12 41 M31 36 35 37 M24 40 22 33" stroke="#0d0720" strokeWidth="2" strokeLinecap="round" fill="none" />
      <Ghost x={112} y={26} />
      <Ghost x={236} y={34} s={0.8} flip />
      <Ghost x={448} y={24} s={0.9} />
      <Pumpkin x={70} y={58} />
      <Pumpkin x={92} y={62} s={0.6} face={false} />
      <Pumpkin x={178} y={60} s={0.75} />
      <Pumpkin x={296} y={60} s={0.9} />
      <Pumpkin x={316} y={64} s={0.5} face={false} />
      <Pumpkin x={424} y={62} s={0.7} />
    </Tiled>
  );
}

function Pine({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x="-1.500" y="0" width="3" height="5" fill="#5b4636" />
      <path d="M0 -26 -7 -14 7 -14z M0 -20 -9 -6 9 -6z M0 -13 -11 2 11 2z" fill="#1f5a5e" />
      <path d="M0 -26 -3.500 -20 -1 -21 0 -19 1.500 -21 3.500 -20z M0 -19 -5 -11 -2 -12.500 0 -10.500 2.500 -12.500 5 -11z" fill="#fff" opacity="0.92" />
    </g>
  );
}

/** A snowy valley: mountains, pines, a snowman and falling snow. Winter, with no holiday in it. */
function Winter() {
  return (
    <Tiled id="wr-banner-winter" width={480}>
      <linearGradient id="wr-banner-frost" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#9fd0ee" />
        <stop offset="1" stopColor="#e6f4fc" />
      </linearGradient>
      <rect width="480" height={HEIGHT} fill="url(#wr-banner-frost)" />
      <circle cx="412" cy="20" r="11" fill="#fff" opacity="0.75" />
      {/* Far mountains with snow on their peaks. */}
      <path d="M0 58 40 28 70 46 110 18 160 52 200 30 250 56 300 24 345 50 390 32 440 54 462 42 480 58 V72 H0z" fill="#7fa6c9" />
      <path d="M110 18 98 30 106 28 112 34 118 27 124 31z M300 24 289 35 297 33 302 39 308 32 314 36z M40 28 32 38 39 36 43 41 48 35z M200 30 192 39 199 37 203 42 208 36z M390 32 383 40 389 38 393 43 397 37z" fill="#fff" />
      <path d="M0 72 V56 Q70 44 140 54 T280 52 T420 56 T480 56 V72z" fill="#d6e8f5" />
      <path d="M0 72 V63 Q80 53 160 62 T320 60 T480 63 V72z" fill="#fff" />
      <Pine x={30} y={60} />
      <Pine x={52} y={63} s={0.7} />
      <Pine x={150} y={61} s={0.85} />
      <Pine x={236} y={62} s={1.05} />
      <Pine x={258} y={64} s={0.65} />
      <Pine x={452} y={61} s={0.9} />
      {/* A snowman in a blue scarf. */}
      <g transform="translate(340 60)">
        <circle cx="0" cy="-5" r="7" fill="#fff" stroke="#c4d9ea" strokeWidth="0.800" />
        <circle cx="0" cy="-15" r="5" fill="#fff" stroke="#c4d9ea" strokeWidth="0.800" />
        <path d="M-5 -11.500 Q0 -9.500 5 -11.500 L5 -9.500 Q0 -7.500 -5 -9.500z M3 -10 5.500 -4 3.500 -3.500 2 -9.500z" fill="#3f7fbf" />
        <circle cx="-1.800" cy="-16" r="0.700" fill="#2b3a47" />
        <circle cx="1.800" cy="-16" r="0.700" fill="#2b3a47" />
        <path d="M0 -14.500 4.500 -13.800 0 -13.200z" fill="#f08a24" />
        <path d="M-7 -8 -12 -13 M7 -8 12 -12" stroke="#5b4636" strokeWidth="0.900" strokeLinecap="round" />
      </g>
      {[
        [20, 12], [64, 30], [96, 10], [128, 40], [176, 16], [214, 8], [268, 20], [322, 12], [364, 30], [436, 10], [468, 24], [84, 48], [196, 44], [404, 44],
      ].map(([x, y], index) => (
        <circle key={index} cx={x} cy={y} r={index % 3 === 0 ? 1.800 : 1.200} fill="#fff" opacity="0.95" />
      ))}
    </Tiled>
  );
}

function Flower({ x, y, color, s = 1 }: { x: number; y: number; color: string; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M0 0 V12 M0 8 Q-4 6 -5 2 M0 9 Q4 7 5 4" stroke="#3f8f4a" strokeWidth="1.300" fill="none" strokeLinecap="round" />
      {[0, 72, 144, 216, 288].map((angle) => (
        <ellipse key={angle} cx="0" cy="-3.600" rx="2.200" ry="3.400" fill={color} transform={`rotate(${angle})`} />
      ))}
      <circle r="1.800" fill="#ffd34d" />
    </g>
  );
}

function Tulip({ x, y, color, s = 1 }: { x: number; y: number; color: string; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M0 0 V13 M0 9 Q-5 8 -6 2 M0 10 Q5 9 6 3" stroke="#3f8f4a" strokeWidth="1.300" fill="none" strokeLinecap="round" />
      <path d="M-4 -1 Q-4.500 -8 -2 -7 L0 -9 2 -7 Q4.500 -8 4 -1 Q0 2.500 -4 -1z" fill={color} />
    </g>
  );
}

function Butterfly({ x, y, color }: { x: number; y: number; color: string }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(-15)`}>
      <ellipse cx="-3" cy="-1.500" rx="3" ry="2.400" fill={color} />
      <ellipse cx="3" cy="-1.500" rx="3" ry="2.400" fill={color} />
      <ellipse cx="-2.200" cy="2" rx="2" ry="1.700" fill={color} opacity="0.8" />
      <ellipse cx="2.200" cy="2" rx="2" ry="1.700" fill={color} opacity="0.8" />
      <rect x="-0.500" y="-3" width="1" height="6.500" rx="0.500" fill="#4a3b52" />
    </g>
  );
}

/** A spring meadow: blossom, flowers, butterflies and a soft sun. Spring, with no holiday in it. */
function Spring() {
  return (
    <Tiled id="wr-banner-spring" width={480}>
      <linearGradient id="wr-banner-morning" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#bfe4f7" />
        <stop offset="1" stopColor="#fdf3d8" />
      </linearGradient>
      <rect width="480" height={HEIGHT} fill="url(#wr-banner-morning)" />
      <circle cx="404" cy="20" r="20" fill="#ffe58a" opacity="0.35" />
      <circle cx="404" cy="20" r="11" fill="#ffd95a" />
      <g fill="#fff" opacity="0.92">
        <ellipse cx="120" cy="18" rx="16" ry="6" />
        <ellipse cx="132" cy="13" rx="10" ry="6" />
        <ellipse cx="110" cy="14" rx="8" ry="5" />
        <ellipse cx="290" cy="26" rx="14" ry="5" />
        <ellipse cx="300" cy="22" rx="9" ry="5" />
      </g>
      <path d="M0 72 V52 Q70 38 140 50 T280 46 T420 52 T480 52 V72z" fill="#b5e0a3" />
      <path d="M0 72 V61 Q80 50 160 60 T320 57 T480 61 V72z" fill="#86c97c" />
      {/* A tree in blossom. */}
      <g transform="translate(48 58)">
        <path d="M0 0 V-18 M0 -10 -7 -18 M0 -13 7 -21" stroke="#7a5a44" strokeWidth="2.400" strokeLinecap="round" fill="none" />
        {[[-9, -22], [0, -27], [9, -24], [-4, -18], [6, -17], [-12, -15], [13, -16], [1, -21]].map(([x, y], index) => (
          <circle key={index} cx={x} cy={y} r={index % 2 === 0 ? 5.500 : 4.500} fill={index % 3 === 0 ? '#f7a8c8' : '#fbc4da'} />
        ))}
      </g>
      <Tulip x={104} y={56} color="#ef6f9a" />
      <Tulip x={116} y={59} color="#f6c445" s={0.85} />
      <Flower x={168} y={58} color="#ffffff" />
      <Flower x={184} y={61} color="#c9a7f0" s={0.8} />
      <Tulip x={236} y={57} color="#b98be6" />
      <Flower x={262} y={60} color="#f9a8c9" s={0.9} />
      <Tulip x={318} y={58} color="#f6c445" />
      <Tulip x={330} y={61} color="#ef6f9a" s={0.8} />
      <Flower x={372} y={59} color="#ffffff" s={0.9} />
      <Flower x={440} y={60} color="#c9a7f0" />
      <Tulip x={456} y={57} color="#ef6f9a" s={0.9} />
      <Butterfly x={212} y={30} color="#f59ec0" />
      <Butterfly x={352} y={38} color="#a98be0" />
      <Butterfly x={86} y={36} color="#f6c445" />
    </Tiled>
  );
}

/**
 * One long flag, rippling the length of the page. The stripes are drawn as
 * waves along a tile one ripple long; a soft light-and-shade across each
 * ripple makes it read as cloth. The whole strip slides sideways by one
 * ripple, over and over, which looks like the flag waving.
 */
function WavingFlag({ id, stripes }: { id: string; stripes: string[] }) {
  const period = 240;
  const rise = 6;
  const top = 5;
  const band = (HEIGHT - top * 2 - rise) / stripes.length;
  // The height of the wave at each point along one ripple.
  const wave = (x: number) => rise * Math.sin((2 * Math.PI * x) / period);
  const xs = Array.from({ length: period / 8 + 1 }, (_, index) => index * 8);
  const edge = (offset: number, reverse = false) =>
    (reverse ? [...xs].reverse() : xs).map((x) => `${x} ${(top + rise / 2 + offset + wave(x)).toFixed(2)}`).join(' L');

  return (
    <div aria-hidden="true" className="wr-flag-banner overflow-hidden" style={{ height: HEIGHT }}>
      <svg className="wr-flag-banner-cloth block" height={HEIGHT} style={{ width: `calc(100% + ${period}px)` }} xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id={`${id}-folds`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#000" stopOpacity="0.14" />
            <stop offset="0.25" stopColor="#fff" stopOpacity="0.22" />
            <stop offset="0.5" stopColor="#000" stopOpacity="0.1" />
            <stop offset="0.75" stopColor="#000" stopOpacity="0.2" />
            <stop offset="1" stopColor="#000" stopOpacity="0.14" />
          </linearGradient>
          <pattern id={id} width={period} height={HEIGHT} patternUnits="userSpaceOnUse">
            {stripes.map((color, index) => (
              // Each stripe overlaps the next by a hair, so no gap shows between them.
              <path key={index} d={`M${edge(index * band)} L${edge((index + 1) * band + 0.6, true)}z`} fill={color} />
            ))}
            <path d={`M${edge(0)} L${edge(stripes.length * band, true)}z`} fill={`url(#${id}-folds)`} />
          </pattern>
        </defs>
        <rect width="100%" height={HEIGHT} fill={`url(#${id})`} />
      </svg>
    </div>
  );
}

const PRIDE = ['#e40303', '#ff8c00', '#ffed00', '#008026', '#24408e', '#732982'];
const TRANS = ['#5bcefa', '#f5a9b8', '#ffffff', '#f5a9b8', '#5bcefa'];

export function SeasonBanner({ season }: { season: SeasonKey }) {
  if (season === 'pride') return <WavingFlag id="wr-banner-pride" stripes={PRIDE} />;
  if (season === 'trans') return <WavingFlag id="wr-banner-trans" stripes={TRANS} />;
  if (season === 'halloween') return <Halloween />;
  if (season === 'winter') return <Winter />;
  if (season === 'spring') return <Spring />;
  return null;
}
