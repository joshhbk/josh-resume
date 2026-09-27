/**
 * The skyline as height fields: for every 4-unit column of the 1536×1024 artwork, the y of the
 * first surface a falling particle meets. Built from the same cutout outlines the artwork clips
 * its paper sheets with (see toronto-skyline-art.tsx), so rain and snow land on the real roofs.
 */

export const columnWidth = 4;
export const columnCount = 1536 / columnWidth;

// The cutout outlines, copied from the artwork's clip paths.
const leftBuildings =
  "M0 448h70v143h34v16h49v-20h50V505h7v-30h107v12h12v91h58v-38h10v-61h8v60h73v31h83v24h77v17h47v35h33v38h31v166H0Z";
const rightBuildings =
  "M870 591h2v75h29v-18h27v-6h34v-22h147v36h12v-78h69v143h28v-120h11v-11h25l8 10 8-10h24v150h29v-34h79v39h36v-12h67v63h77v-48h75v102H870Z";
const centerBuildings = "M749 589h56v3h64v260H749Z";
const tower =
  "M780 110h2v24l2 4v30l2 4v39l2 4v28l3 4v11l-2 4v79l5 3 2 12 6 3 6 8 3 11v15l-3 10-5 7-7 3 3 180h-40l4-180-8-3-6-7-3-10v-15l3-11 6-8 7-3 2-12 8-3v-79l-3-4v-11l3-4v-28l2-4v-39l2-4v-30l2-4Z";
const trees =
  "M0 797q24-34 51-12 24-39 55-9 25-40 62-6 29-40 62-7 31-40 63-8 34-37 67-5 27-37 63-4 33-35 67-3 33-39 67-3 30-37 64 0 31-35 66-2 31-37 64-1 33-39 68-2 31-35 66 0 34-37 67 0 32-36 65-1 31-37 66-1 31-35 66 1 31-36 64 1 32-32 64 3 32-35 65 4 34-34 68 5 33-34 67 5v198H0Z";
const shore =
  "M0 910q92-9 181 3 96-12 190 2 119-14 231 1 129-12 243 0 105-13 212-2 113-12 227 2 128-11 252 0v36H0Z";
const water =
  "M0 941q111 4 221 0 112-4 225 1 108 4 215-1 121-5 238 0 111 5 218 0 118-5 229 1 95 5 190 0v82H0Z";

type Point = readonly [number, number];

/** Flattens the subset of SVG path syntax the outlines use (M, H, V, h, v, l, q, Z) to points. */
export function outline(d: string): Point[] {
  const tokens = d.match(/[MHVZhvlqz]|-?\d*\.?\d+/g) ?? [];
  const points: Point[] = [];
  let x = 0;
  let y = 0;
  let command = "M";
  let index = 0;
  const next = () => Number(tokens[index++]);
  while (index < tokens.length) {
    const token = tokens[index] ?? "";
    if (/[A-Za-z]/.test(token)) {
      command = token;
      index++;
      if (command === "Z" || command === "z") continue;
    }
    switch (command) {
      case "M":
        x = next();
        y = next();
        break;
      case "H":
        x = next();
        break;
      case "V":
        y = next();
        break;
      case "h":
        x += next();
        break;
      case "v":
        y += next();
        break;
      case "l":
        x += next();
        y += next();
        break;
      case "q": {
        const cx = x + next();
        const cy = y + next();
        const ex = x + next();
        const ey = y + next();
        for (let step = 1; step <= 4; step++) {
          const t = step / 4;
          const u = 1 - t;
          points.push([
            u * u * x + 2 * u * t * cx + t * t * ex,
            u * u * y + 2 * u * t * cy + t * t * ey,
          ]);
        }
        x = ex;
        y = ey;
        continue;
      }
      default:
        index++;
        continue;
    }
    points.push([x, y]);
  }
  return points;
}

/** The top edge of one or more closed outlines, per column (Infinity where there is none). */
export function topEdge(paths: readonly string[], maxY = Infinity): Float32Array {
  const top = new Float32Array(columnCount).fill(Infinity);
  for (const d of paths) addTopEdge(top, outline(d), maxY);
  return top;
}

