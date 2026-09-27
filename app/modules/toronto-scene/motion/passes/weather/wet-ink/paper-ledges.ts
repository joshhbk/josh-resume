/**
 * Where snow can settle, measured from the artwork (1536×1024 space). Roofs were traced from the
 * keyed building silhouettes of the day skyline; the shore edge is the top of its paper cutout.
 */

/** Flat roof ledges: [x1, x2, y]. */
export const roofs: readonly (readonly [number, number, number])[] = [
  [0, 36, 448],
  [36, 72, 451],
  [108, 152, 607],
  [152, 200, 587],
  [220, 300, 475],
  [308, 320, 475],
  [332, 372, 578],
  [392, 476, 537],
  [480, 564, 570],
  [564, 640, 594],
  [644, 684, 616],
  [696, 720, 646],
  [746, 811, 372],
  [765, 792, 342],
  [812, 868, 592],
  [880, 896, 672],
  [900, 924, 662],
  [964, 1084, 620],
  [1084, 1104, 635],
  [1120, 1172, 578],
  [1172, 1192, 607],
  [1216, 1228, 676],
  [1236, 1256, 590],
  [1280, 1296, 590],
  [1344, 1404, 706],
];

/** The top edge of the shore cutout. */
export const shoreEdge =
  "M0 910q92-9 181 3 96-12 190 2 119-14 231 1 129-12 243 0 105-13 212-2 113-12 227 2 128-11 252 0";

/** The lake's surface starts here. */
export const waterLine = 945;

/** Rough height of the tree canopy at art x, for where falling flakes come to rest. */
export function canopyAt(x: number): number {
  const u = Math.max(0, x) / 34;
  const index = Math.floor(u);
  const t = u - index;
  const a = canopyNoise[index % canopyNoise.length] ?? 0;
  const b = canopyNoise[(index + 1) % canopyNoise.length] ?? 0;
  const eased = (1 - Math.cos(t * Math.PI)) / 2;
  return 738 + (a + (b - a) * eased) * 34;
}

/** Fixed 0–1 heights of the tree crowns, one every 34 units. */
const canopyNoise = Array.from({ length: 48 }, (_, index) => {
  const hash = Math.sin(index * 127.1 + 311.7) * 43758.5453;
  return hash - Math.floor(hash);
});

/** The highest roof under art x, or null if there's only sky down to the trees. */
export function roofAt(x: number): number | null {
  let best: number | null = null;
  for (const [x1, x2, y] of roofs) {
    if (x >= x1 && x <= x2 && (best === null || y < best)) best = y;
  }
  return best;
}

/**
 * The tree crown under art x that holds snow, or null between crowns (a flake there slips
 * through the leaves). Crowns sit every 34 units; about a third of them stay bare.
 */
export function crownAt(x: number): { x: number; y: number } | null {
  const index = Math.round(Math.max(0, x) / 34);
  const noise = canopyNoise[(index * 7) % canopyNoise.length] ?? 0;
  if (noise < 0.33) return null;
  const centre = index * 34 + (noise - 0.5) * 10;
  const reach = 9 + noise * 8;
  if (Math.abs(x - centre) > reach) return null;
  const falloff = (x - centre) / reach;
  return { x: centre, y: canopyAt(centre) + falloff * falloff * 7 };
}
