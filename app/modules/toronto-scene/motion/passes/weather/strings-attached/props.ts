/**
 * The prop cupboard: every puppet is painted once onto a canvas (felt fibres, blanket stitch,
 * poster paint on cardboard, crinkled foil, cotton wool, glass) and hung as an `<image>`, so
 * swinging it costs a transform, never a filter.
 */
import { seeded } from "./random";

export type Palette = "day" | "warm" | "night";
export type CloudTone = "fair" | "storm" | "snow";

export type Prop = {
  url: string;
  /** Size in artwork units. */
  width: number;
  height: number;
  /** Where the threads tie on, in artwork units from the image's top-left. */
  hooks: readonly (readonly [number, number])[];
};

/** Canvas pixels per artwork unit: enough for a 2× display at the widest slice scale. */
const density = 2;
const cache = new Map<string, Prop | null>();

type Paint = (context: CanvasRenderingContext2D, random: () => number) => Prop["hooks"];

function canPaint(): boolean {
  return (
    typeof document !== "undefined" &&
    typeof navigator !== "undefined" &&
    !navigator.userAgent.includes("jsdom")
  );
}

function paint(key: string, width: number, height: number, seed: number, draw: Paint): Prop | null {
  const cached = cache.get(key);
  if (cached !== undefined) return cached;
  let prop: Prop | null = null;
  if (canPaint()) {
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(width * density);
    canvas.height = Math.ceil(height * density);
    const context = canvas.getContext("2d");
    if (context) {
      context.scale(density, density);
      const hooks = draw(context, seeded(seed));
      prop = { url: canvas.toDataURL("image/png"), width, height, hooks };
    }
  }
  cache.set(key, prop);
  return prop;
}

const feltColours: Record<CloudTone, Record<Palette, { base: string; stitch: string }>> = {
  fair: {
    day: { base: "#efe5d3", stitch: "#b3543a" },
    warm: { base: "#f4d8c2", stitch: "#a2463a" },
    night: { base: "#41597a", stitch: "#dcc27c" },
  },
  storm: {
    day: { base: "#8f979d", stitch: "#ecdfc8" },
    warm: { base: "#9b8e93", stitch: "#f0d7bd" },
    night: { base: "#2c3c54", stitch: "#a8bccd" },
  },
  snow: {
    day: { base: "#f8f6f1", stitch: "#6c92b6" },
    warm: { base: "#fbece2", stitch: "#8b6f9e" },
    night: { base: "#8196b0", stitch: "#f1f5f8" },
  },
};

function shade(hex: string, amount: number): string {
  const value = Number.parseInt(hex.slice(1), 16);
  const channel = (shift: number) => {
    const c = (value >> shift) & 255;
    const next = amount >= 0 ? c + (255 - c) * amount : c * (1 + amount);
    return Math.round(Math.min(255, Math.max(0, next)));
  };
  return `rgb(${channel(16)} ${channel(8)} ${channel(0)})`;
}

type Puff = { x: number; y: number; r: number };

function puffTop(puffs: readonly Puff[], x: number): number {
  let top = Infinity;
  for (const { x: cx, y: cy, r } of puffs) {
    const dx = x - cx;
    if (Math.abs(dx) < r) top = Math.min(top, cy - Math.sqrt(r * r - dx * dx));
  }
  return top;
}

function puffPath(
  context: CanvasRenderingContext2D,
  puffs: readonly Puff[],
  base: number,
  inset: number,
) {
  context.beginPath();
  for (const { x, y, r } of puffs) {
    context.moveTo(x + r - inset, y);
    context.arc(x, y, Math.max(1, r - inset), 0, Math.PI * 2);
  }
  const first = puffs[0];
  const last = puffs[puffs.length - 1];
  if (first && last)
    context.rect(
      first.x,
      base - (first.r + last.r) * 0.3,
      last.x - first.x,
      (first.r + last.r) * 0.3 - inset,
    );
}