/** Lowers `top` wherever the closed polygon `points` reaches higher. */
function addTopEdge(top: Float32Array, points: readonly Point[], maxY: number): void {
  points.forEach((from, index) => {
    const to = points[(index + 1) % points.length];
    if (!to || from[0] === to[0]) return;
    const [x0, y0, x1, y1] = from[0] < to[0] ? [...from, ...to] : [...to, ...from];
    const first = Math.max(0, Math.ceil(x0 / columnWidth - 0.5));
    const last = Math.min(columnCount - 1, Math.floor(x1 / columnWidth - 0.5));
    for (let column = first; column <= last; column++) {
      const cx = (column + 0.5) * columnWidth;
      const y = y0 + ((cx - x0) / (x1 - x0)) * (y1 - y0);
      if (y < (top[column] ?? Infinity) && y < maxY) top[column] = y;
    }
  });
}

/** A 2D affine matrix (a, b, c, d, e, f), as in DOMMatrix. */
export type Affine = readonly [number, number, number, number, number, number];

export type Skyline = {
  /** Buildings and the tower. */
  city: Float32Array;
  /** Buildings only; the tower is added on top wherever its sheet currently stands. */
  buildings: Float32Array;
  towerOutline: readonly Point[];
  trees: Float32Array;
  shore: Float32Array;
  water: Float32Array;
  /** The nearest surface from the sky: the city, or the trees where there is no city. */
  roof: Float32Array;
  /** The roofline without the tower: the ledges snow can sit on. */
  ledge: Float32Array;
  /** Whether a column's roof is flat enough to hold snow. */
  flat: Uint8Array;
  /** The crowns of the tree bumps, where snow can cap the canopy. */
  crowns: Uint8Array;
};

export function buildSkyline(): Skyline {
  const buildings = topEdge([leftBuildings, rightBuildings, centerBuildings], 700);
  const towerOutline = outline(tower);
  const city = buildings.slice();
  addTopEdge(city, towerOutline, 596);
  const treeTop = topEdge([trees]);
  const roof = new Float32Array(columnCount);
  for (let column = 0; column < columnCount; column++) {
    roof[column] = Math.min(city[column] ?? Infinity, treeTop[column] ?? Infinity);
  }
  const ledge = new Float32Array(columnCount);
  for (let column = 0; column < columnCount; column++) {
    ledge[column] = Math.min(buildings[column] ?? Infinity, treeTop[column] ?? Infinity);
  }
  const flat = new Uint8Array(columnCount);
  for (let column = 1; column < columnCount - 1; column++) {
    const here = ledge[column] ?? 0;
    flat[column] =
      Math.abs((ledge[column - 1] ?? 0) - here) < 3.5 &&
      Math.abs((ledge[column + 1] ?? 0) - here) < 3.5
        ? 1
        : 0;
  }
  const crowns = new Uint8Array(columnCount);
  for (let column = 1; column < columnCount - 1; column++) {
    const here = treeTop[column] ?? 0;
    crowns[column] =
      Math.abs((treeTop[column - 1] ?? 0) - here) < 2.4 &&
      Math.abs((treeTop[column + 1] ?? 0) - here) < 2.4
        ? 1
        : 0;
  }
  return {
    crowns,
    city,
    buildings,
    towerOutline,
    trees: treeTop,
    shore: topEdge([shore]),
    water: topEdge([water]),
    roof,
    ledge,
    flat,
  };
}

export const columnAt = (x: number) =>
  Math.min(columnCount - 1, Math.max(0, Math.floor(x / columnWidth)));

/**
 * Re-stands the tower where its sheet has been moved to (another pass may lean or shift it), so
 * rain keeps landing on it and clouds keep passing behind it. `matrix` maps the tower's artwork
 * coordinates into the land sheet's.
 */
export function placeTower(sky: Skyline, matrix: Affine): void {
  const [a, b, c, d, e, f] = matrix;
  const moved = sky.towerOutline.map(([x, y]): Point => {
    const clampedY = Math.min(y, 596);
    return [a * x + c * clampedY + e, b * x + d * clampedY + f];
  });
  sky.city.set(sky.buildings);
  addTopEdge(sky.city, moved, 594);
  for (let column = 0; column < columnCount; column++) {
    sky.roof[column] = Math.min(sky.city[column] ?? Infinity, sky.trees[column] ?? Infinity);
  }
}
