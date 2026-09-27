import type { DayPhase, Weather } from "../../../../scene-provider";
import { getBlotSprites, getFlakeSprites, type BlotSprites } from "./ink-sprites";
import { canopyAt, crownAt, roofAt, roofs, waterLine } from "./paper-ledges";

/** What the engine reads from the scene every frame. */
export type InkWeather = {
  phase: DayPhase;
  weather: Weather;
  rain: number;
  wind: number;
  reducedMotion: boolean;
};

export type InkCanvases = {
  /** Slow-drying tide lines and rivulet trails (inside the ink blend). */
  stain: HTMLCanvasElement;
  /** Wet paper: blot bodies that dry over a few seconds (inside the ink blend). */
  wet: HTMLCanvasElement;
  /** Redrawn every frame: blooming blots, rivulet beads, falling streaks (inside the ink blend). */
  fx: HTMLCanvasElement;
  /** Settled gouache that builds up on the canopy and ledges while it snows. */
  drift: HTMLCanvasElement;
  /** Falling gouache snow, painted normally over everything. */
  snow: HTMLCanvasElement;
};

/** Ink per light: violet at dawn, indigo by day, plum at dusk, and a pale wet sheen at night. */
const inks: Record<DayPhase, string> = {
  dawn: "#57466b",
  day: "#2a4864",
  dusk: "#5a3a4e",
  night: "#a9c6e8",
};

type Bloom = { x: number; y: number; radius: number; age: number; sprite: number; turn: number };
type Rivulet = {
  x: number;
  y: number;
  vx: number;
  width: number;
  life: number;
  age: number;
  ink: string;
};
type Stipple = { x: number; y: number; age: number; seed: number };
type Streak = { x: number; y: number; age: number; lean: number; big: boolean };
type Flake = {
  kind: "roof" | "canopy" | "lake";
  /** How far out onto the lake a flake falls (lake only). */
  depth: number;
  x: number;
  y: number;
  speed: number;
  size: number;
  sway: number;
  sprite: number;
  near: boolean;
};
type Splat = { x: number; y: number; size: number; age: number; sprite: number; water: boolean };

const BLOOM_TIME = 0.55;
const STREAK_TIME = 0.11;