/** A felt cloud with fuzzy fibres, a pillowy underside and a blanket stitch round the edge. */
export function feltCloud(tone: CloudTone, palette: Palette, variant: number): Prop | null {
  const width = 240;
  const height = 124;
  return paint(
    `cloud-${tone}-${palette}-${variant}`,
    width,
    height,
    40 + variant * 13,
    (context, random) => {
      const { base, stitch } = feltColours[tone][palette];
      const baseline = height - 16;
      const count = 4 + Math.floor(random() * 3);
      const puffs: Puff[] = Array.from({ length: count }, (_, index) => {
        const t = index / (count - 1);
        const r = 30 + Math.sin(t * Math.PI) * 26 + random() * 10;
        return { x: 34 + t * (width - 68) + (random() - 0.5) * 10, y: baseline - r * 0.62, r };
      });

      // A soft cast shadow on the backdrop.
      context.save();
      context.translate(3, 5);
      context.fillStyle = "rgb(20 16 12 / 16%)";
      context.filter = "blur(3px)";
      puffPath(context, puffs, baseline, 0);
      context.fill();
      context.restore();

      context.save();
      puffPath(context, puffs, baseline, 0);
      const body = context.createLinearGradient(0, 10, 0, baseline);
      body.addColorStop(0, shade(base, 0.12));
      body.addColorStop(0.65, base);
      body.addColorStop(1, shade(base, -0.2));
      context.fillStyle = body;
      context.fill();
      context.clip();
      // Felt: a mat of short, crossing fibres.
      for (let index = 0; index < 1500; index++) {
        const x = random() * width;
        const y = random() * height;
        const angle = random() * Math.PI;
        const length = 1.5 + random() * 3.5;
        context.strokeStyle = random() < 0.5 ? shade(base, 0.35) : shade(base, -0.3);
        context.globalAlpha = 0.12 + random() * 0.14;
        context.lineWidth = 0.5;
        context.beginPath();
        context.moveTo(x, y);
        context.lineTo(x + Math.cos(angle) * length, y + Math.sin(angle) * length);
        context.stroke();
      }
      context.restore();

      // Stray fibres standing proud of the cut edge.
      context.save();
      context.strokeStyle = shade(base, 0.1);
      context.lineWidth = 0.5;
      for (let index = 0; index < 260; index++) {
        const puff = puffs[Math.floor(random() * puffs.length)];
        if (!puff) continue;
        const angle = Math.PI + random() * Math.PI;
        const x = puff.x + Math.cos(angle) * puff.r;
        const y = puff.y + Math.sin(angle) * puff.r;
        if (y > puffTop(puffs, x) + 1.5) continue;
        context.globalAlpha = 0.25 + random() * 0.3;
        context.beginPath();
        context.moveTo(x, y);
        context.lineTo(
          x + Math.cos(angle) * (1 + random() * 2.5),
          y + Math.sin(angle) * (1 + random() * 2.5),
        );
        context.stroke();
      }
      context.restore();

      // Blanket stitch, just inside the edge: one dashed thread along the top and the hem.
      context.save();
      context.strokeStyle = stitch;
      context.globalAlpha = 0.85;
      context.lineWidth = 1.3;
      context.lineCap = "round";
      context.setLineDash([4.5, 4]);
      context.beginPath();
      let started = false;
      for (let x = 14; x <= width - 14; x += 2) {
        const top = puffTop(puffs, x);
        if (!Number.isFinite(top)) continue;
        const y = Math.min(top + 6.5, baseline - 6);
        if (started) context.lineTo(x, y);
        else context.moveTo(x, y);
        started = true;
      }
      context.lineTo(width - 20, baseline - 6);
      context.lineTo(20, baseline - 6);
      context.closePath();
      context.stroke();
      context.restore();

      // Two brass eyelets for the bridle.
      const hookXs = [width * 0.3, width * 0.7] as const;
      return hookXs.map((x) => {
        const y = puffTop(puffs, x) + 7;
        context.save();
        context.strokeStyle = "#a8844a";
        context.fillStyle = "rgb(30 20 10 / 45%)";
        context.lineWidth = 1.6;
        context.beginPath();
        context.arc(x, y, 2.6, 0, Math.PI * 2);
        context.fill();
        context.stroke();
        context.restore();
        return [x, y] as const;
      });
    },
  );
}

