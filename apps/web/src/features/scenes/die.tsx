/**
 * One die, drawn as the shape it really is: a four-sided die is a pyramid, a
 * twenty-sided die an icosahedron, and so on. The six-sided die is a true
 * cube in 3D. The others are drawn as their familiar faceted outline, shaded
 * so the face toward you is the brightest.
 *
 * Colors come from the dice theme on an ancestor (`wr-dice-…`), never from here.
 */

import type { CSSProperties } from 'react';

type Shade = 'light' | 'base' | 'dark';
type Point = [number, number];

interface Shape {
  facets: Array<{ points: Point[]; shade: Shade }>;
  /** Where the number sits, and how large. */
  number: { x: number; y: number; size: number };
}

const ring = (count: number, radius: number, startDegrees = -90): Point[] =>
  Array.from({ length: count }, (_, index) => {
    const angle = ((startDegrees + (360 / count) * index) * Math.PI) / 180;
    return [50 + radius * Math.cos(angle), 50 + radius * Math.sin(angle)];
  });

const D4: Shape = {
  facets: [
    // The face toward you, with one side face seen edge-on beside it.
    { points: [[46, 8], [82, 88], [6, 88]], shade: 'light' },
    { points: [[46, 8], [95, 76], [82, 88]], shade: 'dark' },
  ],
  number: { x: 45, y: 63, size: 24 },
};

const D8: Shape = {
  facets: [
    { points: [[50, 4], [84, 60], [16, 60]], shade: 'light' },
    { points: [[50, 4], [16, 60], [8, 50]], shade: 'base' },
    { points: [[50, 4], [92, 50], [84, 60]], shade: 'base' },
    { points: [[16, 60], [84, 60], [50, 96]], shade: 'dark' },
    { points: [[8, 50], [16, 60], [50, 96]], shade: 'dark' },
    { points: [[92, 50], [50, 96], [84, 60]], shade: 'dark' },
  ],
  number: { x: 50, y: 44, size: 24 },
};

const D10: Shape = {
  facets: [
    { points: [[50, 4], [76, 50], [50, 68], [24, 50]], shade: 'light' },
    { points: [[50, 4], [90, 38], [90, 60], [76, 50]], shade: 'base' },
    { points: [[50, 4], [24, 50], [10, 60], [10, 38]], shade: 'base' },
    { points: [[76, 50], [90, 60], [50, 96], [50, 68]], shade: 'dark' },
    { points: [[24, 50], [50, 68], [50, 96], [10, 60]], shade: 'dark' },
  ],
  number: { x: 50, y: 44, size: 22 },
};

const D12: Shape = (() => {
  const outer = ring(10, 46);
  const inner = ring(5, 27);
  const facets: Shape['facets'] = [{ points: inner, shade: 'light' }];
  for (let i = 0; i < 5; i += 1) {
    const points: Point[] = [inner[i]!, outer[2 * i]!, outer[2 * i + 1]!, outer[(2 * i + 2) % 10]!, inner[(i + 1) % 5]!];
    // The faces along the top catch the light; the ones underneath are in shadow.
    facets.push({ points, shade: i === 0 || i === 4 ? 'base' : 'dark' });
  }
  return { facets, number: { x: 50, y: 51, size: 24 } };
})();

const D20: Shape = (() => {
  const [h0, h1, h2, h3, h4, h5] = ring(6, 46) as [Point, Point, Point, Point, Point, Point];
  const t1: Point = [50, 22];
  const t2: Point = [80, 70];
  const t3: Point = [20, 70];
  return {
    facets: [
      { points: [t1, t2, t3], shade: 'light' },
      { points: [h5, h0, t1], shade: 'base' },
      { points: [h0, h1, t1], shade: 'base' },
      { points: [h1, t2, t1], shade: 'base' },
      { points: [h5, t1, t3], shade: 'base' },
      { points: [h1, h2, t2], shade: 'dark' },
      { points: [h2, h3, t2], shade: 'dark' },
      { points: [t2, h3, t3], shade: 'dark' },
      { points: [h3, h4, t3], shade: 'dark' },
      { points: [h4, h5, t3], shade: 'dark' },
    ],
    number: { x: 50, y: 56, size: 22 },
  };
})();

/** The drawn shape for a die with this many sides. A d100 is rolled on ten-sided dice, so it takes that shape. */
function shapeFor(sides: number): Shape {
  if (sides <= 4) return D4;
  if (sides <= 8) return D8;
  if (sides <= 10 || sides === 100) return D10;
  if (sides <= 12) return D12;
  return D20;
}

const path = (points: Point[]) => points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');

/** Other numbers this die could show, for the five faces of a cube that are not toward you. */
function otherFaces(value: number, sides: number): number[] {
  return Array.from({ length: 5 }, (_, index) => ((value - 1 + index + 1) % Math.max(sides, 2)) + 1);
}

interface DieProps {
  sides: number;
  /** What the die shows. */
  value: number | string;
  /** `resting` sits still. `rolling` plays the throw once, ending at rest. */
  state?: 'resting' | 'rolling';
  /** Position among several dice. Each is thrown a moment after the last, from a little further back, with its own spin. */
  order?: number;
  /** A small one, for buttons and swatches. */
  small?: boolean;
}

export function Die({ sides, value, state = 'resting', order = 0, small = false }: DieProps) {
  // Dice thrown together should not move as one: later dice start later, travel further and turn a different amount.
  const throwStyle = { '--roll-from': `${-14 - order * 4.5}rem`, '--roll-turns': 2.25 + ((order * 7) % 5) * 0.25, '--roll-time': `${1.15 + order * 0.07}s` } as CSSProperties;
  const stage = `wr-die-stage ${small ? 'wr-die-small' : ''} ${state === 'rolling' ? 'wr-die-rolling' : ''}`;

  if (sides === 6) {
    const faces = [value, ...(typeof value === 'number' ? otherFaces(value, sides) : [value, value, value, value, value])];
    return (
      <span className={stage} style={throwStyle}>
        <span className="wr-die-travel">
          <span className="wr-die-hop block">
          <span className="wr-die-cube block">
            {faces.map((face, index) => (
              <span key={index} className="wr-die-face">
                {face}
              </span>
            ))}
          </span>
          </span>
        </span>
      </span>
    );
  }

  const shape = shapeFor(sides);
  const text = String(value);
  return (
    <span className={stage} style={throwStyle}>
      <span className="wr-die-travel">
      <span className="wr-die-hop block">
        <svg viewBox="0 0 100 100" className="wr-die-flat block" aria-hidden="true">
          {shape.facets.map((facet, index) => (
            <polygon key={index} points={path(facet.points)} className={`wr-die-facet-${facet.shade}`} />
          ))}
          {/* A soft shine across the face toward you. */}
          <polygon points={path(shape.facets[0]!.points)} className="wr-die-shine" />
          <text x={shape.number.x} y={shape.number.y} className="wr-die-number" fontSize={text.length > 2 ? shape.number.size * 0.72 : shape.number.size} textAnchor="middle" dominantBaseline="central">
            {text}
          </text>
        </svg>
      </span>
      </span>
    </span>
  );
}
