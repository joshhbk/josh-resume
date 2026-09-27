/** A rectangle in the artwork's 1536×1024 space. */
export type Box = { x0: number; y0: number; x1: number; y1: number };

/** A damped spring: natural frequency in Hz and damping ratio (0 = rings forever, 1 = critical). */
export type Spring = { hz: number; zeta: number };

/**
 * One paper sheet mounted on springs. Each sheet has up to four degrees of freedom:
 * sideways and vertical travel, a lean (a shear about its base, so tall sheets whip at the tip)
 * and a squash (a vertical stretch about its base, so it bounces like a stand-up cutout).
 */
export type BodySpec = {
  id: string;
  /** `data-scene-layer` values that move together as this sheet. */
  layers: readonly string[];
  /**
   * `translate` for sheets whose stylesheet already owns `transform` (the sky, land and water
   * planes carry the parallax custom properties); `transform` for every other sheet.
   */
  write: "translate" | "transform";
  /** The sheet's footprint, used to measure how close the cursor or a shockwave is. */
  box: Box;
  /** The mounting point: lean and squash pivot here. */
  origin: readonly [number, number];
  mass: number;
  travel: Spring;
  lean?: Spring;
  squash?: Spring;
  /** Visual limits (soft-clamped): travel in artwork units, lean as tip shift per unit height. */
  limits: { x: number; y: number; lean?: number; squash?: number };
  /** How strongly steady wind and gusts lean or push the sheet. */
  wind: number;
  /** How much a sideways force turns into lean rather than travel. */
  leanGain?: number;
  /** Planes follow the cursor like the original parallax, on a spring: range in artwork units. */
  parallax?: readonly [number, number];
  /** Whether the sheet can be grabbed and plucked. */
  pluck: boolean;
};

/** Neighbouring sheets are tied by a weak spring, so a jiggle travels along the skyline. */
export const couplings: readonly (readonly [string, string])[] = [
  ["buildings-left", "buildings-center"],
  ["buildings-center", "buildings-right"],
  ["buildings-center", "tower"],
  ["clouds-back", "clouds-front"],
  ["water", "water-marks"],
];

