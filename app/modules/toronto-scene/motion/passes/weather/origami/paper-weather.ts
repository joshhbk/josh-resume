import type { DayPhase, Weather } from "../../../../scene-provider";

/**
 * The falling-paper simulation for origami weather, in the artwork's 1536×1024 space: folded
 * rain strips and paper darts that crumple on the lake, and hole-punch snow that flips as it
 * falls and settles in drifts on the shore and the centre roof.
 */

export type PaperConditions = {
  phase: DayPhase;
  weather: Weather;
  /** 0–1 rain strength. */
  rain: number;
  /** 0–1 cloud cover. */
  cloud: number;
  /** -1 to 1. */
  wind: number;
  /** Small screens get fewer pieces. */
  compact: boolean;
};

type Settle = "water" | "roof" | "shore" | "fade";

type Faller = {
  kind: "strip" | "dart" | "disc";
  near: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  angle: number;
  spin: number;
  flip: number;
  flipSpeed: number;
  sway: number;
  swayRate: number;
  born: number;
  dying: number | null;
  settle: Settle;
  /** Where a `water`, `shore` or `fade` piece stops. */
  end: number;
};

type Crumple = { x: number; y: number; size: number; born: number; radii: number[]; turn: number };

type Settled = {
  x: number;
  y: number;
  r: number;
  tilt: number;
  bright: boolean;
  melt: number | null;
};

const rainPalette: Record<DayPhase, { face: string; back: string; ripple: string }> = {
  dawn: { face: "#cbc2d3", back: "#8f88a6", ripple: "rgb(255 236 222 / 70%)" },
  day: { face: "#b3cbd6", back: "#6c8c9f", ripple: "rgb(240 250 246 / 70%)" },
  dusk: { face: "#c9adb1", back: "#8a6d7c", ripple: "rgb(255 226 206 / 65%)" },
  night: { face: "#cfdee6", back: "#7890a2", ripple: "rgb(214 232 244 / 55%)" },
};

type SnowPalette = { bright: string; grey: string; edge: string };

/** The punched discs get a faint cut edge so they still read against pale paper skies. */
const snowPalette: Record<DayPhase, SnowPalette> = {
  dawn: { bright: "#fff7f1", grey: "#c9b3b3", edge: "rgb(120 76 70 / 45%)" },
  day: { bright: "#ffffff", grey: "#b9c1ca", edge: "rgb(64 82 100 / 45%)" },
  dusk: { bright: "#fff0e6", grey: "#b39597", edge: "rgb(96 56 60 / 45%)" },
  night: { bright: "#eef4f8", grey: "#8292a6", edge: "rgb(10 20 40 / 40%)" },
};

/**
 * Roofs snow can settle on: [left, right, y]. Only the centre block's painted roof edge; the other
 * cut-outs' clip paths sit above their keyed-out art, so drifts there would float in the sky.
 */
const roofs: readonly (readonly [number, number, number])[] = [
  [749, 776, 589],
  [792, 870, 589],
];

const shoreY = 907;
const waterTop = 952;
const waterDepth = 58;

function roofAt(x: number): number | undefined {
  // Keep a little off each edge so discs sit on the roof rather than hanging off it.
  const roof = roofs.find(([left, right]) => x >= left + 2 && x <= right - 2);
  return roof?.[2];
}

const random = (min: number, max: number) => min + Math.random() * (max - min);
const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

function easeOutBack(t: number): number {
  const c = 1.7;
  return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2;
}

export class PaperWeather {
  private time = 0;
  private fallers: Faller[] = [];
  private crumples: Crumple[] = [];
  private settled: Settled[] = [];
  private stacks = new Map<string, number>();
  private conditions: PaperConditions | null = null;

  /** Applies new conditions. A weather change folds the old pieces away and unfolds new ones. */
  setConditions(next: PaperConditions): void {
    const previous = this.conditions;
    this.conditions = next;
    if (previous?.weather === next.weather) return;
    for (const faller of this.fallers) faller.dying ??= this.time;
    if (next.weather !== "snow") {
      for (const disc of this.settled) disc.melt ??= this.time + Math.random() * 0.8;
    }
    // Unfold the new weather across the whole sky at once, so the switch reads as a moment.
    const { near, far } = this.targets();
    for (let index = 0; index < near + far; index += 1) {
      this.spawn(index < near, random(-40, 880), this.time + random(0, 0.7));
    }
  }