export function createInkEngine(canvases: InkCanvases, read: () => InkWeather) {
  const contexts = {
    stain: canvases.stain.getContext("2d"),
    wet: canvases.wet.getContext("2d"),
    fx: canvases.fx.getContext("2d"),
    drift: canvases.drift.getContext("2d"),
    snow: canvases.snow.getContext("2d"),
  };
  const size = { width: 1, height: 1, scale: 1, offsetX: 0, wetRes: 0.5, fxRes: 1 };
  const blooms: Bloom[] = [];
  const rivulets: Rivulet[] = [];
  const stipples: Stipple[] = [];
  const streaks: Streak[] = [];
  const flakes: Flake[] = [];
  const splats: Splat[] = [];
  const scheduled: { at: number; big: boolean }[] = [];
  let rainDebt = 0;
  let snowDebt = 0;
  let lastWeather: Weather | null = null;
  let dryFor = 0;
  let nextWetFade = 0;
  let nextStainFade = 0;
  let clock = 0;
  let settled = 0;
  let thawFor = 0;
  let nextThaw = 0;
  /** Flakes still in the air when the snow stops melt away. */
  let airborne = 1;

  const mobile = () => size.width < 700;

  /** Maps artwork x/y to CSS pixels (the art is slice-scaled, centred, top-anchored). */
  const toScreen = (x: number, y: number) =>
    [size.offsetX + x * size.scale, y * size.scale] as const;

  function resize(width: number, height: number) {
    size.width = Math.max(1, width);
    size.height = Math.max(1, height);
    size.scale = Math.max(size.width / 1536, size.height / 1024);
    size.offsetX = (size.width - 1536 * size.scale) / 2;
    const dpr = Math.min(typeof devicePixelRatio === "number" ? devicePixelRatio : 1, 1.5);
    size.fxRes = dpr;
    for (const [name, canvas] of Object.entries(canvases)) {
      const res = name === "stain" || name === "wet" ? size.wetRes : dpr;
      if (name === "drift") settled = 0;
      canvas.width = Math.round(size.width * res);
      canvas.height = Math.round(size.height * res);
    }
  }

  const sprites = (): BlotSprites | null => getBlotSprites(inks[read().phase]);

  /** Draws a sprite centred at art (x, y) with an art-space radius onto a context at `res`. */
  function stamp(
    ctx: CanvasRenderingContext2D,
    image: HTMLCanvasElement,
    x: number,
    y: number,
    radius: number,
    res: number,
    turn = 0,
    squash = 1,
  ) {
    const [sx, sy] = toScreen(x, y);
    const pixels = radius * size.scale * res * (96 / 60);
    ctx.save();
    ctx.translate(sx * res, sy * res);
    if (turn) ctx.rotate(turn);
    ctx.scale(1, squash);
    ctx.drawImage(image, -pixels / 2, -pixels / 2, pixels, pixels);
    ctx.restore();
  }

  function bake(bloom: Bloom) {
    const set = sprites();
    const blot = set?.blots[bloom.sprite];
    const rim = set?.rims[bloom.sprite];
    if (contexts.wet && blot)
      stamp(contexts.wet, blot, bloom.x, bloom.y, bloom.radius, size.wetRes, bloom.turn);
    if (contexts.stain && rim) {
      contexts.stain.globalAlpha = 0.7;
      stamp(contexts.stain, rim, bloom.x, bloom.y, bloom.radius, size.wetRes, bloom.turn);
      contexts.stain.globalAlpha = 1;
    }
  }

  function startRivulet(
    x: number,
    y: number,
    width: number,
    ink: string,
    life = 0.7 + Math.random() ** 1.5 * 3,
  ) {
    rivulets.push({ x, y, vx: 0, width, life, age: 0, ink });
  }

  /** A raindrop reaching the paper: a blot on the sheet, or a stipple on the lake. */
  function land(x: number, y: number, big: boolean) {
    if (y > waterLine) {
      stipples.push({ x, y, age: 0, seed: Math.random() * 1000 });
      return;
    }
    const radius = big ? 16 + Math.random() * 12 : 4 + Math.random() ** 2 * 12;
    blooms.push({
      x,
      y,
      radius,
      age: 0,
      sprite: Math.floor(Math.random() * 6),
      turn: Math.random() * 6.28,
    });
    if (big || (radius > 9 && Math.random() < 0.35)) {
      startRivulet(
        x + (Math.random() - 0.5) * radius * 0.5,
        y + radius * 0.6,
        big ? 3.2 : 1.6 + radius * 0.08,
        inks[read().phase],
      );
    }
  }

  function dropRain(big: boolean) {
    const x = Math.random() * 1536;
    const y = 20 + Math.random() ** 0.8 * 1000;
    streaks.push({ x, y, age: 0, lean: read().wind * 18, big });
  }

  /** Snow melting off the roofs runs down the sheet in pale drips. */
  function melt() {
    const count = mobile() ? 6 : 12;
    for (let index = 0; index < count; index += 1) {
      const roof = roofs[Math.floor(Math.random() * roofs.length)];
      if (!roof) continue;
      const [x1, x2, y] = roof;
      startRivulet(
        x1 + Math.random() * (x2 - x1),
        y + 3,
        1.4 + Math.random() * 1.4,
        inks[read().phase],
        2 + Math.random() * 3,
      );
    }
  }

  /** Where a flake of the given kind comes to rest under art x. */
  function groundAt(kind: Flake["kind"], x: number): number {
    if (kind === "lake") return waterLine + 6;
    if (kind === "roof") return (roofAt(x) ?? canopyAt(x)) - 1;
    return crownAt(x)?.y ?? canopyAt(x) + 20;
  }

  function spawnFlake(fromTop: boolean) {
    const x = -40 + Math.random() * 1616;
    const near = Math.random() < 0.35;
    const roll = Math.random();
    const kind: Flake["kind"] = roll < 0.5 ? "roof" : roll < 0.84 ? "canopy" : "lake";
    const lakeDepth = kind === "lake" ? Math.random() * 60 : 0;
    flakes.push({
      x,
      y: fromTop ? -12 : Math.random() * groundAt(kind, x),
      speed: near ? 46 + Math.random() * 26 : 26 + Math.random() * 18,
      size: near ? 6 + Math.random() * 4 : 3 + Math.random() * 2.5,
      sway: Math.random() * 6.28,
      kind,
      depth: lakeDepth,
      sprite: Math.floor(Math.random() * 4),
      near,
    });
  }

  function fade(ctx: CanvasRenderingContext2D | null, amount: number) {
    if (!ctx) return;
    ctx.save();
    ctx.globalCompositeOperation = "destination-out";
    ctx.globalAlpha = amount;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.restore();
  }

  function clear(ctx: CanvasRenderingContext2D | null) {
    ctx?.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  }

  /** A weather change is a moment: the first fat drops, or the snow melting off the roofs. */
  function onWeatherChange(previous: Weather | null, next: Weather) {
    if (next === "rain") {
      for (let index = 0; index < 6; index += 1)
        scheduled.push({ at: clock + 0.1 + index * 0.16 + Math.random() * 0.1, big: true });
    }
    if (previous === "snow" && next !== "snow") melt();
    if (next === "snow")
      for (let index = 0; index < (mobile() ? 18 : 40); index += 1) spawnFlake(false);
  }

  function step(dt: number) {
    clock += dt;
    const live = read();
    if (live.weather !== lastWeather) {
      onWeatherChange(lastWeather, live.weather);
      lastWeather = live.weather;
    }
    const raining = live.weather === "rain";
    const snowing = live.weather === "snow";
    const density = mobile() ? 0.5 : 1;

    // Rain: drops fall as hairlines and bloom where they hit.
    if (raining) {
      rainDebt += dt * (5 + live.rain * 24) * density;
      while (rainDebt >= 1) {
        rainDebt -= 1;
        dropRain(false);
      }
    }
    for (let index = scheduled.length - 1; index >= 0; index -= 1) {
      const drop = scheduled[index];
      if (drop && clock >= drop.at) {
        scheduled.splice(index, 1);
        dropRain(drop.big);
      }
    }
    for (let index = streaks.length - 1; index >= 0; index -= 1) {
      const streak = streaks[index];
      if (!streak) continue;
      streak.age += dt;
      if (streak.age >= STREAK_TIME) {
        streaks.splice(index, 1);
        land(streak.x, streak.y, streak.big);
      }
    }
    for (let index = blooms.length - 1; index >= 0; index -= 1) {
      const bloom = blooms[index];
      if (!bloom) continue;
      bloom.age += dt;
      if (bloom.age >= BLOOM_TIME) {
        blooms.splice(index, 1);
        bake(bloom);
      }
    }

    // Rivulets run in jerks down the damp paper, thinning until they stop.
    const wet = contexts.wet;
    const stain = contexts.stain;
    for (let index = rivulets.length - 1; index >= 0; index -= 1) {
      const rivulet = rivulets[index];
      if (!rivulet) continue;
      rivulet.age += dt;
      const progress = rivulet.age / rivulet.life;
      if (progress >= 1 || rivulet.y > waterLine) {
        rivulets.splice(index, 1);
        continue;
      }
      const surge = 0.25 + Math.max(0, Math.sin(rivulet.age * 7 + rivulet.x)) * 1.2;
      const speed = (70 + rivulet.width * 18) * surge * (1 - progress * 0.7);
      rivulet.vx += ((Math.random() - 0.5) * 160 + live.wind * 14 - rivulet.vx * 3) * dt;
      const [fromX, fromY] = toScreen(rivulet.x, rivulet.y);
      rivulet.x += rivulet.vx * dt;
      rivulet.y += speed * dt;
      const [toX, toY] = toScreen(rivulet.x, rivulet.y);
      const width = rivulet.width * (1 - progress * 0.6) * size.scale * size.wetRes;
      for (const [ctx, alpha, scale] of [
        [wet, 0.5, 1],
        [stain, 0.22, 0.6],
      ] as const) {
        if (!ctx) continue;
        ctx.save();
        ctx.strokeStyle = rivulet.ink;
        ctx.globalAlpha = alpha;
        ctx.lineCap = "round";
        ctx.lineWidth = Math.max(0.6, width * scale);
        ctx.beginPath();
        ctx.moveTo(fromX * size.wetRes, fromY * size.wetRes);
        ctx.lineTo(toX * size.wetRes, toY * size.wetRes);
        ctx.stroke();
        ctx.restore();
      }
    }
    for (let index = stipples.length - 1; index >= 0; index -= 1) {
      const stipple = stipples[index];
      if (!stipple) continue;
      stipple.age += dt;
      if (stipple.age > 1.3) stipples.splice(index, 1);
    }

    // Paper dries: bodies fade in seconds, tide lines linger, and a dry sheet is wiped clean.
    dryFor = raining ? 0 : dryFor + dt;
    if (clock >= nextWetFade) {
      nextWetFade = clock + 0.5;
      fade(wet, raining ? 0.056 : 0.1);
    }
    if (clock >= nextStainFade) {
      nextStainFade = clock + 1;
      fade(stain, raining ? 0.04 : 0.07);
    }
    if (dryFor > 26 && rivulets.length === 0) {
      clear(wet);
      clear(stain);
      dryFor = -1e9;
    }
    if (raining) dryFor = 0;

    // Snow: gouache flakes drift down and settle on the roofs, the canopy and the lake.
    if (snowing) {
      snowDebt += dt * (mobile() ? 12 : 18);
      while (snowDebt >= 1) {
        snowDebt -= 1;
        spawnFlake(true);
      }
    }
    for (let index = flakes.length - 1; index >= 0; index -= 1) {
      const flake = flakes[index];
      if (!flake) continue;
      flake.sway += dt * (flake.near ? 1.7 : 1.1);
      flake.y += flake.speed * dt;
      flake.x += (live.wind * (flake.near ? 60 : 36) + Math.sin(flake.sway) * 16) * dt;
      const ground = groundAt(flake.kind, flake.x) + (flake.kind === "lake" ? flake.depth : 0);
      if (flake.y >= ground) {
        flakes.splice(index, 1);
        // Drifting sideways into a wall, the dab smudges and dissolves instead of settling.
        const side = flake.y - ground > 6 || (flake.kind === "canopy" && crownAt(flake.x) === null);
        splats.push({
          x: flake.x,
          y: side ? flake.y : ground,
          size: flake.size,
          age: 0,
          sprite: flake.sprite,
          water: flake.kind === "lake" || side,
        });
      }
    }
    for (let index = splats.length - 1; index >= 0; index -= 1) {
      const splat = splats[index];
      if (!splat) continue;
      splat.age += dt;
      if (splat.age > (splat.water ? 1.2 : 2.6)) {
        splats.splice(index, 1);
        if (!splat.water && snowing) settle(splat);
      }
    }

    // Settled snow builds up while it snows, then thaws away.
    airborne = snowing ? Math.min(1, airborne + dt) : Math.max(0, airborne - dt / 2.5);
    if (airborne === 0) flakes.length = 0;
    thawFor = snowing ? 0 : thawFor + dt;
    if (!snowing && settled > 0 && clock >= nextThaw) {
      nextThaw = clock + 0.25;
      fade(contexts.drift, 0.05);
      if (thawFor > 14) {
        clear(contexts.drift);
        settled = 0;
      }
    }
  }

  /** Bakes a landed flake into the drift layer as a flattened dab. */
  function settle(splat: Splat) {
    const drift = contexts.drift;
    const sprite = getFlakeSprites()?.[splat.sprite];
    if (!drift || !sprite || settled > 2600) return;
    settled += 1;
    const res = size.fxRes;
    const [x, y] = toScreen(splat.x, splat.y);
    const pixels = splat.size * size.scale * res * 2.6;
    drift.globalAlpha = 0.9;
    drift.drawImage(sprite, x * res - pixels / 2, y * res - pixels * 0.3, pixels, pixels * 0.55);
    drift.globalAlpha = 1;
  }

  function draw() {
    const fx = contexts.fx;
    const res = size.fxRes;
    const set = sprites();
    if (fx) {
      clear(fx);
      const ink = inks[read().phase];
      fx.strokeStyle = ink;
      fx.fillStyle = ink;
      fx.lineCap = "round";
      for (const streak of streaks) {
        const t = streak.age / STREAK_TIME;
        const [x, y] = toScreen(streak.x - streak.lean * (1 - t), streak.y - 70 * (1 - t));
        const [tx, ty] = toScreen(
          streak.x - streak.lean * (1 - t) - streak.lean * 0.4,
          streak.y - 70 * (1 - t) - 26,
        );
        fx.globalAlpha = 0.55;
        fx.lineWidth = (streak.big ? 2 : 1.1) * res;
        fx.beginPath();
        fx.moveTo(tx * res, ty * res);
        fx.lineTo(x * res, y * res);
        fx.stroke();
      }
      for (const bloom of blooms) {
        const blot = set?.blots[bloom.sprite];
        if (!blot) continue;
        // Blots bloom fast and settle: the pigment rushing out into the wet paper.
        const t = bloom.age / BLOOM_TIME;
        const grow = 1 - (1 - t) ** 3;
        fx.globalAlpha = 1;
        stamp(fx, blot, bloom.x, bloom.y, bloom.radius * (0.25 + grow * 0.75), res, bloom.turn);
      }
      for (const rivulet of rivulets) {
        const [x, y] = toScreen(rivulet.x, rivulet.y);
        fx.globalAlpha = 0.65 * (1 - rivulet.age / rivulet.life);
        fx.beginPath();
        fx.arc(
          x * res,
          y * res,
          Math.max(1, rivulet.width * 0.9 * size.scale) * res,
          0,
          Math.PI * 2,
        );
        fx.fill();
      }
      fx.lineWidth = 1 * res;
      for (const stipple of stipples) {
        const t = stipple.age / 1.3;
        const [x, y] = toScreen(stipple.x, stipple.y);
        fx.globalAlpha = 0.55 * (1 - t);
        for (let dot = 0; dot < 4; dot += 1) {
          const angle = stipple.seed + dot * 1.9;
          const reach = (2 + dot * 2.5) * size.scale;
          fx.fillRect(
            (x + Math.cos(angle) * reach * 2) * res,
            (y + Math.sin(angle) * reach * 0.5) * res,
            1.6 * res,
            1.6 * res,
          );
        }
        fx.beginPath();
        fx.ellipse(
          x * res,
          y * res,
          (3 + t * 14) * size.scale * res,
          (1 + t * 3.5) * size.scale * res,
          0,
          0,
          Math.PI * 2,
        );
        fx.stroke();
      }
      fx.globalAlpha = 1;
    }

    const snow = contexts.snow;
    const flakeSprites = getFlakeSprites();
    if (snow && flakeSprites) {
      clear(snow);
      const night = read().phase === "night";
      for (const flake of flakes) {
        const sprite = flakeSprites[flake.sprite];
        if (!sprite) continue;
        const [x, y] = toScreen(flake.x, flake.y);
        const pixels = flake.size * size.scale * res * 1.6;
        snow.globalAlpha = (flake.near ? 0.95 : 0.7) * (night ? 0.85 : 1) * airborne;
        snow.drawImage(sprite, x * res - pixels / 2, y * res - pixels / 2, pixels, pixels);
      }
      for (const splat of splats) {
        const sprite = flakeSprites[splat.sprite];
        if (!sprite) continue;
        const t = splat.age / (splat.water ? 1.2 : 2.6);
        const [x, y] = toScreen(splat.x, splat.y);
        const pixels = splat.size * size.scale * res * (1.6 + t * (splat.water ? 1.2 : 0.5));
        snow.globalAlpha = (splat.water ? 0.5 : 0.9) * (1 - t);
        // Settling: the dab squashes flat onto the ledge and sinks into the snow cap.
        snow.drawImage(
          sprite,
          x * res - pixels / 2,
          y * res - pixels * 0.3,
          pixels,
          pixels * (splat.water ? 0.3 : 0.55),
        );
      }
      snow.globalAlpha = 1;
    }
  }

  /** Reduced motion: one still painting of the weather, no animation. */
  function paintStill() {
    blooms.length = 0;
    rivulets.length = 0;
    stipples.length = 0;
    streaks.length = 0;
    flakes.length = 0;
    splats.length = 0;
    for (const ctx of Object.values(contexts)) clear(ctx);
    const live = read();
    lastWeather = live.weather;
    if (live.weather === "rain") {
      const count = Math.round((mobile() ? 30 : 60) * (0.5 + live.rain));
      for (let index = 0; index < count; index += 1) {
        const x = Math.random() * 1536;
        const y = 20 + Math.random() ** 0.8 * 1000;
        if (y > waterLine) continue;
        bake({
          x,
          y,
          radius: 4 + Math.random() ** 2 * 14,
          age: 0,
          sprite: index % 6,
          turn: Math.random() * 6.28,
        });
        if (index % 7 === 0) {
          startRivulet(x, y + 6, 2, inks[live.phase]);
        }
      }
      // Let the trails run to completion in one go.
      for (let frame = 0; frame < 240 && rivulets.length > 0; frame += 1) {
        const saved = clock;
        step(1 / 60);
        clock = saved;
        streaks.length = 0;
        blooms.length = 0;
      }
    }
    if (live.weather === "snow") {
      for (let index = 0; index < (mobile() ? 24 : 50); index += 1) spawnFlake(false);
      for (let index = 0; index < 700; index += 1) {
        const x = Math.random() * 1536;
        const ledge = index % 3 === 0 ? roofAt(x) : (crownAt(x)?.y ?? null);
        if (ledge === null) continue;
        settle({
          x,
          y: ledge,
          size: 3 + Math.random() * 4,
          age: 0,
          sprite: index % 4,
          water: false,
        });
      }
      draw();
      flakes.length = 0;
      return;
    }
    draw();
  }

  return { resize, step, draw, paintStill };
}
