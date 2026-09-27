import type { DayPhase } from "../../../../scene-provider";

/** The hour each phase is anchored to when Toronto's real clock doesn't fall inside it. */
const phaseAnchorHour: Record<DayPhase, number> = {
  dawn: 7.2,
  day: 13,
  dusk: 19.3,
  night: 1,
};

function phaseOfHour(hour: number): DayPhase {
  if (hour < 6 || hour >= 21) return "night";
  if (hour < 9) return "dawn";
  if (hour < 18) return "day";
  return "dusk";
}

/** Toronto's hour of day as a fraction (e.g. 14.5 for 2:30pm). */
export function torontoHour(date: Date = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-CA", {
    hour: "numeric",
    minute: "numeric",
    hourCycle: "h23",
    timeZone: "America/Toronto",
  }).formatToParts(date);
  const read = (type: "hour" | "minute") =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);
  return read("hour") + read("minute") / 60;
}

/**
 * The hour the scene "really" shows: Toronto's clock when it matches the displayed phase,
 * otherwise a representative hour for a previewed phase.
 */
export function anchorHour(phase: DayPhase, realHour: number): number {
  return phaseOfHour(realHour) === phase ? realHour : phaseAnchorHour[phase];
}

export const wrapHour = (hour: number) => ((hour % 24) + 24) % 24;

type Rgb = readonly [number, number, number];

type LightKey = {
  hour: number;
  /** 0 = day artwork, 1 = night artwork. */
  night: number;
  /** 0–1 golden-hour warmth (sepia, saturation, sky wash). */
  warm: number;
  wash: Rgb;
  washOpacity: number;
  brightness: number;
  backdrop: Rgb;
  backdropLight: Rgb;
};

const nightKey = {
  night: 1,
  warm: 0,
  wash: [23, 43, 77],
  washOpacity: 0.18,
  brightness: 1,
  backdrop: [12, 26, 51],
  backdropLight: [41, 63, 96],
} as const;

const dayKey = {
  night: 0,
  warm: 0,
  wash: [255, 245, 219],
  washOpacity: 0,
  brightness: 1,
  backdrop: [233, 215, 185],
  backdropLight: [255, 245, 223],
} as const;

/** One day of light, keyed by hour. The first and last keys meet at midnight. */
const lightKeys: readonly LightKey[] = [
  { hour: 0, ...nightKey },
  { hour: 4.8, ...nightKey },
  {
    hour: 6.1,
    night: 0.62,
    warm: 0.7,
    wash: [196, 132, 150],
    washOpacity: 0.38,
    brightness: 0.9,
    backdrop: [150, 120, 138],
    backdropLight: [236, 186, 176],
  },
  {
    hour: 7.2,
    night: 0,
    warm: 1,
    wash: [249, 169, 140],
    washOpacity: 0.45,
    brightness: 1,
    backdrop: [233, 197, 174],
    backdropLight: [255, 235, 203],
  },
  {
    hour: 9.4,
    night: 0,
    warm: 0.3,
    wash: [252, 214, 176],
    washOpacity: 0.2,
    brightness: 1.02,
    backdrop: [233, 210, 182],
    backdropLight: [255, 242, 216],
  },
  { hour: 11, ...dayKey },
  { hour: 16.2, ...dayKey },
  {
    hour: 18.1,
    night: 0,
    warm: 0.75,
    wash: [236, 164, 126],
    washOpacity: 0.36,
    brightness: 0.93,
    backdrop: [212, 170, 142],
    backdropLight: [248, 214, 176],
  },
  {
    hour: 19.3,
    night: 0,
    warm: 1,
    wash: [223, 146, 126],
    washOpacity: 0.45,
    brightness: 0.85,
    backdrop: [191, 146, 127],
    backdropLight: [242, 205, 169],
  },
  {
    hour: 20.4,
    night: 0.72,
    warm: 0.55,
    wash: [104, 84, 122],
    washOpacity: 0.32,
    brightness: 0.86,
    backdrop: [70, 62, 92],
    backdropLight: [140, 112, 128],
  },
  { hour: 21.4, ...nightKey },
  { hour: 24, ...nightKey },
];

const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const mixRgb = (a: Rgb, b: Rgb, t: number): Rgb => [
  mix(a[0], b[0], t),
  mix(a[1], b[1], t),
  mix(a[2], b[2], t),
];
const smooth = (t: number) => t * t * (3 - 2 * t);

export type Light = Omit<LightKey, "hour">;

/** The scene's light at any hour, interpolated between the day's keys. */
export function lightAt(hour: number): Light {
  const h = wrapHour(hour);
  let index = 0;
  while (index < lightKeys.length - 2 && (lightKeys[index + 1]?.hour ?? 24) <= h) index += 1;
  const from = lightKeys[index] ?? lightKeys[0];
  const to = lightKeys[index + 1] ?? from;
  if (!from || !to) return { ...dayKey };
  const t = smooth(to.hour === from.hour ? 0 : (h - from.hour) / (to.hour - from.hour));
  return {
    night: mix(from.night, to.night, t),
    warm: mix(from.warm, to.warm, t),
    wash: mixRgb(from.wash, to.wash, t),
    washOpacity: mix(from.washOpacity, to.washOpacity, t),
    brightness: mix(from.brightness, to.brightness, t),
    backdrop: mixRgb(from.backdrop, to.backdrop, t),
    backdropLight: mixRgb(from.backdropLight, to.backdropLight, t),
  };
}

export const rgb = ([r, g, b]: Rgb, alpha = 1) =>
  `rgb(${Math.round(r)} ${Math.round(g)} ${Math.round(b)} / ${Math.round(alpha * 100)}%)`;

export type Body = {
  x: number;
  y: number;
  /** 0 at the horizon, 1 at the top of the arc; negative below the horizon. */
  elevation: number;
};

const horizonY = 640;
const arcHeight = 520;

/** Where a body rising at `rise` and setting at `set` sits in the 1536×1024 artwork at `hour`. */
function bodyAt(hour: number, rise: number, set: number): Body {
  const span = wrapHour(set - rise);
  const progress = wrapHour(hour - rise) / span;
  if (progress > 1) return { x: 768, y: horizonY + 160, elevation: -1 };
  const elevation = Math.sin(progress * Math.PI);
  return { x: 120 + progress * 1296, y: horizonY - elevation * arcHeight, elevation };
}

export const sunAt = (hour: number) => bodyAt(hour, 5.7, 20.7);
export const moonAt = (hour: number) => bodyAt(hour, 20.2, 6.6);

/** Points along the sun's path between two hours, for long-exposure trails. */
export function arcPath(from: number, to: number, body: (hour: number) => Body): string {
  const steps = 14;
  const points: string[] = [];
  for (let step = 0; step <= steps; step += 1) {
    const point = body(mix(from, to, step / steps));
    if (point.elevation > -0.05) points.push(`${point.x.toFixed(1)} ${point.y.toFixed(1)}`);
  }
  return points.length > 1 ? `M${points.join("L")}` : "";
}

/** "07:42" for an hour of the day. */
export function clockLabel(hour: number): string {
  const minutes = Math.floor(wrapHour(hour) * 60);
  const hh = Math.floor(minutes / 60);
  const mm = minutes % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}
