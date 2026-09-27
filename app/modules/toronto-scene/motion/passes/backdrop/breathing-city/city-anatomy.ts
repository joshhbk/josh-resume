/**
 * Where the city's body parts sit in the artwork's 1536×1024 space. Origins are the hidden feet
 * of each sheet (behind the trees), so the sheets inhale upwards from the ground.
 */
export type BreathingPart = "left" | "center" | "tower" | "right";

export const parts: readonly {
  part: BreathingPart;
  layer: string;
  /** Fraction of a breath this sheet lags behind the leftmost one: the breath rolls left→right. */
  lag: number;
  clip: string;
}[] = [
  { part: "left", layer: "buildings-left", lag: 0, clip: "toronto-left-buildings-cut" },
  { part: "center", layer: "buildings-center", lag: 0.08, clip: "toronto-center-buildings-cut" },
  { part: "tower", layer: "tower", lag: 0.1, clip: "toronto-tower-cut" },
  { part: "right", layer: "buildings-right", lag: 0.16, clip: "toronto-right-buildings-cut" },
];

/** The sky's paper bands are the city's ribs: they swell a beat after the lungs. */
export const ribs = [
  { layer: "sky-band-back", lag: 0.2 },
  { layer: "sky-band-middle", lag: 0.26 },
  { layer: "sky-band-front", lag: 0.32 },
] as const;

/** The CN Tower's observation pod, the city's heart. */
export const heart = { x: 779, y: 386 } as const;

/** Rooftops that exhale steam on cold days (x, roof y). */
export const chimneys = [
  [38, 446],
  [262, 473],
  [300, 473],
  [434, 535],
  [520, 568],
  [838, 590],
  [1010, 618],
  [1150, 576],
] as const;
