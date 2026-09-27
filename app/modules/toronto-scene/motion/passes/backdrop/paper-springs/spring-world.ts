import { bodies, couplings, type Box, type BodySpec, type Spring } from "./bodies";

type Dof = { p: number; v: number; a: number };
const dof = (): Dof => ({ p: 0, v: 0, a: 0 });

export type BodyState = {
  spec: BodySpec;
  x: Dof;
  y: Dof;
  lean: Dof;
  squash: Dof;
  /** Height from the mounting point to the top of the sheet: the lever for lean. */
  height: number;
  /** Per-sheet phase offsets so flutter never moves in lockstep. */
  seed: number;
};

type Wave = {
  x: number;
  y: number;
  born: number;
  strength: number;
  /** A silent wave (a table bump, a pluck's twang) shakes sheets but draws no ring. */
  silent: boolean;
  hit: Set<number>;
  splashX: [number, number];
};

type Gust = { born: number; dir: 1 | -1; strength: number };

export type Ripple = { x: number; y: number; born: number; size: number };

export type Pluck = { body: number; grabX: number; grabY: number; toX: number; toY: number };

const waveSpeed = 1500;
const gustSpeed = 760;
const lakeLine = 962;

const omega = (spring: Spring) => 2 * Math.PI * spring.hz;

/** Distance from a point to the nearest edge of a box (0 inside) and the direction away from the point. */
export function reach(box: Box, px: number, py: number): { dist: number; nx: number; ny: number } {
  const cx = Math.min(Math.max(px, box.x0), box.x1);
  const cy = Math.min(Math.max(py, box.y0), box.y1);
  let dx = cx - px;
  let dy = cy - py;
  let dist = Math.hypot(dx, dy);
  if (dist < 1) {
    // Inside the sheet: push away from the point, towards the sheet's middle.
    dx = (box.x0 + box.x1) / 2 - px;
    dy = (box.y0 + box.y1) / 2 - py;
    const inner = Math.hypot(dx, dy) || 1;
    return { dist: 0, nx: dx / inner, ny: dy / inner };
  }
  return { dist, nx: dx / dist, ny: dy / dist };
}

/** Soft limit: linear near rest, easing into the limit instead of hitting a wall. */
export const soft = (value: number, limit: number) => limit * Math.tanh(value / limit);

function integrate(state: Dof, spring: Spring | undefined, target: number, dt: number): void {
  if (!spring) {
    state.a = 0;
    return;
  }
  const w = omega(spring);
  state.v += (state.a - 2 * spring.zeta * w * state.v - w * w * (state.p - target)) * dt;
  state.p += state.v * dt;
  state.a = 0;
}

/**
 * The physics of the diorama: every sheet is a small damped-spring system, pushed by the cursor,
 * shockwaves, scroll kicks, wind and gusts. Pure state; the driver renders it.
 */
export class SpringWorld {
  readonly bodies: BodyState[] = bodies.map((spec, index) => ({
    spec,
    x: dof(),
    y: dof(),
    lean: dof(),
    squash: dof(),
    height: Math.max(40, spec.origin[1] - spec.box.y0),
    seed: index * 1.618,
  }));
  readonly waves: Wave[] = [];
  readonly ripples: Ripple[] = [];
  private readonly gusts: Gust[] = [];
  private readonly links: (readonly [number, number])[] = couplings.map(([a, b]) => [
    this.index(a),
    this.index(b),
  ]);

  cursor = { x: 0, y: 0, vx: 0, vy: 0, active: false };
  /** Normalised cursor position (-0.5…0.5) for the planes' parallax targets. */
  aim = { x: 0, y: 0 };
  pluck: Pluck | null = null;
  wind = 0;
  parallax = 1;
  time = 0;

  index(id: string): number {
    return this.bodies.findIndex((body) => body.spec.id === id);
  }

  shockwave(x: number, y: number, strength = 1, silent = false): void {
    if (this.waves.length > 5) this.waves.shift();
    this.waves.push({
      x,
      y,
      born: this.time,
      strength,
      silent,
      hit: new Set(),
      splashX: [x, x],
    });
  }

  gust(dir: 1 | -1, strength = 1): void {
    if (this.gusts.length > 3) this.gusts.shift();
    this.gusts.push({ born: this.time, dir, strength });
  }

