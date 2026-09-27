import type { DayPhase } from "../../../../scene-provider";

export type Point = readonly [number, number];

/** One flat-shaded paper facet: its outline and which way it faces (a unit vector, y down). */
export type Facet = { points: readonly Point[]; normal: Point };

/** The four paper tones a facet can take, lit (0) to shadowed (3). */
export type Tone = 0 | 1 | 2 | 3;

/** Where the light comes from in each phase, as a unit vector pointing toward the light. */
const lightFrom: Record<DayPhase, Point> = {
  dawn: normalize([-1, -0.4]),
  day: normalize([-0.35, -1]),
  dusk: normalize([1, -0.4]),
  night: normalize([0.25, -1]),
};

function normalize([x, y]: Point): Point {
  const length = Math.hypot(x, y) || 1;
  return [x / length, y / length];
}

export const pointsAttr = (points: readonly Point[]) =>
  points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");

/**
 * The tone of a facet under the phase's light. `pleat` alternates valley and mountain folds so
 * neighbouring facets never flatten into one colour.
 */
export function facetTone(facet: Facet, phase: DayPhase, pleat = 0): Tone {
  const [lx, ly] = lightFrom[phase];
  const lit = facet.normal[0] * lx + facet.normal[1] * ly + pleat;
  if (lit > 0.5) return 0;
  if (lit > 0.05) return 1;
  if (lit > -0.4) return 2;
  return 3;
}

/**
 * A half-dome puff folded from paper: a fan of triangles from a point on the baseline out to a
 * faceted arc. Coordinates are local to the cloud's baseline centre.
 */
export function puffFacets(cx: number, radius: number, segments: number, lift = 0): Facet[] {
  const centre: Point = [cx, -lift];
  return Array.from({ length: segments }, (_, index) => {
    const a0 = Math.PI + (index / segments) * Math.PI;
    const a1 = Math.PI + ((index + 1) / segments) * Math.PI;
    const mid = (a0 + a1) / 2;
    const rim = (angle: number): Point => [
      cx + Math.cos(angle) * radius,
      -lift + Math.sin(angle) * radius * 0.92,
    ];
    return { points: [centre, rim(a0), rim(a1)], normal: [Math.cos(mid), Math.sin(mid)] };
  });
}

export type Puff = { cx: number; r: number; segments: number; lift?: number };

export type CloudShape = {
  /** Baseline centre in the artwork. */
  x: number;
  y: number;
  scale: number;
  /** Back to front. The last puff is the flap that folds over as the cloud drifts. */
  puffs: readonly Puff[];
  /** Seconds for one pass across the sky at no wind. */
  cross: number;
  /** Where in its crossing the cloud starts, 0–1. */
  offset: number;
  /** Seconds between folds of its flap. */
  foldEvery: number;
};

