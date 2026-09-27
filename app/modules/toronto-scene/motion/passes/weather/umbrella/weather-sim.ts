import type { DayPhase, Weather } from "../../../../scene-provider";
import { blendPalette, clonePalette, paletteFor, type Palette } from "./palette";
import {
  buildSkyline,
  columnAt,
  columnCount,
  columnWidth,
  placeTower,
  type Affine,
  type Skyline,
} from "./skyline-field";

export type WeatherInput = {
  phase: DayPhase;
  weather: Weather;
  /** 0–1 */
  rain: number;
  /** 0–1 */
  cloud: number;
  /** 0–1 snowfall strength. */
  snow: number;
  /** -1…1 */
  wind: number;
};

export type Layer = 0 | 1 | 2;

export type Drop = { x: number; y: number; vx: number; vy: number; layer: Layer; roll: number };
export type Bit = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
  size: number;
};
export type Ring = { x: number; y: number; age: number; life: number; size: number };
export type Slide = { theta: number; omega: number; host: 0 | 1 };
export type Flake = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  layer: Layer;
  seed: number;
  /** Seconds a swept-up flake keeps flying before it settles back into the fall. */
  lift: number;
};
export type Puff = {
  hx: number;
  hy: number;
  r: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
};
export type Cloud = {
  x: number;
  y: number;
  band: 0 | 1;
  width: number;
  puffs: Puff[];
  presence: number;
  leaving: boolean;
};
export type Mote = { x: number; y: number; vx: number; vy: number; size: number; seed: number };
export type Fly = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  tx: number;
  ty: number;
  retarget: number;
  phase: number;
  freq: number;
  orbit: number;
  seed: number;
};

/** The paper mat's inner edge: weather never draws over the frame. */
export const mat = { x0: 20, y0: 20, x1: 1516, y1: 1005 } as const;
export const umbrellaRadius = 78;
export const walkerRadius = 25;
const lakeBottom = 1003;

const rand = (min = 0, max = 1) => min + Math.random() * (max - min);
const approach = (value: number, target: number, rate: number, dt: number) =>
  value + (target - value) * Math.min(1, rate * dt);

/** Sunbeams per phase: source point, beam directions (radians), and half-width. */
export const beams: Record<
  DayPhase,
  { x: number; y: number; angles: readonly number[]; width: number }
> = {
  dawn: { x: 60, y: 250, angles: [0.18, 0.36, 0.55, 0.78], width: 0.045 },
  day: { x: 1180, y: -160, angles: [1.72, 1.9, 2.08, 2.3], width: 0.05 },
  dusk: { x: 1480, y: 280, angles: [2.72, 2.88, 3.02], width: 0.05 },
  night: { x: 0, y: 0, angles: [], width: 0 },
};

/**
 * Physical weather for the paper city, simulated in artwork coordinates. Rain and snow collide
 * with the skyline's height fields, the pointer is an umbrella (and a broom, and a hand in the
 * clouds), and everything eases between states so a weather or light change plays out.
 */
export class WeatherSim {
  readonly sky: Skyline = buildSkyline();
  input: WeatherInput = { phase: "day", weather: "clear", rain: 0, cloud: 0, snow: 0, wind: 0 };
  readonly palette: Palette = clonePalette(paletteFor("day", "clear"));
  /** Eased 0–1 amounts of each effect, so switching weather is a transition, not a cut. */
  readonly level = { rain: 0, snow: 0, cloud: 0, motes: 0, flies: 0, beams: 0 };

  time = 0;
  /** Reduced motion: a still frame, with fireflies held at a steady glow. */
  still = false;
  view = { x0: 0, x1: 1536, y1: 1024, factor: 1 };
  /** Where the land and water sheets currently sit (another pass may move them). */
  land = { x: 0, y: 0 };

  pointer = { x: 0, y: 0, vx: 0, vy: 0, hover: false, lastMove: -Infinity, tapAt: -Infinity };
  umbrella = { x: 0, y: 0, open: 0 };
  walker = { x: 768, dir: 1 as 1 | -1, presence: 0, stride: 0 };
  /** How rain-soaked each of 24 slices of the cursor umbrella's canopy is (it shows where wet). */
  readonly wet = new Float32Array(24);

  readonly drops: Drop[] = [];
  readonly bits: Bit[] = [];
  readonly rings: Ring[] = [];
  readonly slides: Slide[] = [];
  readonly flakes: Flake[] = [];
  readonly clouds: Cloud[] = [];
  readonly motes: Mote[] = [];
  readonly flies: Fly[] = [];
  /** Snow depth per column on the roofs (0), the trees (1) and the shore (2). */
  readonly piles = [
    new Float32Array(columnCount),
    new Float32Array(columnCount),
    new Float32Array(columnCount),
  ] as const;

