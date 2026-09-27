import type { DayPhase, Weather } from "../../../../scene-provider";
import { inks, keyGap, pick, random, typeFace, weatherWords } from "./type-kit";

export type WeatherState = {
  phase: DayPhase;
  weather: Weather;
  /** 0–1 rain strength. */
  rain: number;
  /** -1 to 1. */
  wind: number;
  /** Shown in the typed weather memo, when known. */
  temperature: number | null;
};

/** One struck glyph: it fades over its life in steps, like ink drying unevenly. */
type Strike = {
  x: number;
  y: number;
  ch: string;
  rotate: number;
  life: number;
  age: number;
  alpha: number;
  old: boolean;
};

type Column = { x: number; y: number; end: number; near: boolean; old: boolean };
type Flake = {
  x: number;
  y: number;
  px: number;
  py: number;
  ch: string;
  size: 0 | 1 | 2;
  vy: number;
  sway: number;
  ground: number;
  old: boolean;
};
type Bird = { x: number; y: number; flap: number };
type Memo = {
  text: string;
  count: number;
  state: "typing" | "holding" | "erasing" | "done";
  nextKey: number;
};

/** The weather strikes on the paper's key clock, not the display's: 20 strikes a second. */
const strikeMs = 50;
const art = { width: 1536, height: 1024, matLeft: 20, matTop: 20, matRight: 1516, matBottom: 1006 };
const water = { top: 948, bottom: 1004 };
const snowSizes = [15, 21, 28] as const;
const rainNear = { size: 30, fall: 42, life: 4 };
const rainFar = { size: 19, fall: 26, life: 3 };

const smoothstep = (t: number) => t * t;