  /** Runs the simulation forward without drawing, e.g. to show settled drifts in a still frame. */
  prefill(seconds: number): void {
    for (let elapsed = 0; elapsed < seconds; elapsed += 1 / 30) this.step(1 / 30);
    for (const faller of this.fallers) faller.born = Math.min(faller.born, this.time - 1);
  }

  private targets(): { near: number; far: number } {
    const conditions = this.conditions;
    if (!conditions) return { near: 0, far: 0 };
    const share = conditions.compact ? 0.5 : 1;
    if (conditions.weather === "rain") {
      return {
        near: Math.round((30 + 60 * conditions.rain) * share),
        far: Math.round((26 + 50 * conditions.rain) * share),
      };
    }
    if (conditions.weather === "snow") {
      return {
        near: Math.round((84 + 30 * conditions.cloud) * share),
        far: Math.round((70 + 30 * conditions.cloud) * share),
      };
    }
    return { near: 0, far: 0 };
  }

  private spawn(near: boolean, y: number, born: number): void {
    const conditions = this.conditions;
    if (!conditions) return;
    const x = random(-40, 1576);
    if (conditions.weather === "rain") {
      const dart = Math.random() < 0.42;
      this.fallers.push({
        kind: dart ? "dart" : "strip",
        near,
        x,
        y,
        vx: 0,
        vy: near ? random(520, 700) : random(360, 470),
        size: near ? random(5, 7.4) : random(2.8, 3.9),
        angle: random(0, Math.PI * 2),
        spin: dart ? 0 : random(3, 7) * (Math.random() < 0.5 ? -1 : 1),
        flip: random(0, Math.PI * 2),
        flipSpeed: random(6, 12),
        sway: 0,
        swayRate: 0,
        born,
        dying: null,
        settle: near ? "water" : "fade",
        end: near ? waterTop + random(0, waterDepth) : random(640, 900),
      });
      return;
    }
    const settle: Settle = !near ? "fade" : Math.random() < 0.5 ? "roof" : "shore";
    this.fallers.push({
      kind: "disc",
      near,
      x,
      y,
      vx: 0,
      vy: near ? random(58, 92) : random(30, 50),
      size: near ? random(3.2, 4.8) : random(1.7, 2.6),
      angle: random(0, Math.PI * 2),
      spin: random(0.4, 1.4) * (Math.random() < 0.5 ? -1 : 1),
      flip: random(0, Math.PI * 2),
      flipSpeed: random(2, 5),
      sway: random(14, 30),
      swayRate: random(0.6, 1.1),
      born,
      dying: null,
      settle,
      end: settle === "fade" ? random(600, 880) : shoreY + random(-2, 7),
    });
  }

  private settle(faller: Faller, surface: number): void {
    const bin = `${Math.round(faller.x / 7)}:${surface}`;
    const height = this.stacks.get(bin) ?? 0;
    this.stacks.set(bin, Math.min(11, height + faller.size * 0.55));
    this.settled.push({
      x: faller.x,
      y: surface - height - faller.size * 0.3,
      r: faller.size,
      tilt: random(-0.25, 0.25),
      bright: Math.random() < 0.72,
      melt: null,
    });
    if (this.settled.length > 460) this.settled.shift();
  }