  private spawnCarry = { rain: 0, snow: 0 };
  private tower: Affine = [1, 0, 0, 1, 0, 0];
  /** Bumped whenever the skyline's shape changes, so the renderer can retrace the sky. */
  skylineVersion = 0;

  /** Moves the tower's collision outline to wherever its paper sheet currently stands. */
  placeTower(matrix: Affine): void {
    if (matrix.every((value, index) => Math.abs(value - (this.tower[index] ?? 0)) < 0.002)) return;
    this.tower = matrix;
    placeTower(this.sky, matrix);
    this.skylineVersion++;
  }

  setView(x0: number, x1: number, y1: number): void {
    this.view = {
      x0: Math.max(mat.x0, x0),
      x1: Math.min(mat.x1, x1),
      y1: Math.min(mat.y1, y1),
      factor: Math.max(0.3, (Math.min(mat.x1, x1) - Math.max(mat.x0, x0)) / (mat.x1 - mat.x0)),
    };
  }

  private targets() {
    const { weather, phase, rain, cloud, snow } = this.input;
    const night = phase === "night";
    return {
      rain: weather === "rain" ? rain : 0,
      snow: weather === "snow" ? snow : 0,
      cloud: weather === "snow" ? Math.max(cloud, 0.5) : cloud,
      motes: night ? 0 : weather === "clear" ? 1 : weather === "cloudy" ? 0.35 : 0,
      flies: night ? (weather === "clear" ? 1 : weather === "cloudy" ? 0.45 : 0) : 0,
      beams: night || weather !== "clear" ? 0 : 1,
    };
  }

  /** Jump straight to the steady state (first paint, and the reduced-motion still). */
  settle(): void {
    Object.assign(this.level, this.targets());
    blendPalette(this.palette, paletteFor(this.input.phase, this.input.weather), 1);
    this.syncClouds(true);
    const { rain, snow } = this.counts();
    this.drops.length = 0;
    for (let index = 0; index < rain; index++) {
      const drop = this.newDrop();
      drop.y = rand(0, this.floor(drop.layer, drop.x, drop.roll) - 10);
      this.drops.push(drop);
    }
    this.flakes.length = 0;
    for (let index = 0; index < snow; index++) {
      const flake = this.newFlake();
      flake.y = rand(0, this.floor(flake.layer, flake.x, 0.5) - 6);
      this.flakes.push(flake);
    }
    if (this.input.weather === "snow") {
      this.piles.forEach((pile, surface) => {
        for (let column = 0; column < columnCount; column++) {
          pile[column] = this.holds(surface, column) ? this.pileCap(surface) * rand(0.45, 0.7) : 0;
        }
      });
    }
    this.syncMotes();
    this.syncFlies();
  }

  private counts() {
    const f = this.view.factor;
    return {
      rain: Math.round(this.level.rain * 900 * f),
      snow: Math.round(this.level.snow * 620 * f),
      motes: Math.round(90 * f),
      flies: Math.max(8, Math.round(26 * f)),
      clouds: Math.round(this.level.cloud * (3 + 5 * f)),
    };
  }

  // ---------------------------------------------------------------- geometry

  /** The y where a particle on this depth layer meets the scene at x. */
  floor(layer: Layer, x: number, roll: number): number {
    const column = columnAt(x - this.land.x);
    const { sky } = this;
    if (layer === 0) {
      const roof = sky.roof[column] ?? 800;
      // Where the tower stands above a ledge, flakes meet the tower, not the snow below it.
      const pile = roof < (sky.ledge[column] ?? 800) - 2 ? 0 : this.pileDepth(0, column);
      return roof - pile + this.land.y;
    }
    if (layer === 1) return (sky.trees[column] ?? 800) - (this.piles[1][column] ?? 0) + this.land.y;
    const shore = (sky.shore[column] ?? 910) + this.land.y;
    return shore + roll * (lakeBottom - shore);
  }

  /** Surface 0 (roofs) only holds snow where a building, not a tree, is the first surface. */
  private pileDepth(surface: 0, column: number): number {
    const onCity = (this.sky.buildings[column] ?? Infinity) < (this.sky.trees[column] ?? 0) - 2;
    return onCity ? (this.piles[surface][column] ?? 0) : (this.piles[1][column] ?? 0);
  }

  holds(surface: number, column: number): boolean {
    if (surface === 0) {
      return (
        this.sky.flat[column] === 1 &&
        (this.sky.buildings[column] ?? Infinity) < (this.sky.trees[column] ?? 0) - 2
      );
    }
    if (surface === 1) return this.sky.crowns[column] === 1;
    return true;
  }