/** A glass bead, drilled through, catching the light. */
export function glassBead(palette: Palette, drop = false): Prop | null {
  const width = 11;
  const height = drop ? 19 : 11;
  return paint(`bead-${palette}-${drop}`, width, height, drop ? 7 : 3, (context) => {
    const tint =
      palette === "night" ? "178 206 226" : palette === "warm" ? "196 190 208" : "150 190 214";
    const rim = palette === "night" ? "70 104 140" : "52 92 122";
    const cx = width / 2;
    const cy = drop ? height - 5.5 : height / 2;
    context.beginPath();
    if (drop) {
      context.moveTo(cx, 0.5);
      context.bezierCurveTo(cx + 1.5, 6, width - 0.5, cy - 4, width - 0.5, cy);
      context.arc(cx, cy, width / 2 - 0.5, 0, Math.PI);
      context.bezierCurveTo(0.5, cy - 4, cx - 1.5, 6, cx, 0.5);
    } else context.arc(cx, cy, width / 2 - 0.5, 0, Math.PI * 2);
    const body = context.createRadialGradient(cx - 1.6, cy - 1.8, 0.4, cx, cy, width / 2);
    body.addColorStop(0, "rgb(255 255 255 / 95%)");
    body.addColorStop(0.3, `rgb(${tint} / 62%)`);
    body.addColorStop(0.82, `rgb(${tint} / 48%)`);
    body.addColorStop(1, `rgb(${rim} / 90%)`);
    context.fillStyle = body;
    context.fill();
    context.strokeStyle = `rgb(${rim} / 70%)`;
    context.lineWidth = 0.5;
    context.stroke();
    // The thread seen through the glass, and a caustic on the far side.
    context.fillStyle = `rgb(${rim} / 38%)`;
    context.fillRect(cx - 0.35, 0, 0.7, height);
    context.fillStyle = "rgb(255 255 255 / 55%)";
    context.beginPath();
    context.ellipse(cx + 1.6, cy + 2.2, 1.4, 0.7, -0.5, 0, Math.PI * 2);
    context.fill();
    return [[cx, 0]];
  });
}

/** A tuft of cotton wool, teased into a ball. */
export function cottonBall(palette: Palette, variant: number): Prop | null {
  const size = 26;
  return paint(`cotton-${palette}-${variant}`, size, size, 90 + variant, (context, random) => {
    const tone =
      palette === "night" ? "214 224 236" : palette === "warm" ? "255 240 232" : "255 253 248";
    const shadowTone = palette === "night" ? "70 88 116" : "150 140 128";
    const c = size / 2;
    context.filter = "blur(0.6px)";
    for (let index = 0; index < 46; index++) {
      const angle = random() * Math.PI * 2;
      const distance = Math.sqrt(random()) * 6.8;
      const x = c + Math.cos(angle) * distance;
      const y = c + Math.sin(angle) * distance;
      const lower = (y - c) / 6;
      context.fillStyle = lower > 0.3 ? `rgb(${shadowTone} / 22%)` : `rgb(${tone} / 42%)`;
      context.beginPath();
      context.arc(x, y, 2.2 + random() * 3, 0, Math.PI * 2);
      context.fill();
    }
    context.filter = "none";
    context.strokeStyle = `rgb(${tone} / 55%)`;
    context.lineWidth = 0.35;
    for (let index = 0; index < 22; index++) {
      const angle = random() * Math.PI * 2;
      const from = 5 + random() * 2.5;
      const to = from + 1.5 + random() * 3;
      context.beginPath();
      context.moveTo(c + Math.cos(angle) * from, c + Math.sin(angle) * from);
      context.quadraticCurveTo(
        c + Math.cos(angle + 0.3) * to,
        c + Math.sin(angle + 0.3) * to,
        c + Math.cos(angle + 0.1) * (to + 1),
        c + Math.sin(angle + 0.1) * (to + 1),
      );
      context.stroke();
    }
    return [[c, c]];
  });
}

