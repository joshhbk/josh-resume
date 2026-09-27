import type { DayPhase, Weather } from "../../../../scene-provider";
import { advance, keyGap, pick, random } from "./type-kit";

const svgNS = "http://www.w3.org/2000/svg";

export type SkyState = {
  phase: DayPhase;
  weather: Weather;
  /** 0–1 cloud cover. */
  cloud: number;
  /** -1 to 1. */
  wind: number;
};

type Line = { main: SVGTextElement; ghost: SVGTextElement; text: string };

type Cloud = {
  group: SVGGElement;
  lines: Line[];
  line: number;
  char: number;
  state: "typing" | "holding" | "erasing" | "gone";
  nextKey: number;
  holdUntil: number;
  x: number;
  y: number;
  size: number;
  nextDrift: number;
  fast: boolean;
};

type Glyph = { x: number; y: number; ch: string; size: number; red?: boolean; rotate: number };

type Celestial = {
  group: SVGGElement;
  glyphs: SVGTextElement[];
  twinklers: SVGTextElement[];
  struck: number;
  state: "typing" | "holding" | "erasing" | "gone";
  nextKey: number;
};

const cloudRamps: Record<Weather, readonly string[]> = {
  clear: [" ", "~", "-", "~", "~"],
  cloudy: [" ", ".", ":", "░", "+", "%", "#", "@"],
  rain: [":", "%", "▒", "#", "#", "@", "▓", "M"],
  snow: [" ", ".", "·", "*", ":", "░", "+"],
};

const cloudWords: Record<Weather, string> = {
  clear: "wisp",
  cloudy: "cloud",
  rain: "rain",
  snow: "flurry",
};

/** Stars of the artwork's night sky, re-typed as glyphs. */
const starPoints = [
  [120, 105],
  [295, 157],
  [460, 80],
  [610, 199],
  [915, 108],
  [1050, 235],
  [1392, 112],
  [1460, 300],
  [240, 254],
  [1002, 156],
  [1323, 336],
  [700, 60],
  [1180, 70],
  [380, 300],
] as const;

function rayGlyph(angle: number): string {
  // Screen space: y grows downward, so a ray heading down-right is a backslash.
  const a = ((angle % Math.PI) + Math.PI) % Math.PI;
  if (a < Math.PI / 8 || a > (7 * Math.PI) / 8) return "-";
  if (a < (3 * Math.PI) / 8) return "\\";
  if (a < (5 * Math.PI) / 8) return "|";
  return "/";
}

function sunGlyphs(roll: () => number, cx: number): Glyph[] {
  const cy = 240;
  const glyphs: Glyph[] = [];
  const ring = 18;
  for (let i = 0; i < ring; i += 1) {
    const angle = (i / ring) * Math.PI * 2 - Math.PI / 2;
    const side = Math.cos(angle);
    const ch = side > 0.92 ? ")" : side < -0.92 ? "(" : pick(["O", "o", "O", "O"], roll());
    glyphs.push({
      x: cx + Math.cos(angle) * 62,
      y: cy + Math.sin(angle) * 62,
      ch,
      size: 32,
      red: true,
      rotate: (roll() - 0.5) * 8,
    });
  }
  for (let i = 0; i < 8; i += 1) {
    const angle = (i / 8) * Math.PI * 2 + 0.2;
    glyphs.push({
      x: cx + Math.cos(angle) * 30,
      y: cy + Math.sin(angle) * 30,
      ch: pick(["o", ".", "o", ":"], roll()),
      size: 24,
      red: true,
      rotate: 0,
    });
  }
  glyphs.push({ x: cx, y: cy, ch: "@", size: 34, red: true, rotate: 0 });
  for (let i = 0; i < 12; i += 1) {
    const angle = (i / 12) * Math.PI * 2 - Math.PI / 2;
    for (const radius of [102, 130]) {
      glyphs.push({
        x: cx + Math.cos(angle) * radius,
        y: cy + Math.sin(angle) * radius,
        ch: rayGlyph(angle),
        size: radius > 110 ? 24 : 28,
        red: radius < 110,
        rotate: (roll() - 0.5) * 6,
      });
    }
  }
  return glyphs;
}