  pileCap(surface: number): number {
    return surface === 0 ? 11 : surface === 1 ? 6 : 6;
  }

  private onLake(x: number, y: number): boolean {
    return y > (this.sky.water[columnAt(x - this.land.x)] ?? 945) + this.land.y + 2;
  }

  // ---------------------------------------------------------------- input

  move(x: number, y: number, dt: number): void {
    const { pointer } = this;
    if (pointer.hover && dt > 0.001 && dt < 0.1) {
      pointer.vx = pointer.vx * 0.5 + ((x - pointer.x) / dt) * 0.5;
      pointer.vy = pointer.vy * 0.5 + ((y - pointer.y) / dt) * 0.5;
    }
    pointer.x = x;
    pointer.y = y;
    pointer.hover = true;
    pointer.lastMove = this.time;
  }

  /** A tap (touch) opens the umbrella there for a moment, sweeps snow and stirs the air. */
  tap(x: number, y: number): void {
    const { pointer } = this;
    pointer.x = x;
    pointer.y = y;
    pointer.vx = 0;
    pointer.vy = 0;
    pointer.tapAt = this.time;
    this.sweep(x, y, 80, 1);
  }

  /** How strongly the pointer currently acts on the air: 1 while hovering, fading after a tap. */
  private reach(): number {
    if (this.pointer.hover) return 1;
    return Math.max(0, 1 - (this.time - this.pointer.tapAt) / 1.6);
  }

  // ---------------------------------------------------------------- step

  step(dt: number): void {
    this.time += dt;
    const target = this.targets();
    const { level } = this;
    // Clouds gather before the rain comes, and linger after it stops.
    level.cloud = approach(level.cloud, target.cloud, 0.7, dt);
    const ready = target.rain > 0 ? Math.min(1, level.cloud / Math.max(0.2, target.cloud)) : 1;
    level.rain = approach(
      level.rain,
      target.rain * ready,
      target.rain > level.rain ? 0.55 : 0.9,
      dt,
    );
    level.snow = approach(level.snow, target.snow * ready, 0.45, dt);
    level.motes = approach(level.motes, target.motes, 0.5, dt);
    level.flies = approach(level.flies, target.flies, 0.3, dt);
    level.beams = approach(level.beams, target.beams, 0.6, dt);
    blendPalette(
      this.palette,
      paletteFor(this.input.phase, this.input.weather),
      Math.min(1, dt * 1.6),
    );

    const { pointer } = this;
    const decay = Math.exp(-dt * 8);
    pointer.vx *= decay;
    pointer.vy *= decay;
    const touchOpen = this.time - pointer.tapAt < 2.2;
    this.umbrella.open = approach(this.umbrella.open, pointer.hover || touchOpen ? 1 : 0, 9, dt);
    this.umbrella.x = pointer.x;
    this.umbrella.y = pointer.y;
    for (let index = 0; index < this.wet.length; index++) {
      this.wet[index] = (this.wet[index] ?? 0) * Math.exp(-dt * 0.9);
    }

    this.syncClouds(false);
    this.stepClouds(dt);
    this.stepWalker(dt);
    this.stepRain(dt);
    this.stepSnow(dt);
    this.syncMotes();
    this.stepMotes(dt);
    this.syncFlies();
    this.stepFlies(dt);
  }

  // ---------------------------------------------------------------- clouds

  private makeCloud(band: 0 | 1, x: number, presence: number): Cloud {
    const width = band === 0 ? rand(220, 340) : rand(280, 440);
    const height = band === 0 ? rand(40, 56) : rand(52, 72);
    const y = band === 0 ? rand(190, 280) : rand(330, 430);
    const puffs: Puff[] = [];
    const count = Math.round(width / 22);
    for (let index = 0; index < count; index++) {
      const t = index / (count - 1);
      const swell = Math.sin(Math.PI * t) ** 0.8;
      const r = (0.3 + 0.7 * swell) * height * rand(0.75, 1.05);
      puffs.push({
        hx: (t - 0.5) * width,
        hy: -r * 0.45 + rand(-4, 4),
        r,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
      });
    }
    // A flat-bottomed base, like the cut-paper clouds in the artwork.
    for (let index = 0; index < count - 1; index++) {
      const t = (index + 0.5) / (count - 1);
      puffs.push({
        hx: (t - 0.5) * width * 0.92,
        hy: 0,
        r: height * 0.32,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
      });
    }
    const cloud: Cloud = { x, y, band, width, puffs, presence, leaving: false };
    for (const puff of puffs) {
      puff.x = x + puff.hx * (presence < 1 ? 0.4 : 1);
      puff.y = y + puff.hy;
    }
    return cloud;
  }