export const bodies: readonly BodySpec[] = [
  {
    id: "sky",
    layers: ["sky"],
    write: "translate",
    box: { x0: 0, y0: 0, x1: 1536, y1: 560 },
    origin: [768, 280],
    mass: 5,
    travel: { hz: 1.1, zeta: 0.45 },
    limits: { x: 14, y: 10 },
    wind: 0,
    parallax: [3, 2],
    pluck: false,
  },
  {
    id: "clouds-back",
    layers: ["clouds-back"],
    write: "transform",
    box: { x0: 0, y0: 180, x1: 1536, y1: 340 },
    origin: [768, 320],
    mass: 0.7,
    travel: { hz: 0.62, zeta: 0.16 },
    squash: { hz: 1.3, zeta: 0.14 },
    limits: { x: 42, y: 22, squash: 0.14 },
    wind: 0.9,
    pluck: true,
  },
  {
    id: "clouds-front",
    layers: ["clouds-front"],
    write: "transform",
    box: { x0: 0, y0: 340, x1: 1536, y1: 490 },
    origin: [768, 470],
    mass: 0.8,
    travel: { hz: 0.54, zeta: 0.15 },
    squash: { hz: 1.1, zeta: 0.14 },
    limits: { x: 48, y: 24, squash: 0.14 },
    wind: 1,
    pluck: true,
  },
  {
    id: "sun",
    layers: ["sun"],
    write: "transform",
    box: { x0: 1167, y0: 157, x1: 1333, y1: 323 },
    origin: [1250, 240],
    mass: 0.45,
    travel: { hz: 1.7, zeta: 0.14 },
    squash: { hz: 2.6, zeta: 0.1 },
    limits: { x: 34, y: 34, squash: 0.18 },
    wind: 0,
    pluck: true,
  },
  {
    id: "moon",
    layers: ["moon-aura", "moon"],
    write: "transform",
    box: { x0: 911, y0: 186, x1: 1019, y1: 294 },
    origin: [965, 240],
    mass: 0.35,
    travel: { hz: 1.9, zeta: 0.12 },
    squash: { hz: 2.8, zeta: 0.1 },
    limits: { x: 34, y: 34, squash: 0.2 },
    wind: 0,
    pluck: true,
  },
  {
    id: "stars",
    layers: ["stars"],
    write: "transform",
    box: { x0: 100, y0: 70, x1: 1480, y1: 320 },
    origin: [768, 190],
    mass: 0.3,
    travel: { hz: 2.6, zeta: 0.1 },
    limits: { x: 12, y: 12 },
    wind: 0,
    pluck: false,
  },
  {
    id: "land",
    layers: ["land"],
    write: "translate",
    box: { x0: 0, y0: 440, x1: 1536, y1: 945 },
    origin: [768, 900],
    mass: 6,
    travel: { hz: 1.35, zeta: 0.32 },
    limits: { x: 30, y: 16 },
    wind: 0,
    parallax: [16, 8],
    pluck: false,
  },
  {
    id: "buildings-left",
    layers: ["buildings-left"],
    write: "transform",
    box: { x0: 0, y0: 448, x1: 750, y1: 800 },
    origin: [375, 815],
    mass: 2.4,
    travel: { hz: 1.6, zeta: 0.16 },
    lean: { hz: 1.45, zeta: 0.1 },
    squash: { hz: 2.5, zeta: 0.13 },
    limits: { x: 18, y: 14, lean: 0.075, squash: 0.06 },
    wind: 0.45,
    leanGain: 0.7,
    pluck: true,
  },
  {
    id: "buildings-right",
    layers: ["buildings-right"],
    write: "transform",
    box: { x0: 870, y0: 575, x1: 1536, y1: 800 },
    origin: [1200, 815],
    mass: 2.2,
    travel: { hz: 1.7, zeta: 0.16 },
    lean: { hz: 1.6, zeta: 0.1 },
    squash: { hz: 2.7, zeta: 0.13 },
    limits: { x: 18, y: 14, lean: 0.09, squash: 0.06 },
    wind: 0.45,
    leanGain: 0.7,
    pluck: true,
  },
  {
    id: "tower",
    layers: ["tower"],
    write: "transform",
    box: { x0: 758, y0: 110, x1: 812, y1: 596 },
    origin: [785, 600],
    mass: 0.8,
    travel: { hz: 2.4, zeta: 0.3 },
    lean: { hz: 0.72, zeta: 0.045 },
    squash: { hz: 3, zeta: 0.12 },
    limits: { x: 12, y: 4, lean: 0.15, squash: 0.05 },
    wind: 1.4,
    leanGain: 1,
    pluck: true,
  },
  {
    id: "buildings-center",
    layers: ["buildings-center"],
    write: "transform",
    box: { x0: 749, y0: 589, x1: 870, y1: 800 },
    origin: [810, 815],
    mass: 1.3,
    travel: { hz: 2.2, zeta: 0.14 },
    lean: { hz: 2.1, zeta: 0.09 },
    squash: { hz: 3.2, zeta: 0.12 },
    limits: { x: 12, y: 10, lean: 0.1, squash: 0.07 },
    wind: 0.6,
    leanGain: 0.7,
    pluck: true,
  },
  {
    id: "trees",
    layers: ["trees"],
    write: "transform",
    box: { x0: 0, y0: 760, x1: 1536, y1: 870 },
    origin: [768, 905],
    mass: 0.7,
    travel: { hz: 2.8, zeta: 0.2 },
    lean: { hz: 2.3, zeta: 0.08 },
    squash: { hz: 3.6, zeta: 0.1 },
    limits: { x: 10, y: 10, lean: 0.14, squash: 0.09 },
    wind: 1.2,
    leanGain: 1,
    pluck: true,
  },
  {
    id: "shore",
    layers: ["shore"],
    write: "transform",
    box: { x0: 0, y0: 900, x1: 1536, y1: 945 },
    origin: [768, 945],
    mass: 1.6,
    travel: { hz: 3, zeta: 0.34 },
    limits: { x: 6, y: 6 },
    wind: 0,
    pluck: false,
  },
  {
    id: "water",
    layers: ["water"],
    write: "translate",
    box: { x0: 0, y0: 941, x1: 1536, y1: 1024 },
    origin: [768, 1000],
    mass: 4,
    travel: { hz: 0.5, zeta: 0.11 },
    limits: { x: 30, y: 16 },
    wind: 0.5,
    parallax: [33, 17],
    pluck: false,
  },
  {
    id: "water-marks",
    layers: ["water-marks"],
    write: "transform",
    box: { x0: 0, y0: 950, x1: 1536, y1: 1024 },
    origin: [768, 990],
    mass: 1,
    travel: { hz: 1.05, zeta: 0.07 },
    limits: { x: 28, y: 6 },
    wind: 0.8,
    pluck: false,
  },
  {
    id: "water-glints",
    layers: ["water-glints"],
    write: "transform",
    box: { x0: 0, y0: 960, x1: 1536, y1: 1024 },
    origin: [768, 990],
    mass: 0.8,
    travel: { hz: 1.4, zeta: 0.09 },
    limits: { x: 24, y: 5 },
    wind: 0.6,
    pluck: false,
  },
];