function moonGlyphs(roll: () => number, mx: number): Glyph[] {
  const glyphs: Glyph[] = [
    { x: mx, y: 250, ch: "(", size: 190, rotate: -4 },
    { x: mx + 4, y: 253, ch: "(", size: 190, rotate: -2 },
    { x: mx + 10, y: 214, ch: ".", size: 30, rotate: 0 },
    { x: mx - 3, y: 292, ch: "·", size: 30, rotate: 0 },
  ];
  for (const [x, y] of starPoints) {
    glyphs.push({
      x,
      y,
      ch: pick(["+", "*", ".", "+", "·", "*"], roll()),
      size: 20 + roll() * 12,
      rotate: (roll() - 0.5) * 20,
    });
  }
  return glyphs;
}

/**
 * A typed line sits slightly off the platen: a small tilt and baseline shift for the whole line.
 * (Per-glyph `rotate`/`dy` lists looked nicer but made every sky repaint re-lay each glyph.)
 */
function lineSkew(x: number, y: number, roll: () => number): string {
  return `rotate(${((roll() - 0.5) * 1.6).toFixed(2)} ${x.toFixed(0)} ${y.toFixed(0)}) translate(0 ${((roll() - 0.5) * 2.4).toFixed(1)})`;
}

function cloudRows(weather: Weather, roll: () => number): { col: number; text: string }[] {
  const ramp = cloudRamps[weather];
  const wisp = weather === "clear";
  const rows = wisp
    ? 1 + Math.floor(roll() * 2)
    : weather === "rain"
      ? 4 + Math.floor(roll() * 3)
      : 3 + Math.floor(roll() * 3);
  const width = wisp
    ? 8 + Math.floor(roll() * 8)
    : weather === "rain"
      ? 18 + Math.floor(roll() * 12)
      : 12 + Math.floor(roll() * 13);
  const word = cloudWords[weather];
  const wordRow = Math.floor(rows / 2);
  const result: { col: number; text: string }[] = [];
  for (let row = 0; row < rows; row += 1) {
    const t = (row + 0.5) / rows;
    const bulge = row === rows - 1 && rows > 2 ? 0.95 : 0.5 + 0.5 * Math.sin(t * Math.PI);
    const span = Math.max(3, Math.round(width * bulge + (roll() - 0.5) * 3));
    const col = Math.round((width - span) / 2 + (roll() - 0.5) * 2);
    let text = "";
    for (let c = 0; c < span; c += 1) {
      const edge = Math.min(c, span - 1 - c) / Math.max(1, span / 2);
      const density = wisp
        ? roll()
        : Math.min(0.999, edge * 0.55 + Math.sin(t * Math.PI) * 0.35 + roll() * 0.3);
      text += pick(ramp, density);
    }
    if (!wisp && row === wordRow && span > word.length + 4 && roll() < 0.7) {
      const at = 2 + Math.floor(roll() * (span - word.length - 4));
      text = text.slice(0, at) + word + text.slice(at + word.length);
    }
    result.push({ col, text });
  }
  return result;
}