  private syncClouds(instant: boolean): void {
    const wanted = this.counts().clouds;
    const staying = this.clouds.filter((cloud) => !cloud.leaving);
    if (staying.length < wanted) {
      const band: 0 | 1 = staying.filter((c) => c.band === 1).length * 2 < staying.length ? 1 : 0;
      const { x0, x1 } = this.view;
      // Place the newcomer in the widest gap so the sky fills evenly.
      const xs = staying.map((c) => c.x).sort((a, b) => a - b);
      let x = rand(x0, x1);
      if (xs.length > 0) {
        let best = 0;
        const edges = [x0 - 150, ...xs, x1 + 150];
        for (let index = 0; index < edges.length - 1; index++) {
          const gap = (edges[index + 1] ?? 0) - (edges[index] ?? 0);
          if (gap > best) {
            best = gap;
            x = ((edges[index] ?? 0) + (edges[index + 1] ?? 0)) / 2;
          }
        }
      }
      this.clouds.push(this.makeCloud(band, x, instant ? 1 : 0));
    } else if (staying.length > wanted) {
      const leaver = staying[staying.length - 1];
      if (leaver) leaver.leaving = true;
    }
    if (instant && this.clouds.filter((c) => !c.leaving).length < wanted) this.syncClouds(true);
    if (instant) {
      for (let index = this.clouds.length - 1; index >= 0; index--) {
        if (this.clouds[index]?.leaving) this.clouds.splice(index, 1);
      }
    }
  }

  private stepClouds(dt: number): void {
    const { wind } = this.input;
    const reach = this.reach();
    const { pointer } = this;
    const { x0, x1 } = this.view;
    for (let index = this.clouds.length - 1; index >= 0; index--) {
      const cloud = this.clouds[index];
      if (!cloud) continue;
      cloud.presence = approach(
        cloud.presence,
        cloud.leaving ? 0 : 1,
        cloud.leaving ? 0.8 : 0.7,
        dt,
      );
      if (cloud.leaving && cloud.presence < 0.02) {
        this.clouds.splice(index, 1);
        continue;
      }
      const drift = (wind * 34 + (wind >= 0 ? 7 : -7)) * (cloud.band === 1 ? 1.3 : 1) * dt;
      cloud.x += drift;
      let shift = 0;
      if (cloud.x - cloud.width / 2 > x1 + 60) shift = x0 - x1 - cloud.width - 120;
      if (cloud.x + cloud.width / 2 < x0 - 60) shift = x1 - x0 + cloud.width + 120;
      cloud.x += shift;
      // Arriving clouds billow out from a knot; leaving ones come apart.
      const spread = cloud.leaving ? 1 + (1 - cloud.presence) * 0.9 : 0.35 + 0.65 * cloud.presence;
      for (const puff of cloud.puffs) {
        puff.x += drift + shift;
        const hx = cloud.x + puff.hx * spread;
        const hy = cloud.y + puff.hy * spread;
        let ax = -5 * (puff.x - hx) - 3.4 * puff.vx;
        let ay = -5 * (puff.y - hy) - 3.4 * puff.vy;
        if (reach > 0) {
          const dx = puff.x - pointer.x;
          const dy = puff.y - pointer.y;
          const dist = Math.hypot(dx, dy) || 1;
          const radius = 150 + puff.r;
          if (dist < radius) {
            const push = (1 - dist / radius) ** 2 * 5200 * reach;
            ax += (dx / dist) * push + pointer.vx * 3 * (1 - dist / radius);
            ay += (dy / dist) * push + pointer.vy * 3 * (1 - dist / radius);
          }
        }
        puff.vx += ax * dt;
        puff.vy += ay * dt;
        puff.x += puff.vx * dt;
        puff.y += puff.vy * dt;
      }
    }
  }

  // ---------------------------------------------------------------- umbrella

  /** Whether (x, y) is under a canopy; if so, returns its host and the angle from the top. */
  private canopyHit(x: number, y: number): { host: 0 | 1; theta: number } | null {
    const { umbrella, walker } = this;
    if (umbrella.open > 0.2) {
      const r = umbrellaRadius * umbrella.open;
      const dx = x - umbrella.x;
      const dy = y - umbrella.y;
      if (dy < 0 && dx * dx + dy * dy < r * r) return { host: 0, theta: Math.atan2(dx, -dy) };
    }
    if (walker.presence > 0.3) {
      const cy = this.walkerY() - 38;
      const dx = x - walker.x;
      const dy = y - cy;
      if (dy < 0 && dx * dx + dy * dy < walkerRadius * walkerRadius) {
        return { host: 1, theta: Math.atan2(dx, -dy) };
      }
    }
    return null;
  }

