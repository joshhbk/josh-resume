/**
 * Watercolour textures painted once into canvases: rain blots, sky washes, the bleached sun, the
 * masking-fluid moon, salt stars and gouache flakes. Nothing here runs per frame.
 */

type Ctx = CanvasRenderingContext2D;

/** A tiny seeded PRNG so every visit paints the same blots. */
export function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** False in jsdom and on the server, where canvases can't paint. */
function canPaint(): boolean {
  return (
    typeof document !== "undefined" &&
    typeof navigator !== "undefined" &&
    !navigator.userAgent.includes("jsdom")
  );
}

function makeCanvas(width: number, height: number): [HTMLCanvasElement, Ctx] | null {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  return ctx ? [canvas, ctx] : null;
}

/** Traces an irregular, puddle-like blob around (cx, cy). */
function blobPath(
  ctx: Ctx,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  rand: () => number,
  lumpiness = 1,
) {
  const points = 26;
  const phases = [rand() * 6.28, rand() * 6.28, rand() * 6.28];
  const vertices = Array.from({ length: points }, (_, index) => {
    const angle = (index / points) * Math.PI * 2;
    const wobble =
      1 +
      lumpiness *
        (0.13 * Math.sin(angle * 2 + phases[0]!) +
          0.09 * Math.sin(angle * 3 + phases[1]!) +
          0.06 * Math.sin(angle * 5 + phases[2]!) +
          (rand() - 0.5) * 0.08);
    return [cx + Math.cos(angle) * rx * wobble, cy + Math.sin(angle) * ry * wobble] as const;
  });
  ctx.beginPath();
  const last = vertices[points - 1]!;
  const first = vertices[0]!;
  ctx.moveTo((last[0] + first[0]) / 2, (last[1] + first[1]) / 2);
  for (let index = 0; index < points; index += 1) {
    const current = vertices[index]!;
    const next = vertices[(index + 1) % points]!;
    ctx.quadraticCurveTo(
      current[0],
      current[1],
      (current[0] + next[0]) / 2,
      (current[1] + next[1]) / 2,
    );
  }
  ctx.closePath();
}

/**
 * Fills the current path blurred, using a far-off shadow (works in every browser, unlike
 * `ctx.filter`).
 */
function softFill(ctx: Ctx, trace: () => void, blur: number, color: string) {
  ctx.save();
  ctx.translate(-10000, 0);
  trace();
  ctx.restore();
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = blur;
  ctx.shadowOffsetX = 10000;
  ctx.fillStyle = color;
  ctx.translate(-10000, 0);
  ctx.fill();
  ctx.restore();
}

function softStroke(ctx: Ctx, trace: () => void, blur: number, width: number, color: string) {
  ctx.save();
  ctx.translate(-10000, 0);
  trace();
  ctx.restore();
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = blur;
  ctx.shadowOffsetX = 10000;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.translate(-10000, 0);
  ctx.stroke();
  ctx.restore();
}

/** Granulation: pigment settling into the paper's tooth. */
function granulate(
  ctx: Ctx,
  count: number,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  color: string,
  rand: () => number,
) {
  ctx.fillStyle = color;
  for (let index = 0; index < count; index += 1) {
    const angle = rand() * Math.PI * 2;
    const distance = Math.sqrt(rand());
    const size = 0.5 + rand() * 1.4;
    ctx.globalAlpha = 0.25 + rand() * 0.5;
    ctx.fillRect(
      cx + Math.cos(angle) * rx * distance,
      cy + Math.sin(angle) * ry * distance,
      size,
      size,
    );
  }
  ctx.globalAlpha = 1;
}

export type BlotSprites = {
  /** Full blots: a pale body with a darker dried rim. */
  blots: HTMLCanvasElement[];
  /** The tide-line rims alone, for the slower-drying stain layer. */
  rims: HTMLCanvasElement[];
};

const blotCache = new Map<string, BlotSprites>();

/** Rain blots in one ink colour, 96px square. */
export function getBlotSprites(color: string): BlotSprites | null {
  const cached = blotCache.get(color);
  if (cached) return cached;
  if (!canPaint()) return null;
  const blots: HTMLCanvasElement[] = [];
  const rims: HTMLCanvasElement[] = [];
  for (let variant = 0; variant < 6; variant += 1) {
    const size = 96;
    const blot = makeCanvas(size, size);
    const rim = makeCanvas(size, size);
    if (!blot || !rim) return null;
    const [blotCanvas, b] = blot;
    const [rimCanvas, r] = rim;
    const rand = seeded(11 + variant * 7);
    const squash = 0.8 + rand() * 0.35;
    const trace = (ctx: Ctx) => () => blobPath(ctx, 48, 48, 30, 30 * squash, seeded(90 + variant));
    b.globalAlpha = 0.55;
    softFill(b, trace(b), 5, color);
    b.globalAlpha = 0.85;
    softStroke(b, trace(b), 1.6, 2.4, color);
    granulate(b, 60, 48, 48, 28, 28 * squash, color, rand);
    b.globalAlpha = 1;
    r.globalAlpha = 0.7;
    softStroke(r, trace(r), 1.2, 1.8, color);
    blots.push(blotCanvas);
    rims.push(rimCanvas);
  }
  const sprites = { blots, rims };
  blotCache.set(color, sprites);
  return sprites;
}