/** The typed sky: clouds struck line by line and backspaced away, and a typed sun or moon. */
export function createTypedSky(root: SVGGElement, reducedMotion: boolean) {
  const roll = random(0x5eed);
  const celestialLayer = document.createElementNS(svgNS, "g");
  const cloudLayer = document.createElementNS(svgNS, "g");
  celestialLayer.setAttribute("data-typewriter", "celestial");
  cloudLayer.setAttribute("data-typewriter", "clouds");
  root.append(celestialLayer, cloudLayer);

  let state: SkyState | null = null;
  let clouds: Cloud[] = [];
  let celestials: Celestial[] = [];
  let spawnAt: number[] = [];
  let timer = 0;
  let nextTwinkle = 0;

  const visibleArt = () => {
    const box = root.ownerSVGElement?.getBoundingClientRect();
    if (!box || box.width === 0 || box.height === 0) return { left: 0, right: 1536 };
    const scale = Math.max(box.width / 1536, box.height / 1024);
    const offset = (box.width - 1536 * scale) / 2;
    return { left: -offset / scale, right: (box.width - offset) / scale };
  };

  const makeText = (className: string) => {
    const text = document.createElementNS(svgNS, "text");
    text.setAttribute("class", className);
    return text;
  };

  const spawnCloud = (now: number, delay: number, weather: Weather) => {
    const rows = cloudRows(weather, roll);
    const size = weather === "clear" ? 26 : 20 + Math.floor(roll() * 6);
    const lineHeight = size * 1.05;
    const group = document.createElementNS(svgNS, "g");
    group.setAttribute("class", `tw-cloud tw-cloud-${weather}`);
    const lines = rows.map(({ col, text }, row) => {
      const main = makeText("tw-cloud-ink");
      const ghost = makeText("tw-cloud-ghost");
      const x = col * size * advance;
      const y = row * lineHeight;
      main.setAttribute("x", x.toFixed(1));
      main.setAttribute("y", y.toFixed(1));
      main.setAttribute("transform", lineSkew(x, y, roll));
      ghost.setAttribute("x", (x + 1.1).toFixed(1));
      ghost.setAttribute("y", (y + 0.8).toFixed(1));
      // The ghost overstrike only catches some keys, which reads as uneven ribbon ink.
      const ghostText = Array.from(text, (ch) => (roll() < 0.55 ? ch : " ")).join("");
      ghost.dataset.text = ghostText;
      group.append(ghost, main);
      return { main, ghost, text };
    });
    group.setAttribute("font-size", String(size));
    const x = -60 + roll() * 1500;
    const y = 70 + roll() * (weather === "rain" ? 330 : 360);
    group.setAttribute("transform", `translate(${x.toFixed(0)} ${y.toFixed(0)})`);
    cloudLayer.append(group);
    const cloud: Cloud = {
      group,
      lines,
      line: 0,
      char: 0,
      state: "typing",
      nextKey: now + delay,
      holdUntil: 0,
      x,
      y,
      size,
      nextDrift: 0,
      fast: false,
    };
    if (reducedMotion) {
      for (const line of lines) setTyped(line, line.text.length);
      cloud.state = "holding";
      cloud.holdUntil = Number.POSITIVE_INFINITY;
    }
    clouds.push(cloud);
  };

  const setTyped = (line: Line, count: number) => {
    line.main.textContent = line.text.slice(0, count);
    line.ghost.textContent = (line.ghost.dataset.text ?? "").slice(0, count);
  };

  const targetClouds = (s: SkyState) => {
    if (s.weather === "clear") return 1;
    if (s.weather === "rain") return 7;
    if (s.weather === "snow") return 5;
    return Math.round(3 + s.cloud * 4);
  };

  const startErase = (cloud: Cloud, now: number, fast: boolean) => {
    if (cloud.line >= cloud.lines.length || cloud.state === "holding") {
      cloud.line = cloud.lines.length - 1;
      cloud.char = cloud.lines[cloud.line]?.text.length ?? 0;
    }
    cloud.state = "erasing";
    cloud.fast = fast;
    cloud.nextKey = now;
  };

  const driftGap = (s: SkyState) => 3600 / (0.35 + Math.abs(s.wind) * 2.2);

  const stepCloud = (cloud: Cloud, now: number, s: SkyState) => {
    if (cloud.state === "holding") {
      if (now >= cloud.nextDrift) {
        // Clouds don't glide: the carriage advances them a whole character at a time.
        cloud.x += cloud.size * advance * (s.wind < -0.05 ? -1 : 1);
        cloud.group.setAttribute(
          "transform",
          `translate(${cloud.x.toFixed(0)} ${cloud.y.toFixed(0)})`,
        );
        cloud.nextDrift = now + driftGap(s) * (0.7 + roll() * 0.6);
      }
      if (now >= cloud.holdUntil || cloud.x > 1560 || cloud.x < -420) startErase(cloud, now, false);
      return;
    }
    if (now < cloud.nextKey) return;
    const line = cloud.lines[cloud.line];
    if (cloud.state === "typing") {
      if (!line) {
        cloud.state = "holding";
        cloud.holdUntil = now + 12_000 + roll() * 14_000;
        cloud.nextDrift = now + driftGap(s);
        return;
      }
      cloud.char += 1;
      setTyped(line, cloud.char);
      const ch = line.text[cloud.char - 1];
      if (cloud.char >= line.text.length) {
        cloud.line += 1;
        cloud.char = 0;
        cloud.nextKey = now + 160 + roll() * 180; // carriage return
      } else {
        cloud.nextKey = now + (ch === " " ? 18 : keyGap(roll));
      }
      return;
    }
    if (cloud.state === "erasing") {
      if (!line) {
        cloud.state = "gone";
        return;
      }
      cloud.char -= 1;
      setTyped(line, Math.max(0, cloud.char));
      if (cloud.char <= 0) {
        cloud.line -= 1;
        cloud.char = cloud.lines[cloud.line]?.text.length ?? 0;
        cloud.nextKey = now + (cloud.fast ? 20 : 120);
      } else {
        cloud.nextKey = now + keyGap(roll, true) * (cloud.fast ? 0.5 : 1);
      }
    }
  };

  const composeCelestial = (s: SkyState, now: number, delay: number) => {
    const group = document.createElementNS(svgNS, "g");
    group.setAttribute(
      "class",
      `tw-celestial tw-celestial-${s.phase === "night" ? "moon" : "sun"}`,
    );
    // Keep the sun and moon on the paper when a narrow screen crops the artwork's sides.
    const { left, right } = visibleArt();
    const place = (x: number, margin: number) =>
      Math.min(Math.max(x, left + margin), right - margin);
    const specs =
      s.phase === "night" ? moonGlyphs(roll, place(965, 110)) : sunGlyphs(roll, place(1250, 160));
    const glyphs = specs.map((spec, index) => {
      const text = makeText(spec.red ? "tw-glyph tw-red" : "tw-glyph");
      text.setAttribute("x", spec.x.toFixed(1));
      text.setAttribute("y", spec.y.toFixed(1));
      text.setAttribute("font-size", spec.size.toFixed(0));
      text.setAttribute(
        "transform",
        `rotate(${spec.rotate.toFixed(1)} ${spec.x.toFixed(0)} ${spec.y.toFixed(0)})`,
      );
      if (s.phase === "night" && index >= 4) text.classList.add("tw-star");
      text.textContent = spec.ch;
      group.append(text);
      return text;
    });
    celestialLayer.append(group);
    const celestial: Celestial = {
      group,
      glyphs,
      twinklers: glyphs.filter((glyph) => glyph.classList.contains("tw-star")),
      struck: 0,
      state: "typing",
      nextKey: now + delay,
    };
    if (reducedMotion) {
      for (const glyph of glyphs) glyph.classList.add("tw-struck");
      celestial.struck = glyphs.length;
      celestial.state = "holding";
    }
    celestials.push(celestial);
  };

  const stepCelestial = (celestial: Celestial, now: number) => {
    if (celestial.state === "holding" || celestial.state === "gone" || now < celestial.nextKey)
      return;
    if (celestial.state === "typing") {
      celestial.glyphs[celestial.struck]?.classList.add("tw-struck");
      celestial.struck += 1;
      if (celestial.struck >= celestial.glyphs.length) celestial.state = "holding";
      celestial.nextKey = now + keyGap(roll);
      return;
    }
    celestial.struck -= 1;
    celestial.glyphs[celestial.struck]?.classList.remove("tw-struck");
    if (celestial.struck <= 0) celestial.state = "gone";
    celestial.nextKey = now + keyGap(roll, true) * 0.6;
  };

  const twinkle = (now: number) => {
    if (now < nextTwinkle) return;
    nextTwinkle = now + 350 + roll() * 900;
    const live = celestials.find((celestial) => celestial.state === "holding");
    const star = live?.twinklers[Math.floor(roll() * live.twinklers.length)];
    // A re-strike: the key hits the same spot again, ink flashes dark then settles.
    if (star && typeof star.animate === "function") {
      star.animate([{ opacity: 0.15 }, { opacity: 1 }, { opacity: 0.8 }], {
        duration: 320,
        easing: "steps(4, end)",
      });
    }
  };

  const tick = () => {
    if (document.hidden || !state) return;
    const now = performance.now();
    const s = state;
    for (const celestial of celestials) stepCelestial(celestial, now);
    for (const cloud of clouds) stepCloud(cloud, now, s);
    celestials = celestials.filter((celestial) => {
      if (celestial.state !== "gone") return true;
      celestial.group.remove();
      return false;
    });
    clouds = clouds.filter((cloud) => {
      if (cloud.state !== "gone") return true;
      cloud.group.remove();
      spawnAt.push(now + 600 + roll() * 1600);
      return false;
    });
    const living = clouds.filter((cloud) => cloud.state !== "erasing").length;
    const wanted = targetClouds(s) - living - spawnAt.length;
    for (let i = 0; i < wanted; i += 1) spawnAt.push(now + 300 + i * 450 + roll() * 400);
    spawnAt = spawnAt.filter((at) => {
      if (at > now) return true;
      if (clouds.filter((cloud) => cloud.state !== "erasing").length < targetClouds(s)) {
        spawnCloud(now, 0, s.weather);
      }
      return false;
    });
    twinkle(now);
  };

  const rebuildStill = (s: SkyState) => {
    for (const cloud of clouds) cloud.group.remove();
    for (const celestial of celestials) celestial.group.remove();
    clouds = [];
    celestials = [];
    const now = performance.now();
    for (let i = 0; i < targetClouds(s); i += 1) spawnCloud(now, 0, s.weather);
    composeCelestial(s, now, 0);
  };

  if (!reducedMotion) timer = window.setInterval(tick, 24);

  return {
    update(next: SkyState) {
      const previous = state;
      state = next;
      root.dataset.weather = next.weather;
      if (reducedMotion) {
        if (!previous || previous.weather !== next.weather || previous.phase !== next.phase) {
          rebuildStill(next);
        }
        return;
      }
      const now = performance.now();
      const weatherChanged = !previous || previous.weather !== next.weather;
      const skyChanged = !previous || (previous.phase === "night") !== (next.phase === "night");
      if (weatherChanged && previous) {
        // Carriage return: everything on the old line is backspaced at speed.
        for (const cloud of clouds) startErase(cloud, now, true);
        spawnAt = [];
        for (let i = 0; i < targetClouds(next); i += 1) spawnAt.push(now + 750 + i * 380);
      }
      if (skyChanged) {
        const typing = celestials.filter((celestial) => celestial.state !== "gone");
        for (const celestial of typing) {
          celestial.state = "erasing";
          celestial.nextKey = now;
        }
        composeCelestial(next, now, previous ? 900 : 500);
      }
    },
    destroy() {
      window.clearInterval(timer);
      celestialLayer.remove();
      cloudLayer.remove();
    },
  };
}

export type TypedSky = ReturnType<typeof createTypedSky>;