function sunOutline(context: CanvasRenderingContext2D, c: number, inner: number, outer: number) {
  const rays = 14;
  context.beginPath();
  for (let index = 0; index <= rays * 2; index++) {
    const angle = (index / (rays * 2)) * Math.PI * 2 - Math.PI / 2;
    const long = index % 4 === 0 ? 1 : 0.84;
    const radius = index % 2 === 0 ? outer * long : inner;
    const x = c + Math.cos(angle) * radius;
    const y = c + Math.sin(angle) * radius;
    if (index === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  }
  context.closePath();
}

function corrugation(context: CanvasRenderingContext2D, size: number, alpha: number) {
  context.strokeStyle = `rgb(90 58 28 / ${alpha})`;
  context.lineWidth = 1.1;
  for (let x = -size; x < size * 2; x += 4.5) {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x + size * 0.18, size);
    context.stroke();
  }
}

/** A cardboard sun in poster paint, with a sleepy painted face; `back` is the raw cardboard. */
export function cardboardSun(palette: Palette, back: boolean): Prop | null {
  const size = 150;
  return paint(`sun-${palette}-${back}`, size, size, 21, (context, random) => {
    const c = size / 2;
    context.save();
    context.translate(2.5, 3.5);
    context.filter = "blur(2.5px)";
    context.fillStyle = "rgb(40 24 10 / 22%)";
    sunOutline(context, c, 50, 72);
    context.fill();
    context.restore();

    sunOutline(context, c, 50, 72);
    context.save();
    context.clip();
    if (back) {
      context.fillStyle = "#b88a57";
      context.fillRect(0, 0, size, size);
      corrugation(context, size, 0.22);
      context.fillStyle = "rgb(236 222 184 / 88%)";
      context.translate(c, c);
      context.rotate(-0.35);
      context.fillRect(-34, -9, 68, 18);
      context.fillStyle = "#5a3d24";
      context.font = "italic 600 11px Georgia, serif";
      context.textAlign = "center";
      context.fillText("SUN · act II", 0, 4);
    } else {
      const paintColour = palette === "warm" ? "#f08a3c" : "#f4ae36";
      context.fillStyle = paintColour;
      context.fillRect(0, 0, size, size);
      corrugation(context, size, 0.06);
      // Brush strokes of poster paint.
      for (let index = 0; index < 90; index++) {
        const angle = random() * Math.PI * 2;
        const radius = random() * 70;
        const x = c + Math.cos(angle) * radius;
        const y = c + Math.sin(angle) * radius;
        context.strokeStyle = random() < 0.5 ? "rgb(255 214 96 / 34%)" : "rgb(224 110 36 / 22%)";
        context.lineWidth = 3 + random() * 4;
        context.lineCap = "round";
        context.beginPath();
        context.moveTo(x, y);
        context.lineTo(x + Math.cos(angle + 1.6) * 9, y + Math.sin(angle + 1.6) * 9);
        context.stroke();
      }
      // A sleepy face.
      context.strokeStyle = "#7c3a18";
      context.lineWidth = 2.6;
      context.lineCap = "round";
      for (const side of [-1, 1]) {
        context.beginPath();
        context.arc(c + side * 15, c - 5, 6.5, 0.15 * Math.PI, 0.85 * Math.PI);
        context.stroke();
      }
      context.beginPath();
      context.arc(c, c + 7, 12, 0.2 * Math.PI, 0.8 * Math.PI);
      context.stroke();
      context.fillStyle = "rgb(228 96 70 / 32%)";
      for (const side of [-1, 1]) {
        context.beginPath();
        context.arc(c + side * 25, c + 9, 6, 0, Math.PI * 2);
        context.fill();
      }
    }
    context.restore();
    // The cut edge shows the cardboard.
    sunOutline(context, c, 50, 72);
    context.strokeStyle = "#8a5c30";
    context.lineWidth = 1.6;
    context.stroke();
    // A drawing pin where the string is tied.
    context.fillStyle = "#c8321f";
    context.beginPath();
    context.arc(c, 8, 3, 0, Math.PI * 2);
    context.fill();
    return [[c, 8]];
  });
}

function crescent(context: CanvasRenderingContext2D, c: number, r: number) {
  context.beginPath();
  context.arc(c, c, r, 0.62 * Math.PI, 1.62 * Math.PI, false);
  context.arc(c + r * 0.44, c - r * 0.2, r * 0.82, 1.52 * Math.PI, 0.7 * Math.PI, true);
  context.closePath();
}