let flakeCache: HTMLCanvasElement[] | null = null;

/** Gouache dabs for snow: opaque, chalky, slightly lumpy. */
export function getFlakeSprites(): HTMLCanvasElement[] | null {
  if (flakeCache) return flakeCache;
  if (!canPaint()) return null;
  const flakes: HTMLCanvasElement[] = [];
  for (let variant = 0; variant < 4; variant += 1) {
    const made = makeCanvas(24, 24);
    if (!made) return null;
    const [canvas, ctx] = made;
    const rand = seeded(300 + variant);
    softFill(ctx, () => blobPath(ctx, 12, 12, 7, 6 + rand() * 2, rand), 1.5, "#fffdf6");
    ctx.globalAlpha = 0.6;
    softFill(ctx, () => blobPath(ctx, 11, 10.5, 3.5, 3, rand), 1, "#ffffff");
    ctx.globalAlpha = 0.18;
    granulate(ctx, 10, 12, 12, 5, 5, "#b9c4cc", rand);
    flakes.push(canvas);
  }
  flakeCache = flakes;
  return flakes;
}

export type SkyTextures = {
  washesDay: string[];
  washesNight: string[];
  bleach: string;
  warmth: string;
  dryBrush: string;
  moon: string;
  salt: [string, string];
};

function paintWash(color: string, seed: number): string | null {
  const width = 460;
  const height = 230;
  const made = makeCanvas(width, height);
  if (!made) return null;
  const [canvas, ctx] = made;
  const rand = seeded(seed);
  // The wash: overlapping puddles of pigment, each drying with a faint darker edge.
  const puddles = Array.from({ length: 7 }, (_, index) => {
    const spread = index / 6 - 0.5;
    return {
      x: 230 + spread * 200 + (rand() - 0.5) * 30,
      y: 122 - (1 - Math.abs(spread) * 1.6) * 24 + (rand() - 0.5) * 14,
      rx: (52 + rand() * 30) * (1 - Math.abs(spread) * 0.5),
      ry: (28 + rand() * 16) * (1 - Math.abs(spread) * 0.4),
      shape: 900 + seed * 11 + index,
    };
  });
  for (const puddle of puddles) {
    const trace = () =>
      blobPath(ctx, puddle.x, puddle.y, puddle.rx, puddle.ry, seeded(puddle.shape), 1.6);
    ctx.globalAlpha = 0.2 + rand() * 0.14;
    softFill(ctx, trace, 14, color);
    ctx.globalAlpha = 0.16;
    softStroke(ctx, trace, 3, 2, color);
  }
  // Back-runs: water creeping into drying pigment leaves pale cauliflower edges.
  for (let cluster = 0; cluster < 2; cluster += 1) {
    const cx = 150 + rand() * 160;
    const cy = 105 + rand() * 25;
    for (let lobe = 0; lobe < 4; lobe += 1) {
      const lx = cx + (rand() - 0.5) * 40;
      const ly = cy + (rand() - 0.5) * 16;
      const r = 8 + rand() * 10;
      const shape = seed * 31 + cluster * 7 + lobe;
      const trace = () => blobPath(ctx, lx, ly, r, r * 0.7, seeded(shape), 1.8);
      ctx.globalCompositeOperation = "destination-out";
      ctx.globalAlpha = 0.28;
      softFill(ctx, trace, 3, "#000");
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 0.2;
      softStroke(ctx, trace, 1.2, 1.2, color);
    }
  }
  ctx.globalAlpha = 0.22;
  granulate(ctx, 320, 230, 118, 170, 55, color, rand);
  return canvas.toDataURL("image/png");
}

function paintBleach(): string | null {
  const made = makeCanvas(220, 220);
  if (!made) return null;
  const [canvas, ctx] = made;
  const rand = seeded(71);
  const trace = () => blobPath(ctx, 110, 110, 64, 60, seeded(72));
  ctx.globalAlpha = 0.85;
  softFill(ctx, trace, 22, "#fffaf0");
  ctx.globalAlpha = 0.6;
  softFill(ctx, () => blobPath(ctx, 106, 106, 34, 32, rand), 10, "#ffffff");
  // The tide ring left where the tissue lifted the pigment.
  ctx.globalAlpha = 0.16;
  softStroke(ctx, trace, 3, 3, "#b98a5a");
  return canvas.toDataURL("image/png");
}