  walkerY(): number {
    return (this.sky.shore[columnAt(this.walker.x - this.land.x)] ?? 910) + this.land.y + 2;
  }

  private stepWalker(dt: number): void {
    const { walker, pointer } = this;
    // With nobody holding the umbrella, a passer-by carries one along the shore.
    const idle = !pointer.hover || this.time - pointer.lastMove > 3;
    const wanted = idle && this.level.rain > 0.08 && this.time - pointer.tapAt > 2.2 ? 1 : 0;
    walker.presence = approach(walker.presence, wanted, 1.2, dt);
    if (walker.presence < 0.01) return;
    const speed = 26;
    walker.x += walker.dir * speed * dt;
    walker.stride += dt * 5.2;
    const { x0, x1 } = this.view;
    if (walker.x > x1 - 60) walker.dir = -1;
    if (walker.x < x0 + 60) walker.dir = 1;
  }

  canopyCenter(host: 0 | 1): { x: number; y: number; r: number } {
    if (host === 0) {
      return { x: this.umbrella.x, y: this.umbrella.y, r: umbrellaRadius * this.umbrella.open };
    }
    return { x: this.walker.x, y: this.walkerY() - 38, r: walkerRadius };
  }

  // ---------------------------------------------------------------- rain

  private newDrop(): Drop {
    const roll = Math.random();
    const layer: Layer = roll < 0.42 ? 0 : roll < 0.68 ? 1 : 2;
    const { wind } = this.input;
    const vy = [780, 1000, 1260][layer] ?? 1000;
    const vx = wind * ([150, 210, 290][layer] ?? 200) + rand(-12, 12);
    const { x0, x1 } = this.view;
    // Drops start upwind so the slanted rain still covers the whole view.
    const x = rand(x0 - 30, x1 + 30) - vx * 0.75;
    return { x, y: rand(-120, -20), vx, vy: vy * rand(0.9, 1.1), layer, roll: Math.random() };
  }

  private splash(x: number, y: number, count: number, size: number, up = 180): void {
    for (let index = 0; index < count && this.bits.length < 420; index++) {
      this.bits.push({
        x,
        y: y - 1,
        vx: rand(-110, 110) + this.input.wind * 40,
        vy: -rand(up * 0.45, up),
        age: 0,
        life: rand(0.28, 0.5),
        size: size * rand(0.7, 1.2),
      });
    }
  }

  private ring(x: number, y: number, size: number): void {
    if (this.rings.length > 110) this.rings.shift();
    this.rings.push({ x, y, age: 0, life: rand(0.6, 0.95), size });
  }

  private stepRain(dt: number): void {
    const wanted = this.counts().rain;
    this.spawnCarry.rain += (wanted / 0.8) * dt;
    while (this.spawnCarry.rain >= 1) {
      this.spawnCarry.rain -= 1;
      if (this.drops.length < wanted * 1.15) this.drops.push(this.newDrop());
    }
    for (let index = this.drops.length - 1; index >= 0; index--) {
      const drop = this.drops[index];
      if (!drop) continue;
      drop.x += drop.vx * dt;
      drop.y += drop.vy * dt;
      const hit = this.canopyHit(drop.x, drop.y);
      if (hit) {
        this.slides.push({ theta: hit.theta, omega: 0, host: hit.host });
        if (Math.random() < 0.5) this.splash(drop.x, drop.y, 1, 1.1, 120);
        if (hit.host === 0) {
          const bucket = Math.min(
            23,
            Math.max(0, Math.floor(((hit.theta + Math.PI / 2) / Math.PI) * 24)),
          );
          this.wet[bucket] = Math.min(1, (this.wet[bucket] ?? 0) + 0.2);
        }
        this.drops.splice(index, 1);
        continue;
      }
      const floor = this.floor(drop.layer, drop.x, drop.roll);
      if (drop.y < floor) continue;
      if (drop.layer === 2 && this.onLake(drop.x, floor)) {
        this.ring(drop.x, floor, rand(0.7, 1.2));
        if (Math.random() < 0.35) this.splash(drop.x, floor, 1, 1.2, 150);
      } else {
        this.splash(
          drop.x,
          floor,
          drop.layer === 1 ? 1 : 2 + Math.round(Math.random()),
          drop.layer === 0 ? 0.9 : 1.3,
        );
      }
      this.drops.splice(index, 1);
    }
    for (let index = this.bits.length - 1; index >= 0; index--) {
      const bit = this.bits[index];
      if (!bit) continue;
      bit.age += dt;
      if (bit.age > bit.life) {
        this.bits.splice(index, 1);
        continue;
      }
      bit.vy += 1500 * dt;
      bit.x += bit.vx * dt;
      bit.y += bit.vy * dt;
    }
    for (let index = this.rings.length - 1; index >= 0; index--) {
      const ring = this.rings[index];
      if (!ring) continue;
      ring.age += dt;
      if (ring.age > ring.life) this.rings.splice(index, 1);
    }
    // Water slides down the canopy, gathering speed, and drips off the rim.
    for (let index = this.slides.length - 1; index >= 0; index--) {
      const slide = this.slides[index];
      if (!slide) continue;
      const dir = slide.theta === 0 ? (Math.random() < 0.5 ? -1 : 1) : Math.sign(slide.theta);
      slide.omega += dir * (1.4 + 7 * Math.abs(Math.sin(slide.theta))) * dt;
      slide.theta += slide.omega * dt;
      const canopy = this.canopyCenter(slide.host);
      if (Math.abs(slide.theta) > 1.45 || canopy.r < 8) {
        const x = canopy.x + canopy.r * Math.sin(slide.theta);
        const y = canopy.y - canopy.r * Math.cos(slide.theta) + 2;
        this.drops.push({
          x,
          y,
          vx: dir * 30 + (slide.host === 0 ? this.pointer.vx * 0.3 : 0),
          vy: 90,
          layer: 2,
          roll: Math.random(),
        });
        this.slides.splice(index, 1);
      }
    }
    if (this.slides.length > 160) this.slides.splice(0, this.slides.length - 160);
  }