  step(dt: number): void {
    const conditions = this.conditions;
    if (!conditions) return;
    this.time += dt;
    const t = this.time;
    const { wind } = conditions;
    const snowing = conditions.weather === "snow";

    const alive = { near: 0, far: 0 };
    this.fallers = this.fallers.filter((faller) => {
      if (faller.dying !== null && t - faller.dying > 0.45) return false;
      const previousY = faller.y;
      const windPush =
        faller.kind === "disc" ? wind * (faller.near ? 70 : 45) : wind * (faller.near ? 190 : 130);
      const sway =
        faller.sway * Math.sin(t * faller.swayRate * Math.PI * 2 + faller.angle) * faller.swayRate;
      faller.x += (windPush + sway) * dt;
      faller.y += faller.vy * dt;
      faller.angle +=
        faller.spin * (1 + Math.abs(wind)) * dt + (faller.dying === null ? 0 : 9 * dt);
      faller.flip += faller.flipSpeed * (1 + Math.abs(wind) * 0.6) * dt;
      faller.vx = windPush + sway;
      if (faller.x < -60) faller.x += 1656;
      if (faller.x > 1596) faller.x -= 1656;

      if (faller.dying === null) {
        if (faller.settle === "roof") {
          const roof = roofAt(faller.x);
          if (roof !== undefined && previousY < roof && faller.y >= roof) {
            this.settle(faller, roof);
            return false;
          }
          if (faller.y >= shoreY) {
            this.settle(faller, shoreY);
            return false;
          }
        } else if (faller.y >= faller.end) {
          if (faller.settle === "water") {
            this.crumples.push({
              x: faller.x,
              y: faller.end,
              size: faller.size * 0.72,
              born: t,
              radii: Array.from({ length: 7 }, () => random(0.62, 1.18)),
              turn: random(0, Math.PI * 2),
            });
            return false;
          }
          if (faller.settle === "shore") {
            this.settle(faller, Math.round(faller.end));
            return false;
          }
          if (faller.y > faller.end + 40) return false;
        }
        alive[faller.near ? "near" : "far"] += 1;
      }
      return true;
    });

    const { near, far } = this.targets();
    for (let index = alive.near; index < near; index += 1) this.spawn(true, random(-140, -10), t);
    for (let index = alive.far; index < far; index += 1) this.spawn(false, random(-140, -10), t);

    this.crumples = this.crumples.filter((crumple) => {
      crumple.x += wind * 10 * dt;
      return t - crumple.born < 1.9;
    });

    if (!snowing) {
      this.settled = this.settled.filter((disc) => disc.melt === null || t - disc.melt < 1.8);
      if (this.settled.length === 0) this.stacks.clear();
    }
  }

  draw(context: CanvasRenderingContext2D): void {
    const conditions = this.conditions;
    if (!conditions) return;
    const t = this.time;
    const rain = rainPalette[conditions.phase];
    const snow = snowPalette[conditions.phase];

    context.strokeStyle = snow.edge;
    context.lineWidth = 0.7;
    for (const disc of this.settled) {
      const melt = disc.melt === null ? 0 : clamp01((t - disc.melt) / 1.8);
      if (melt >= 1) continue;
      context.globalAlpha = 1 - melt;
      context.fillStyle = disc.bright && melt < 0.35 ? snow.bright : snow.grey;
      context.beginPath();
      context.ellipse(
        disc.x,
        disc.y + melt * 2,
        disc.r * (1 - melt * 0.4),
        disc.r * 0.42,
        disc.tilt,
        0,
        Math.PI * 2,
      );
      context.fill();
      context.stroke();
    }

    for (const crumple of this.crumples) drawCrumple(context, crumple, t, rain);

    for (const faller of this.fallers) {
      if (t < faller.born) continue;
      const unfold = faller.dying === null ? easeOutBack(clamp01((t - faller.born) / 0.5)) : 1;
      const fold = faller.dying === null ? 1 : 1 - clamp01((t - faller.dying) / 0.45);
      const scale = unfold * fold;
      if (scale <= 0.01) continue;
      const fade = faller.settle === "fade" ? clamp01((faller.end + 40 - faller.y) / 40) : 1;
      context.globalAlpha = (faller.near ? 0.95 : 0.62) * fade;
      if (faller.kind === "disc") drawDisc(context, faller, scale, snow);
      else if (faller.kind === "dart") drawDart(context, faller, scale, rain);
      else drawStrip(context, faller, scale, rain);
    }
    context.globalAlpha = 1;
  }
}