/** A crescent moon of crinkled kitchen foil; `back` is the cardboard it's wrapped round. */
export function tinfoilMoon(back: boolean): Prop | null {
  const size = 110;
  return paint(`moon-${back}`, size, size, 33, (context, random) => {
    const c = size / 2;
    const r = 48;
    context.save();
    context.translate(2, 3);
    context.filter = "blur(2px)";
    context.fillStyle = "rgb(0 0 0 / 30%)";
    crescent(context, c, r);
    context.fill();
    context.restore();
    crescent(context, c, r);
    context.save();
    context.clip();
    if (back) {
      context.fillStyle = "#a88157";
      context.fillRect(0, 0, size, size);
      corrugation(context, size, 0.2);
    } else {
      const foil = context.createLinearGradient(0, 0, size, size);
      foil.addColorStop(0, "#f2f5f7");
      foil.addColorStop(0.5, "#aeb8c1");
      foil.addColorStop(1, "#e3e8ec");
      context.fillStyle = foil;
      context.fillRect(0, 0, size, size);
      // Crinkles: facets of foil catching light at different angles.
      for (let index = 0; index < 120; index++) {
        const x = random() * size;
        const y = random() * size;
        const light = random();
        context.fillStyle =
          light > 0.6
            ? `rgb(255 255 255 / ${0.25 + random() * 0.4})`
            : `rgb(70 82 96 / ${0.12 + random() * 0.2})`;
        context.beginPath();
        context.moveTo(x, y);
        for (let corner = 0; corner < 3; corner++) {
          context.lineTo(x + (random() - 0.5) * 14, y + (random() - 0.5) * 14);
        }
        context.closePath();
        context.fill();
      }
      context.strokeStyle = "rgb(255 255 255 / 60%)";
      context.lineWidth = 0.6;
      for (let index = 0; index < 30; index++) {
        const x = random() * size;
        const y = random() * size;
        context.beginPath();
        context.moveTo(x, y);
        context.lineTo(x + (random() - 0.5) * 12, y + (random() - 0.5) * 12);
        context.lineTo(x + (random() - 0.5) * 18, y + (random() - 0.5) * 18);
        context.stroke();
      }
    }
    context.restore();
    crescent(context, c, r);
    context.strokeStyle = back ? "#c7ced4" : "rgb(90 100 112 / 70%)";
    context.lineWidth = back ? 2.2 : 0.8;
    context.stroke();
    const hookY = c - r + 7;
    const hookX = c - r * 0.34;
    return [[hookX, hookY]];
  });
}

function starOutline(context: CanvasRenderingContext2D, c: number, outer: number) {
  context.beginPath();
  for (let index = 0; index < 10; index++) {
    const angle = (index / 10) * Math.PI * 2 - Math.PI / 2;
    const radius = index % 2 === 0 ? outer : outer * 0.45;
    context.lineTo(c + Math.cos(angle) * radius, c + Math.sin(angle) * radius);
  }
  context.closePath();
}

/** A folded paper star with a crease down the middle; `back` is plain paper. */
export function paperStar(back: boolean): Prop | null {
  const size = 30;
  return paint(`star-${back}`, size, size, 55, (context, random) => {
    const c = size / 2;
    starOutline(context, c, 13.5);
    context.save();
    context.clip();
    if (back) {
      context.fillStyle = "#e9dfc6";
      context.fillRect(0, 0, size, size);
    } else {
      context.fillStyle = "#f7d56a";
      context.fillRect(0, 0, c, size);
      context.fillStyle = "#dcae43";
      context.fillRect(c, 0, c, size);
      context.fillStyle = "rgb(255 255 255 / 85%)";
      for (let index = 0; index < 9; index++) {
        context.beginPath();
        context.arc(random() * size, random() * size, 0.6, 0, Math.PI * 2);
        context.fill();
      }
    }
    context.restore();
    starOutline(context, c, 13.5);
    context.strokeStyle = back ? "#b8a47c" : "#b88a2a";
    context.lineWidth = 0.7;
    context.stroke();
    return [[c, 2]];
  });
}