  // ---------------------------------------------------------------- snow

  private newFlake(): Flake {
    const roll = Math.random();
    const layer: Layer = roll < 0.4 ? 0 : roll < 0.65 ? 1 : 2;
    const { x0, x1 } = this.view;
    const drift = this.input.wind * 60;
    return {
      x: rand(x0 - 20, x1 + 20) - drift * 6,
      // Spread the first flakes of a fall over the sky's height so they don't arrive as a line.
      y: this.flakes.length < 40 ? rand(-60, 380) * 0.5 : rand(-60, -10),
      vx: drift,
      vy: 50,
      r: ([1.6, 2.4, 3.4][layer] ?? 2) * rand(0.75, 1.25),
      layer,
      seed: rand(0, 100),
      lift: 0,
    };
  }

  /** Clears snow from the surfaces near (x, y), throwing it back into the air as puffs. */
  sweep(x: number, y: number, radius: number, force: number): void {
    const first = columnAt(x - radius - this.land.x);
    const last = columnAt(x + radius - this.land.x);
    const surfaces = [this.sky.ledge, this.sky.trees, this.sky.shore] as const;
    surfaces.forEach((field, surface) => {
      const pile = this.piles[surface as 0 | 1 | 2];
      for (let column = first; column <= last; column++) {
        const depth = pile[column] ?? 0;
        if (depth < 0.3) continue;
        const top = (field[column] ?? 0) + this.land.y - depth;
        const cx = column * columnWidth + columnWidth / 2 + this.land.x;
        const dist = Math.hypot(cx - x, (top - y) * 1.6);
        if (dist > radius) continue;
        const removed = Math.min(depth, depth * force * (1 - dist / radius) * 1.4);
        pile[column] = depth - removed;
        const puffs = Math.min(3, Math.round(removed / 2.5));
        for (let index = 0; index < puffs && this.flakes.length < 700; index++) {
          this.flakes.push({
            x: cx + rand(-2, 2),
            y: top - 3,
            vx: this.pointer.vx * 0.35 + rand(-70, 70),
            vy: -rand(60, 190) + this.pointer.vy * 0.2,
            r: rand(1.4, 3),
            layer: surface as Layer,
            seed: rand(0, 100),
            lift: rand(0.5, 1.1),
          });
        }
      }
    });
  }