function drawDisc(
  context: CanvasRenderingContext2D,
  faller: Faller,
  scale: number,
  palette: SnowPalette,
) {
  const facing = Math.cos(faller.flip);
  context.fillStyle = facing >= 0 ? palette.bright : palette.grey;
  context.strokeStyle = palette.edge;
  context.lineWidth = 0.7;
  context.beginPath();
  context.ellipse(
    faller.x,
    faller.y,
    faller.size * scale,
    Math.max(0.4, faller.size * Math.abs(facing)) * scale,
    faller.angle,
    0,
    Math.PI * 2,
  );
  context.fill();
  context.stroke();
}

function drawStrip(
  context: CanvasRenderingContext2D,
  faller: Faller,
  scale: number,
  palette: { face: string; back: string },
) {
  const length = faller.size * 3.2 * scale;
  const width = Math.max(0.7, faller.size * 0.95 * Math.abs(Math.cos(faller.flip))) * scale;
  const faceUp = Math.cos(faller.flip) >= 0;
  context.save();
  context.translate(faller.x, faller.y);
  context.rotate(faller.angle);
  // A strip folded once: each half shows the opposite side of the paper.
  context.fillStyle = faceUp ? palette.face : palette.back;
  context.fillRect(-length / 2, -width / 2, length / 2, width);
  context.rotate(0.6);
  context.fillStyle = faceUp ? palette.back : palette.face;
  context.fillRect(0, -width / 2, length / 2, width);
  context.restore();
}

function drawDart(
  context: CanvasRenderingContext2D,
  faller: Faller,
  scale: number,
  palette: { face: string; back: string },
) {
  const length = faller.size * 2.5 * scale;
  const roll = Math.cos(faller.flip * 0.35);
  const spread = length * 0.42 * roll;
  const heading = Math.atan2(faller.vy, faller.vx) + Math.sin(faller.flip * 0.5) * 0.14;
  context.save();
  context.translate(faller.x, faller.y);
  context.rotate(heading);
  context.fillStyle = roll >= 0 ? palette.face : palette.back;
  context.beginPath();
  context.moveTo(length * 0.6, 0);
  context.lineTo(-length * 0.4, -spread);
  context.lineTo(-length * 0.22, 0);
  context.fill();
  context.fillStyle = roll >= 0 ? palette.back : palette.face;
  context.beginPath();
  context.moveTo(length * 0.6, 0);
  context.lineTo(-length * 0.22, 0);
  context.lineTo(-length * 0.4, spread);
  context.fill();
  context.restore();
}

function drawCrumple(
  context: CanvasRenderingContext2D,
  crumple: Crumple,
  t: number,
  palette: { face: string; back: string; ripple: string },
) {
  const age = t - crumple.born;
  const ripple = clamp01(age / 0.9);
  if (ripple < 1) {
    context.globalAlpha = 0.6 * (1 - ripple);
    context.strokeStyle = palette.ripple;
    context.lineWidth = 1.4;
    context.beginPath();
    context.ellipse(
      crumple.x,
      crumple.y + 1,
      2 + ripple * 17,
      (2 + ripple * 17) * 0.26,
      0,
      0,
      Math.PI * 2,
    );
    context.stroke();
  }
  // The strip scrunches from flat into a ball, bobs, then sinks.
  const squash = age < 0.16 ? 1.7 - (age / 0.16) * 0.7 : 1;
  const sink = clamp01((age - 1.1) / 0.8);
  context.globalAlpha = 0.95 * (1 - sink);
  context.save();
  context.translate(crumple.x, crumple.y - 1 + Math.sin(age * 5) * 0.7 + sink * 3);
  context.rotate(crumple.turn + age * 0.6);
  context.scale(squash, 1 / squash);
  const points = crumple.radii.map((radius, index) => {
    const angle = (index / crumple.radii.length) * Math.PI * 2;
    return [
      Math.cos(angle) * radius * crumple.size,
      Math.sin(angle) * radius * crumple.size,
    ] as const;
  });
  context.fillStyle = palette.back;
  context.beginPath();
  for (const [x, y] of points) context.lineTo(x, y);
  context.fill();
  const [first, second, third] = points;
  if (first && second && third) {
    context.fillStyle = palette.face;
    context.beginPath();
    context.moveTo(0, 0);
    context.lineTo(...first);
    context.lineTo(...second);
    context.lineTo(...third);
    context.fill();
  }
  context.restore();
}