/** Seven clouds; the scene shows the first N for the current cloud cover. */
export const cloudShapes: readonly CloudShape[] = [
  {
    x: 0,
    y: 300,
    scale: 1.2,
    puffs: [
      { cx: -70, r: 58, segments: 5 },
      { cx: 40, r: 76, segments: 6 },
      { cx: 125, r: 44, segments: 4 },
      { cx: -10, r: 50, segments: 4, lift: -4 },
    ],
    cross: 150,
    offset: 0.32,
    foldEvery: 9,
  },
  {
    x: 0,
    y: 196,
    scale: 0.9,
    puffs: [
      { cx: -55, r: 48, segments: 4 },
      { cx: 30, r: 64, segments: 5 },
      { cx: 100, r: 36, segments: 4 },
    ],
    cross: 175,
    offset: 0.71,
    foldEvery: 11,
  },
  {
    x: 0,
    y: 402,
    scale: 1.45,
    puffs: [
      { cx: -110, r: 46, segments: 4 },
      { cx: -30, r: 70, segments: 6 },
      { cx: 70, r: 60, segments: 5 },
      { cx: 140, r: 38, segments: 4 },
    ],
    cross: 130,
    offset: 0.05,
    foldEvery: 8,
  },
  {
    x: 0,
    y: 128,
    scale: 0.7,
    puffs: [
      { cx: -40, r: 40, segments: 4 },
      { cx: 30, r: 54, segments: 5 },
    ],
    cross: 200,
    offset: 0.52,
    foldEvery: 13,
  },
  {
    x: 0,
    y: 340,
    scale: 1.05,
    puffs: [
      { cx: -80, r: 52, segments: 5 },
      { cx: 10, r: 66, segments: 5 },
      { cx: 95, r: 50, segments: 4 },
    ],
    cross: 160,
    offset: 0.88,
    foldEvery: 10,
  },
  {
    x: 0,
    y: 250,
    scale: 1.3,
    puffs: [
      { cx: -90, r: 60, segments: 5 },
      { cx: 20, r: 80, segments: 6 },
      { cx: 120, r: 54, segments: 5 },
      { cx: 60, r: 40, segments: 4, lift: -6 },
    ],
    cross: 140,
    offset: 0.18,
    foldEvery: 9.5,
  },
  {
    x: 0,
    y: 450,
    scale: 1.6,
    puffs: [
      { cx: -120, r: 50, segments: 4 },
      { cx: -30, r: 74, segments: 6 },
      { cx: 80, r: 66, segments: 5 },
      { cx: 160, r: 42, segments: 4 },
    ],
    cross: 120,
    offset: 0.62,
    foldEvery: 12,
  },
];

/** The flat strip along a cloud's underside, where it would be glued to the sky. */
export function baseStrip(puffs: readonly Puff[]): Point[] {
  const left = Math.min(...puffs.map((puff) => puff.cx - puff.r));
  const right = Math.max(...puffs.map((puff) => puff.cx + puff.r));
  return [
    [left, 0],
    [right, 0],
    [right - 10, 10],
    [left + 10, 10],
  ];
}

/**
 * A folded paper crescent: two faceted arcs from tip to tip, split into pleated strips. Local to
 * the moon's centre, bulging right.
 */
export function crescentFacets(radius: number, strips = 9): Facet[] {
  const tip = (100 * Math.PI) / 180;
  const inner = { k: 0.45, c: -0.0957 * radius };
  const outerAt = (angle: number): Point => [radius * Math.cos(angle), radius * Math.sin(angle)];
  const innerAt = (angle: number): Point => [
    inner.k * radius * Math.cos(angle) + inner.c,
    radius * Math.sin(angle),
  ];
  return Array.from({ length: strips }, (_, index) => {
    const a0 = -tip + (index / strips) * tip * 2;
    const a1 = -tip + ((index + 1) / strips) * tip * 2;
    const mid = (a0 + a1) / 2;
    return {
      points: [outerAt(a0), outerAt(a1), innerAt(a1), innerAt(a0)],
      normal: [Math.cos(mid), Math.sin(mid)],
    };
  });
}

/** A four-blade paper pinwheel, each blade a flat face and a curled-back fold. */
export function pinwheelBlades(radius: number) {
  return Array.from({ length: 4 }, (_, index) => {
    const angle = (index * Math.PI) / 2;
    const rotate = ([x, y]: Point): Point => [
      x * Math.cos(angle) - y * Math.sin(angle),
      x * Math.sin(angle) + y * Math.cos(angle),
    ];
    const face: Point[] = [
      [0, 0],
      [-radius * 0.06, -radius],
      [radius * 0.66, -radius * 0.66],
    ];
    const curl: Point[] = [
      [0, 0],
      [radius * 0.66, -radius * 0.66],
      [radius * 0.28, -radius * 0.12],
    ];
    return { face: face.map(rotate), curl: curl.map(rotate) };
  });
}

/** A five-point star outline centred on the origin. */
export function starPoints(outer: number, inner = outer * 0.45): Point[] {
  return Array.from({ length: 10 }, (_, index) => {
    const radius = index % 2 === 0 ? outer : inner;
    const angle = -Math.PI / 2 + (index * Math.PI) / 5;
    return [Math.cos(angle) * radius, Math.sin(angle) * radius] as const;
  });
}