  private stepSnow(dt: number): void {
    const wanted = this.counts().snow;
    this.spawnCarry.snow += (wanted / 6) * dt;
    while (this.spawnCarry.snow >= 1) {
      this.spawnCarry.snow -= 1;
      if (this.flakes.length < wanted * 1.1 + 60) this.flakes.push(this.newFlake());
    }
    const { pointer } = this;
    const reach = this.reach();
    const t = this.time;
    const wind = this.input.wind;
    for (let index = this.flakes.length - 1; index >= 0; index--) {
      const flake = this.flakes[index];
      if (!flake) continue;
      const fall = ([36, 50, 68][flake.layer] ?? 50) * (0.8 + flake.r * 0.1);
      const sway = Math.sin(t * (0.7 + (flake.seed % 1)) + flake.seed) * 16;
      const tx = wind * ([40, 55, 72][flake.layer] ?? 50) + sway;
      if (flake.lift > 0) {
        // A swept-up flake flies on its kick, slowed by the air, before rejoining the fall.
        flake.lift -= dt;
        flake.vy += 220 * dt;
        flake.vx *= Math.exp(-dt * 1.5);
      } else {
        flake.vx = approach(flake.vx, tx, 2, dt);
        flake.vy = approach(flake.vy, fall, 2, dt);
      }
      if (reach > 0) {
        const dx = flake.x - pointer.x;
        const dy = flake.y - pointer.y;
        const dist = Math.hypot(dx, dy) || 1;
        if (dist < 110) {
          const push = (1 - dist / 110) * 900 * reach;
          flake.vx += ((dx / dist) * push + pointer.vx * 1.4 * (1 - dist / 110)) * dt;
          flake.vy += ((dy / dist) * push + pointer.vy * 1.4 * (1 - dist / 110)) * dt;
        }
      }
      flake.x += flake.vx * dt;
      flake.y += flake.vy * dt;
      if (flake.y > this.view.y1 + 20 || flake.x < -200 || flake.x > 1736) {
        this.flakes.splice(index, 1);
        continue;
      }
      if (flake.vy <= 0) continue;
      const roll = (flake.seed * 7.13) % 1;
      const floor = this.floor(flake.layer, flake.x, roll);
      if (flake.y < floor) continue;
      this.settleFlake(flake, floor);
      this.flakes.splice(index, 1);
    }
    // Snow slumps sideways until it rests, and melts once the snow stops.
    const melt = this.input.weather === "snow" ? 0 : this.input.weather === "rain" ? 2.2 : 0.9;
    this.piles.forEach((pile, surface) => {
      for (let column = 0; column < columnCount - 1; column++) {
        let here = pile[column] ?? 0;
        if (melt > 0 && here > 0) here = Math.max(0, here - melt * dt * (0.5 + here / 10));
        const next = pile[column + 1] ?? 0;
        if (this.holds(surface, column + 1) && Math.abs(here - next) > 2.2) {
          const moved = (here - next) * 0.25;
          here -= moved;
          pile[column + 1] = next + moved;
        }
        pile[column] = here;
      }
    });
    if (reach > 0 && pointer.hover) {
      const speed = Math.hypot(pointer.vx, pointer.vy);
      if (speed > 120) this.sweep(pointer.x, pointer.y, 46, Math.min(1, speed / 1400) * dt * 14);
    }
  }

  private settleFlake(flake: Flake, floor: number): void {
    const column = columnAt(flake.x - this.land.x);
    if (flake.layer === 2 && this.onLake(flake.x, floor)) return;
    // Near flakes that land short of the lake settle on the shore path.
    let surface: 0 | 1 | 2 = flake.layer;
    if (surface === 0 && (this.sky.roof[column] ?? 0) < (this.sky.ledge[column] ?? 0) - 2) {
      return; // It hit the tower, which holds no snow.
    }
    if (surface === 0 && !this.holds(0, column)) {
      const onCity = (this.sky.buildings[column] ?? Infinity) < (this.sky.trees[column] ?? 0) - 2;
      if (onCity) return; // Too steep to hold: it slides off the ledge.
      surface = 1;
    }
    const pile = this.piles[surface];
    const cap = this.pileCap(surface);
    const add = flake.r * 2;
    for (let offset = -1; offset <= 1; offset++) {
      const at = column + offset;
      if (at < 0 || at >= columnCount || !this.holds(surface, at)) continue;
      pile[at] = Math.min(cap, (pile[at] ?? 0) + add * (offset === 0 ? 1 : 0.45));
    }
  }

  // ---------------------------------------------------------------- motes and fireflies

  private syncMotes(): void {
    const wanted = this.level.motes > 0.01 ? this.counts().motes : 0;
    while (this.motes.length < wanted) {
      this.motes.push({
        x: rand(this.view.x0, this.view.x1),
        y: rand(60, 900),
        vx: 0,
        vy: 0,
        size: rand(0.8, 2.3),
        seed: rand(0, 100),
      });
    }
    if (wanted === 0 && this.level.motes < 0.01) this.motes.length = 0;
  }