  /** Scroll kicks every sheet vertically; light sheets jump further than heavy ones. */
  kick(pixels: number): void {
    const impulse = Math.max(-260, Math.min(260, -pixels * 2.4));
    for (const body of this.bodies) {
      body.y.v += impulse / body.spec.mass;
      if (body.spec.squash) body.squash.v += (impulse * 0.0016) / body.spec.mass;
    }
  }

  /** Grab the sheet nearest the point, if one is close enough. */
  grab(x: number, y: number): boolean {
    let best = -1;
    let bestScore = 70;
    this.bodies.forEach((body, index) => {
      if (!body.spec.pluck) return;
      const { dist } = reach(body.spec.box, x, y);
      const { box } = body.spec;
      // Among sheets under the point, prefer the smallest (the tower over the sky behind it).
      const score = dist + Math.sqrt((box.x1 - box.x0) * (box.y1 - box.y0)) / 40;
      if (score < bestScore) {
        bestScore = score;
        best = index;
      }
    });
    if (best < 0) return false;
    this.pluck = { body: best, grabX: x, grabY: y, toX: x, toY: y };
    return true;
  }

  release(): void {
    const pluck = this.pluck;
    if (!pluck) return;
    this.pluck = null;
    // The twang: a small silent wave shakes the neighbours.
    this.shockwave(pluck.grabX, pluck.grabY, 0.35, true);
  }

  /** Where the grabbed point on the plucked sheet currently sits. */
  pluckPoint(): { x: number; y: number } | null {
    if (!this.pluck) return null;
    const body = this.bodies[this.pluck.body];
    if (!body) return null;
    const { spec } = body;
    const h = spec.origin[1] - this.pluck.grabY;
    return {
      x:
        this.pluck.grabX +
        soft(body.x.p, spec.limits.x) +
        soft(body.lean.p, spec.limits.lean ?? 1) * h,
      y:
        this.pluck.grabY +
        soft(body.y.p, spec.limits.y) -
        soft(body.squash.p, spec.limits.squash ?? 1) * h,
    };
  }

  /** Whether anything is still moving (so the renderer can skip writes at rest). */
  step(dt: number): void {
    this.time += dt;
    const t = this.time;
    this.applyCursor();
    this.applyPluck();
    this.applyWaves(t);
    this.applyWind(t);
    this.applyCouplings();
    for (const body of this.bodies) {
      const { spec } = body;
      const targetX = spec.parallax ? this.aim.x * spec.parallax[0] * this.parallax : 0;
      const targetY = spec.parallax ? this.aim.y * spec.parallax[1] * this.parallax : 0;
      integrate(body.x, spec.travel, targetX, dt);
      integrate(body.y, spec.travel, targetY, dt);
      integrate(body.lean, spec.lean, 0, dt);
      integrate(body.squash, spec.squash, 0, dt);
    }
    // The hand's wake fades as soon as the cursor stops.
    const decay = Math.exp(-dt * 9);
    this.cursor.vx *= decay;
    this.cursor.vy *= decay;
    while (this.ripples.length > 0 && t - (this.ripples[0]?.born ?? t) > 1.6) this.ripples.shift();
  }

  /** Push a sideways force through a sheet: part travel, part lean (tall sheets mostly lean). */
  private push(body: BodyState, fx: number, fy: number): void {
    const { spec } = body;
    const leanShare = spec.lean ? (spec.leanGain ?? 0.6) : 0;
    body.x.a += (fx * (1 - leanShare * 0.6)) / spec.mass;
    body.lean.a += (fx * leanShare) / (spec.mass * body.height);
    body.y.a += fy / spec.mass;
    if (spec.squash) body.squash.a += (-fy * 0.0009) / spec.mass;
  }

  private applyCursor(): void {
    const { cursor } = this;
    if (!cursor.active) return;
    const speed = Math.hypot(cursor.vx, cursor.vy);
    for (const body of this.bodies) {
      const { dist, nx, ny } = reach(body.spec.box, cursor.x, cursor.y);
      const fall = Math.exp(-((dist / 190) ** 2));
      if (fall < 0.01) continue;
      // A gentle shove away from the hand, plus the wake it drags along when it moves.
      const shove = 260 + Math.min(speed, 2400) * 0.5;
      this.push(
        body,
        (nx * shove + cursor.vx * 1.5) * fall,
        (ny * shove * 0.6 + cursor.vy * 1.1) * fall,
      );
    }
  }