function paintWarmth(): string | null {
  const made = makeCanvas(260, 260);
  if (!made) return null;
  const [canvas, ctx] = made;
  const rand = seeded(81);
  ctx.globalAlpha = 0.5;
  softFill(ctx, () => blobPath(ctx, 130, 130, 92, 84, rand), 34, "#f39a62");
  ctx.globalAlpha = 0.35;
  softFill(ctx, () => blobPath(ctx, 130, 126, 60, 56, rand), 20, "#ffc27a");
  return canvas.toDataURL("image/png");
}

function paintDryBrush(): string | null {
  const made = makeCanvas(640, 170);
  if (!made) return null;
  const [canvas, ctx] = made;
  const rand = seeded(91);
  ctx.fillStyle = "#f3b76a";
  for (let stroke = 0; stroke < 26; stroke += 1) {
    const y = 12 + rand() * 146;
    const start = rand() * 260;
    const length = 180 + rand() * 360;
    const thickness = 2 + rand() * 5;
    // A dry brush skips across the paper's tooth, leaving broken bristle marks.
    for (let x = start; x < Math.min(640, start + length); x += 2 + rand() * 3) {
      if (rand() < 0.32) continue;
      const fade = 1 - Math.abs((x - start) / length - 0.5) * 2;
      ctx.globalAlpha = (0.18 + rand() * 0.4) * fade;
      ctx.fillRect(x, y + (rand() - 0.5) * 2, 2 + rand() * 4, thickness * (0.4 + rand() * 0.6));
    }
  }
  return canvas.toDataURL("image/png");
}

function paintMoon(): string | null {
  const made = makeCanvas(96, 96);
  if (!made) return null;
  const [canvas, ctx] = made;
  const rand = seeded(101);
  // Masking fluid: a crisp, slightly lumpy white disc with a grey lifted edge.
  blobPath(ctx, 48, 48, 34, 34, rand, 0.3);
  ctx.fillStyle = "#faf5e8";
  ctx.fill();
  ctx.lineWidth = 1.4;
  ctx.strokeStyle = "rgb(120 128 140 / 45%)";
  ctx.stroke();
  granulate(ctx, 50, 48, 48, 26, 26, "#d9d2c0", rand);
  return canvas.toDataURL("image/png");
}

function paintSalt(seed: number): string | null {
  const width = 768;
  const height = 260;
  const made = makeCanvas(width, height);
  if (!made) return null;
  const [canvas, ctx] = made;
  const rand = seeded(seed);
  // Salt crystals drink the wet wash and leave pale starbursts.
  for (let crystal = 0; crystal < 64; crystal += 1) {
    const x = rand() * width;
    const y = rand() * height * (0.4 + rand() * 0.6);
    const radius = 0.8 + rand() ** 4 * 4.5;
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius * 2.2);
    gradient.addColorStop(0, "rgb(236 242 255 / 75%)");
    gradient.addColorStop(0.45, "rgb(214 226 250 / 30%)");
    gradient.addColorStop(1, "rgb(214 226 250 / 0%)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, radius * 2.2, 0, Math.PI * 2);
    ctx.fill();
    if (radius > 2.4) {
      ctx.strokeStyle = "rgb(230 238 255 / 35%)";
      ctx.lineWidth = 0.7;
      const rays = 5 + Math.floor(rand() * 4);
      for (let ray = 0; ray < rays; ray += 1) {
        const angle = rand() * Math.PI * 2;
        const reach = radius * (1.8 + rand() * 1.8);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(angle) * reach, y + Math.sin(angle) * reach);
        ctx.stroke();
      }
    }
  }
  return canvas.toDataURL("image/png");
}

let skyCache: SkyTextures | null = null;

export function getSkyTextures(): SkyTextures | null {
  if (skyCache) return skyCache;
  if (!canPaint()) return null;
  const washesDay = [0, 1, 2, 3].map((variant) => paintWash("#5f7389", 500 + variant * 13));
  const washesNight = [0, 1, 2, 3].map((variant) => paintWash("#0a1630", 500 + variant * 13));
  const bleach = paintBleach();
  const warmth = paintWarmth();
  const dryBrush = paintDryBrush();
  const moon = paintMoon();
  const saltA = paintSalt(701);
  const saltB = paintSalt(702);
  if (!bleach || !warmth || !dryBrush || !moon || !saltA || !saltB) return null;
  const day = washesDay.filter((wash) => wash !== null);
  const night = washesNight.filter((wash) => wash !== null);
  if (day.length !== 4 || night.length !== 4) return null;
  skyCache = {
    washesDay: day,
    washesNight: night,
    bleach,
    warmth,
    dryBrush,
    moon,
    salt: [saltA, saltB],
  };
  return skyCache;
}