  /** How much of a sunbeam lights (x, y), 0–1. */
  beamLight(x: number, y: number): number {
    const beam = beams[this.input.phase];
    if (beam.angles.length === 0 || this.level.beams < 0.01) return 0;
    const angle = Math.atan2(y - beam.y, x - beam.x);
    let light = 0;
    for (const [index, center] of beam.angles.entries()) {
      const swing = center + Math.sin(this.time * 0.13 + index * 1.7) * 0.015;
      const off = Math.abs(angle - swing) / beam.width;
      if (off < 1) light = Math.max(light, 1 - off * off);
    }
    return light * this.level.beams;
  }

  private stepMotes(dt: number): void {
    const { pointer } = this;
    const reach = this.reach();
    const t = this.time;
    const { x0, x1 } = this.view;
    for (const mote of this.motes) {
      const flowX = Math.sin(mote.y * 0.005 + t * 0.21 + mote.seed) * 11 + this.input.wind * 14;
      const flowY = Math.cos(mote.x * 0.004 - t * 0.17 + mote.seed) * 7 - 1.5;
      mote.vx = approach(mote.vx, flowX, 0.8, dt);
      mote.vy = approach(mote.vy, flowY, 0.8, dt);
      if (reach > 0) {
        // Motes are caught in the pointer's wake and spun around it in a little eddy.
        const dx = mote.x - pointer.x;
        const dy = mote.y - pointer.y;
        const dist = Math.hypot(dx, dy) || 1;
        if (dist < 200) {
          const fall = (1 - dist / 200) * reach;
          const spin = 340 * fall;
          mote.vx +=
            ((-dy / dist) * spin - (dx / dist) * 60 * fall + pointer.vx * 0.9 * fall) * dt * 2;
          mote.vy +=
            ((dx / dist) * spin - (dy / dist) * 60 * fall + pointer.vy * 0.9 * fall) * dt * 2;
        }
      }
      mote.x += mote.vx * dt;
      mote.y += mote.vy * dt;
      if (mote.x < x0 - 10) mote.x = x1 + 8;
      if (mote.x > x1 + 10) mote.x = x0 - 8;
      if (mote.y < 40) mote.y = 900;
      if (mote.y > 920) mote.y = 50;
    }
  }

  private syncFlies(): void {
    const wanted = this.level.flies > 0.01 ? this.counts().flies : 0;
    while (this.flies.length < wanted) {
      const x = rand(this.view.x0 + 20, this.view.x1 - 20);
      const y = rand(770, 990);
      this.flies.push({
        x,
        y,
        vx: 0,
        vy: 0,
        tx: x,
        ty: y,
        retarget: 0,
        phase: rand(0, Math.PI * 2),
        freq: rand(1.6, 2.6),
        orbit: rand(34, 96),
        seed: rand(0, 100),
      });
    }
    if (wanted === 0 && this.level.flies < 0.01) this.flies.length = 0;
  }

  /** How close each firefly is to the pointer's swarm (0 = free, 1 = following). */
  following = 0;

  private stepFlies(dt: number): void {
    const { pointer } = this;
    const reach = this.reach();
    const t = this.time;
    const count = this.flies.length;
    let near = 0;
    for (const fly of this.flies) {
      const dist = Math.hypot(fly.x - pointer.x, fly.y - pointer.y);
      const follows = reach > 0 && dist < 320;
      if (follows) {
        near++;
        const angle = t * (0.6 + (fly.seed % 1) * 0.5) + fly.seed;
        fly.tx = pointer.x + Math.cos(angle) * fly.orbit;
        fly.ty = pointer.y + Math.sin(angle) * fly.orbit * 0.6;
      } else if (t > fly.retarget) {
        fly.tx = rand(this.view.x0 + 20, this.view.x1 - 20);
        fly.ty = rand(760, 995);
        fly.retarget = t + rand(3, 7);
      }
      const jitter = Math.sin(t * 3.1 + fly.seed) * 22;
      fly.vx += ((fly.tx - fly.x) * (follows ? 2.2 : 0.35) - fly.vx * 1.4 + jitter) * dt;
      fly.vy +=
        ((fly.ty - fly.y) * (follows ? 2.2 : 0.35) -
          fly.vy * 1.4 +
          Math.cos(t * 2.3 + fly.seed) * 18) *
        dt;
      fly.x += fly.vx * dt;
      fly.y += fly.vy * dt;
    }
    this.following = approach(this.following, count > 0 ? near / count : 0, 1.5, dt);
    // Fireflies gathered together fall into step and blink in unison (Kuramoto coupling).
    const coupling = 0.08 + this.following * 2.4;
    for (const fly of this.flies) {
      let pull = 0;
      for (const other of this.flies) pull += Math.sin(other.phase - fly.phase);
      fly.phase += (fly.freq + (coupling / Math.max(1, count)) * pull) * dt;
    }
  }
}