  private applyPluck(): void {
    const pluck = this.pluck;
    const point = this.pluckPoint();
    if (!pluck || !point) return;
    const body = this.bodies[pluck.body];
    if (!body) return;
    // The thread is a stiff spring between the grabbed point and the cursor, capped in reach.
    let dx = pluck.toX - point.x;
    let dy = pluck.toY - point.y;
    const length = Math.hypot(dx, dy);
    const cap = 150;
    if (length > cap) {
      dx *= cap / length;
      dy *= cap / length;
    }
    const pull = 70 * body.spec.mass;
    this.push(body, dx * pull, dy * pull);
    // Hold it steady while it's held, so the release is a clean twang.
    body.x.v *= 0.92;
    body.lean.v *= 0.92;
    body.y.v *= 0.92;
  }

  private applyWaves(t: number): void {
    for (let w = this.waves.length - 1; w >= 0; w--) {
      const wave = this.waves[w];
      if (!wave) continue;
      const radius = (t - wave.born) * waveSpeed;
      if (radius > 2300) {
        this.waves.splice(w, 1);
        continue;
      }
      this.bodies.forEach((body, index) => {
        if (wave.hit.has(index)) return;
        const { dist, nx, ny } = reach(body.spec.box, wave.x, wave.y);
        if (dist > radius) return;
        wave.hit.add(index);
        const fall = Math.exp(-dist / 850) * wave.strength;
        const { spec } = body;
        const impulse = 520 * fall;
        body.x.v += (nx * impulse * (spec.lean ? 0.5 : 1)) / spec.mass;
        body.y.v += (ny * impulse * 0.8) / spec.mass;
        if (spec.lean)
          body.lean.v += (nx * impulse * (spec.leanGain ?? 0.6) * 1.4) / (spec.mass * body.height);
        if (spec.squash) body.squash.v += (-0.9 * fall) / spec.mass;
      });
      if (wave.silent) continue;
      // Where the ring crosses the lake, it splashes: two ripple trains racing outward.
      const dy = Math.abs(lakeLine - wave.y);
      if (radius <= dy) continue;
      const half = Math.sqrt(radius * radius - dy * dy);
      const sides = [wave.x - half, wave.x + half] as const;
      sides.forEach((x, side) => {
        const last = wave.splashX[side] ?? wave.x;
        if (Math.abs(x - last) < 110 && radius > dy + 4) return;
        wave.splashX[side] = x;
        if (x < -40 || x > 1576) return;
        const size = Math.max(0.25, (1 - radius / 2000) * wave.strength);
        this.ripples.push({ x, y: lakeLine + 6 + ((x * 7) % 34), born: t, size });
        if (this.ripples.length > 18) this.ripples.shift();
      });
    }
  }

  private applyWind(t: number): void {
    const wind = this.wind;
    for (let g = this.gusts.length - 1; g >= 0; g--) {
      const gust = this.gusts[g];
      if (gust && (t - gust.born) * gustSpeed > 2400) this.gusts.splice(g, 1);
    }
    for (const body of this.bodies) {
      const { spec } = body;
      if (spec.wind === 0) continue;
      // Steady wind leans the sheet; a slow flutter keeps it alive while it blows.
      const flutter =
        Math.sin(t * 1.3 + body.seed) * 0.6 +
        Math.sin(t * 2.9 + body.seed * 2.1) * 0.3 +
        Math.sin(t * 5.3 + body.seed * 0.7) * 0.1;
      let fx = wind * 140 + flutter * Math.abs(wind) * 80;
      for (const gust of this.gusts) {
        const front = (gust.dir > 0 ? -240 : 1776) + gust.dir * gustSpeed * (t - gust.born);
        const gap =
          front < spec.box.x0 ? spec.box.x0 - front : front > spec.box.x1 ? front - spec.box.x1 : 0;
        fx += gust.dir * gust.strength * 520 * Math.exp(-((gap / 230) ** 2));
      }
      this.push(body, fx * spec.wind * spec.mass * 0.55, 0);
    }
  }

  private applyCouplings(): void {
    for (const [a, b] of this.links) {
      const first = this.bodies[a];
      const second = this.bodies[b];
      if (!first || !second) continue;
      const k = 26;
      const dx = (second.x.p - first.x.p) * k;
      const dl = (second.lean.p - first.lean.p) * k;
      first.x.a += dx;
      second.x.a -= dx;
      first.lean.a += dl;
      second.lean.a -= dl;
    }
  }
}