/** Canvas weather: typed rain columns, asterisk snow, ink impressions and the carriage return. */
export function createTypedWeather(
  canvas: HTMLCanvasElement,
  scene: HTMLElement | null,
  reducedMotion: boolean,
) {
  const context = canvas.getContext("2d");
  const roll = random(0x7e4e);
  let state: WeatherState | null = null;
  let width = 0;
  let height = 0;
  let dpr = 1;
  let scale = 1;
  let offsetX = 0;
  let columns: Column[] = [];
  let flakes: Flake[] = [];
  let birds: Bird[] = [];
  let trail: Strike[] = [];
  let marks: Strike[] = [];
  let memo: Memo | null = null;
  let sweep: { start: number; ding: number } | null = null;
  let frame = 0;
  let lastStep = 0;
  let stepCount = 0;

  const visible = () => {
    const left = Math.max(art.matLeft, -offsetX / scale);
    const right = Math.min(art.matRight, (width - offsetX) / scale);
    return {
      left,
      right,
      span: Math.max(0, right - left),
      bottom: Math.min(art.matBottom, height / scale),
    };
  };

  /** Somewhere on the lake, or its visible edge when a wide screen crops the bottom off. */
  const lakeY = () => {
    const bottom = Math.min(water.bottom, visible().bottom - 8);
    const top = Math.min(water.top, bottom - 4);
    return top + roll() * (bottom - top);
  };

  const sweepX = (now: number) => {
    if (!sweep) return Number.NEGATIVE_INFINITY;
    const { left, right } = visible();
    const t = Math.min(1, (now - sweep.start) / 650);
    return right - (right - left + 40) * smoothstep(t);
  };

  /** New weather may only appear where the carriage has already passed. */
  const spawnX = (now: number) => {
    const { left, right } = visible();
    const lowest = sweep ? Math.max(left, sweepX(now)) : left;
    const wind = state?.wind ?? 0;
    // Rain leaning with the wind starts upwind so it still crosses the page.
    const lean = wind * 300;
    return lowest + roll() * Math.max(10, right - lowest) - lean * roll();
  };

  const rainGlyph = (near: boolean, wind: number) => {
    if (!near) return pick(["'", "'", ",", "."], roll());
    if (Math.abs(wind) < 0.18) return pick(["|", "|", "|", "'", "!"], roll());
    return pick(wind > 0 ? ["\\", "\\", "'"] : ["/", "/", "'"], roll());
  };

  const newColumn = (now: number, near: boolean, scatter: boolean): Column => {
    const endWater = roll() < 0.62;
    return {
      x: spawnX(now),
      y: scatter ? roll() * 900 : -40 - roll() * 120,
      end: endWater ? lakeY() : 760 + roll() * 170,
      near,
      old: false,
    };
  };

  const newFlake = (now: number, scatter: boolean): Flake => {
    const size = pick([0, 0, 1, 1, 2] as const, roll());
    const y = scatter ? roll() * 900 : -30 - roll() * 120;
    const x = spawnX(now);
    return {
      x,
      y,
      px: x,
      py: y,
      ch: pick(["*", "*", "✻", "·", "*", "+", "✻"], roll()),
      size,
      vy: 3 + size * 2.2 + roll() * 3,
      sway: roll() * Math.PI * 2,
      ground: 905 + roll() * 95,
      old: false,
    };
  };

  const populate = (now: number, scatterAll: boolean) => {
    let scatter = scatterAll;
    if (!state) return;
    const { span, right } = visible();
    // While the carriage returns, only the part of the page it has passed gets new weather.
    const revealed = sweep
      ? Math.min(1, Math.max(0, (right - sweepX(now)) / Math.max(1, span)))
      : 1;
    const share = (span / art.width) * revealed;
    if (sweep) scatter = true;
    const rain = state.weather === "rain" ? Math.max(0.3, state.rain) : 0;
    const nearCount = state.weather === "rain" ? Math.round(share * (22 + rain * 110)) : 0;
    const farCount = state.weather === "rain" ? Math.round(share * (16 + rain * 70)) : 0;
    const flakeCount = state.weather === "snow" ? Math.round(share * 110) : 0;
    const birdCount = state.weather === "clear" && state.phase !== "night" ? 3 : 0;
    const live = (items: readonly { old: boolean }[]) => items.filter((item) => !item.old).length;
    const nearLive = columns.filter((column) => column.near && !column.old).length;
    const farLive = columns.filter((column) => !column.near && !column.old).length;
    for (let i = nearLive; i < nearCount; i += 1) columns.push(newColumn(now, true, scatter));
    for (let i = farLive; i < farCount; i += 1) columns.push(newColumn(now, false, scatter));
    for (let i = live(flakes); i < flakeCount; i += 1) flakes.push(newFlake(now, scatter));
    // Excess from a weakening shower simply isn't retyped.
    let nearExcess = nearLive - nearCount;
    let farExcess = farLive - farCount;
    columns = columns.filter((column) => {
      if (column.old || column.y < column.end - 200) return true;
      if (column.near && nearExcess > 0) return nearExcess-- <= 0;
      if (!column.near && farExcess > 0) return farExcess-- <= 0;
      return true;
    });
    if (flakes.length > flakeCount + 40) flakes = flakes.slice(0, flakeCount);
    if (birds.length !== birdCount) {
      birds = Array.from({ length: birdCount }, (_, index) => ({
        x: visible().left + roll() * span * 0.6,
        y: 120 + index * 46 + roll() * 60,
        flap: index,
      }));
    }
  };

  const impress = (x: number, y: number, ch: string, life: number, alpha: number, old = false) => {
    marks.push({ x, y, ch, rotate: (roll() - 0.5) * 0.3, life, age: 0, alpha, old });
    if (marks.length > 220) marks.splice(0, marks.length - 220);
  };

  const step = (now: number) => {
    if (!state) return;
    stepCount += 1;
    const wind = state.wind;
    const edge = sweepX(now);
    if (sweep && now - sweep.start > 700) sweep = null;
    const erase = (item: { x: number; old: boolean }) => !(item.old && item.x > edge);

    columns = columns.filter(erase);
    flakes = flakes.filter(erase);
    trail = trail.filter(erase);
    marks = marks.filter(erase);

    for (const column of columns) {
      const spec = column.near ? rainNear : rainFar;
      column.y += spec.fall * (0.9 + roll() * 0.25);
      column.x += wind * spec.fall * 0.5;
      if (column.y >= column.end) {
        if (column.end >= water.top - 6) {
          // The last strike lands on the lake and leaves its impression there.
          impress(
            column.x,
            column.end,
            pick([",", ".", "~", ".", "_", ","], roll()),
            70,
            column.near ? 0.62 : 0.4,
            column.old,
          );
          if (column.near && roll() < 0.18)
            impress(column.x + 14, column.end + 3, "·", 50, 0.4, column.old);
        }
        if (column.old) {
          column.x = Number.POSITIVE_INFINITY;
        } else {
          Object.assign(column, newColumn(now, column.near, false));
        }
        continue;
      }
      if (column.y > -20) {
        trail.push({
          x: column.x + (roll() - 0.5) * 1.6,
          y: column.y + (roll() - 0.5) * 2,
          ch: rainGlyph(column.near, wind),
          rotate: (roll() - 0.5) * 0.08,
          life: spec.life,
          age: 0,
          alpha: (column.near ? 0.6 : 0.36) + roll() * 0.25,
          old: column.old,
        });
      }
    }
    columns = columns.filter((column) => Number.isFinite(column.x));

    for (const flake of flakes) {
      flake.px = flake.x;
      flake.py = flake.y;
      flake.sway += 0.12;
      flake.y += flake.vy;
      flake.x += Math.sin(flake.sway) * 2.4 + wind * (3 + flake.size * 1.5);
      if (flake.y >= flake.ground) {
        impress(flake.x, flake.ground, pick([".", "*", "·", "."], roll()), 140, 0.55, flake.old);
        if (flake.old) flake.x = Number.POSITIVE_INFINITY;
        else Object.assign(flake, newFlake(now, false));
      }
    }
    flakes = flakes.filter((flake) => Number.isFinite(flake.x));

    const { left, right } = visible();
    for (const bird of birds) {
      bird.flap += 1;
      bird.x += 3.2 + Math.max(0, wind) * 3;
      bird.y += Math.sin(bird.flap * 0.4) * 1.5;
      if (bird.x > right + 40) bird.x = left - 40;
    }

    for (const strike of trail) strike.age += 1;
    for (const mark of marks) mark.age += 1;
    trail = trail.filter((strike) => strike.age < strike.life);
    marks = marks.filter((mark) => mark.age < mark.life);

    if (memo && now >= memo.nextKey) {
      if (memo.state === "typing") {
        memo.count += 1;
        if (memo.count >= memo.text.length) {
          memo.state = "holding";
          memo.nextKey = now + 3800;
        } else memo.nextKey = now + keyGap(roll) * 1.3;
      } else if (memo.state === "holding") {
        memo.state = "erasing";
        memo.nextKey = now;
      } else if (memo.state === "erasing") {
        memo.count -= 1;
        memo.nextKey = now + keyGap(roll, true);
        if (memo.count <= 0) memo = null;
      }
    }

    if (sweep || stepCount % 4 === 0) populate(now, false);
  };

  const pale = [241, 232, 208] as const;
  /**
   * Ribbon ink at `alpha`. Below the skyline the paper is dark, so by day the strikes there turn
   * to a pale correction-ribbon ink that still reads against the city.
   */
  let night = 0;
  /** How far toward night the paper looks: the phase, or a backdrop's visual time scrub. */
  const readNight = () => {
    const scrubbed = Number.parseFloat(scene?.style.getPropertyValue("--tl-night") ?? "");
    night = Number.isFinite(scrubbed) ? scrubbed : state?.phase === "night" ? 1 : 0;
  };
  const inkOf = (alpha: number, y = 0) => {
    const phase = state?.phase === "night" || !state ? "day" : state.phase;
    const day = inks[phase].inkRgb;
    const low = Math.min(1, Math.max(0, (y - 540) / 140));
    const t = night + (1 - night) * low;
    const mix = (index: 0 | 1 | 2) => Math.round(day[index] + (pale[index] - day[index]) * t);
    const a = Math.max(0, Math.min(1, alpha * (1 + low * (1 - night) * 0.15)));
    return `rgb(${mix(0)} ${mix(1)} ${mix(2)} / ${a.toFixed(3)})`;
  };

  const glyph = (x: number, y: number, ch: string, rotate: number, skew: number) => {
    if (!context) return;
    context.translate(x, y);
    if (rotate) context.rotate(rotate);
    if (skew) context.transform(1, 0, skew, 1, 0, 0);
    context.fillText(ch, 0, 0);
    context.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * offsetX, 0);
  };

  const draw = (now: number) => {
    if (!context || !state) return;
    readNight();
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * offsetX, 0);
    context.save();
    context.beginPath();
    context.rect(art.matLeft, art.matTop, art.matRight - art.matLeft, art.matBottom - art.matTop);
    context.clip();
    context.textAlign = "center";
    context.textBaseline = "middle";
    const skew = -state.wind * 0.32;

    // Rain columns: the head is freshly struck, the strikes above it are already fading.
    for (const near of [false, true]) {
      const spec = near ? rainNear : rainFar;
      context.font = `700 ${spec.size}px ${typeFace}`;
      for (const strike of trail) {
        if ((strike.life === rainNear.life) !== near) continue;
        const fade = 1 - strike.age / strike.life;
        context.fillStyle = inkOf(strike.alpha * (0.35 + fade * 0.65), strike.y);
        glyph(strike.x, strike.y, strike.ch, strike.rotate, skew);
      }
    }

    // Impressions on the water and snow line: faint, then fainter, in discrete steps.
    context.font = `700 18px ${typeFace}`;
    for (const mark of marks) {
      const fade = 1 - Math.floor((mark.age / mark.life) * 5) / 5;
      context.fillStyle = inkOf(mark.alpha * fade, mark.y);
      glyph(mark.x, mark.y, mark.ch, mark.rotate, 0);
    }

    // Snow: each flake is re-struck where it now is; the previous strike ghosts behind it.
    for (const size of [0, 1, 2] as const) {
      context.font = `700 ${snowSizes[size]}px ${typeFace}`;
      for (const flake of flakes) {
        if (flake.size !== size) continue;
        context.fillStyle = inkOf(0.18, flake.py);
        glyph(flake.px, flake.py, flake.ch, 0, 0);
        context.fillStyle = inkOf(0.5 + size * 0.14, flake.y);
        glyph(flake.x, flake.y, flake.ch, Math.sin(flake.sway) * 0.2, skew * 0.5);
      }
    }

    if (birds.length > 0) {
      context.font = `700 22px ${typeFace}`;
      context.fillStyle = inkOf(0.55);
      for (const bird of birds) glyph(bird.x, bird.y, bird.flap % 6 < 3 ? "v" : "~", 0, 0);
    }

    const { left, right } = visible();
    if (memo && memo.count > 0) {
      context.font = `700 20px ${typeFace}`;
      context.textAlign = "left";
      context.fillStyle = inkOf(0.62);
      const text = memo.text.slice(0, memo.count);
      context.fillText(text, left + 46, 70);
      // The caret: where the next key will land.
      context.fillStyle = night > 0.5 ? inks.night.red : inks[state.phase].red;
      context.fillRect(left + 46 + context.measureText(text).width + 3, 80, 11, 2.5);
      context.textAlign = "center";
    }

    if (sweep) {
      const x = sweepX(now);
      context.fillStyle = inkOf(0.5);
      context.fillRect(x, art.matTop, 2.5, art.matBottom - art.matTop);
      context.fillStyle = inkOf(0.14);
      context.fillRect(x + 2.5, art.matTop, 26, art.matBottom - art.matTop);
      const ding = Math.max(0, 1 - (now - sweep.ding) / 700);
      if (ding > 0) {
        context.font = `italic 700 22px ${typeFace}`;
        context.fillStyle = night > 0.5 ? inks.night.red : inks[state.phase].red;
        context.globalAlpha = ding;
        context.fillText("ding!", right - 70, 104);
        context.globalAlpha = 1;
      }
    }
    context.restore();
  };

  const loop = (now: number) => {
    frame = 0;
    if (document.hidden) return;
    if (now - lastStep >= strikeMs) {
      lastStep = now - ((now - lastStep) % strikeMs);
      step(now);
      draw(now);
    }
    frame = requestAnimationFrame(loop);
  };

  const drawStill = () => {
    // Reduced motion: one typed page of weather, struck once and left to dry.
    const now = performance.now();
    columns = [];
    flakes = [];
    trail = [];
    marks = [];
    populate(now, true);
    for (const column of columns) {
      const spec = column.near ? rainNear : rainFar;
      for (let i = 0; i < spec.life; i += 1) {
        trail.push({
          x: column.x - (state?.wind ?? 0) * spec.fall * 0.5 * i,
          y: column.y - spec.fall * i,
          ch: rainGlyph(column.near, state?.wind ?? 0),
          rotate: (roll() - 0.5) * 0.08,
          life: spec.life,
          age: i,
          alpha: (column.near ? 0.55 : 0.34) + roll() * 0.2,
          old: false,
        });
      }
      if (column.end >= water.top - 6 && roll() < 0.6)
        impress(column.x, column.end, pick([",", ".", "~"], roll()), 10, 0.5);
    }
    for (const flake of flakes) {
      flake.px = flake.x;
      flake.py = flake.y;
      if (roll() < 0.3) impress(flake.x, flake.ground, ".", 10, 0.5);
    }
    draw(now);
  };

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    width = rect.width;
    height = rect.height;
    dpr = Math.min(window.devicePixelRatio || 1, width < 600 ? 1.5 : 2);
    canvas.width = Math.max(1, Math.round(width * dpr));
    canvas.height = Math.max(1, Math.round(height * dpr));
    scale = Math.max(width / art.width, height / art.height);
    offsetX = (width - art.width * scale) / 2;
    if (reducedMotion) drawStill();
  };

  const onVisibility = () => {
    if (!document.hidden && !reducedMotion && !frame) frame = requestAnimationFrame(loop);
  };

  const observer = typeof ResizeObserver === "function" ? new ResizeObserver(resize) : null;
  observer?.observe(canvas);
  window.addEventListener("resize", resize);
  document.addEventListener("visibilitychange", onVisibility);
  resize();

  return {
    update(next: WeatherState) {
      const previous = state;
      state = next;
      if (reducedMotion) {
        drawStill();
        return;
      }
      const now = performance.now();
      if (!previous || previous.weather !== next.weather) {
        if (previous) {
          // Carriage return: the old weather belongs to the line being swept away.
          for (const item of [...columns, ...flakes, ...trail, ...marks]) item.old = true;
          sweep = { start: now, ding: now };
        }
        const temperature = next.temperature === null ? "" : `  ${next.temperature}°C`;
        memo = {
          text: `${weatherWords[next.weather]}.${temperature}`,
          count: 0,
          state: "typing",
          nextKey: now + (previous ? 700 : 400),
        };
        populate(now, !previous);
      }
      if (!frame) frame = requestAnimationFrame(loop);
    },
    destroy() {
      cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
    },
  };
}

export type TypedWeather = ReturnType<typeof createTypedWeather>;
