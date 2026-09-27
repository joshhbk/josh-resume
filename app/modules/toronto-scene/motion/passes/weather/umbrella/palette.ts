import type { DayPhase, Weather } from "../../../../scene-provider";

/** An RGBA colour with alpha 0–1. */
export type Rgba = [number, number, number, number];

export type Palette = {
  cloud: Rgba;
  cloudRim: Rgba;
  cloudShadow: Rgba;
  rain: Rgba;
  rainNear: Rgba;
  ripple: Rgba;
  snow: Rgba;
  snowShadow: Rgba;
  mote: Rgba;
  beam: Rgba;
  canopy: Rgba;
};

export type PaletteKey = keyof Palette;

const hex = (value: string, alpha = 1): Rgba => {
  const n = Number.parseInt(value.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255, alpha];
};

const base: Record<DayPhase, Palette> = {
  dawn: {
    cloud: hex("#f1d2bd"),
    cloudRim: hex("#fff0dc"),
    cloudShadow: hex("#8a5a4a", 0.26),
    rain: hex("#6d7f98", 0.5),
    rainNear: hex("#5d7089", 0.62),
    ripple: hex("#fbe0c6", 0.8),
    snow: hex("#fff4ec"),
    snowShadow: hex("#9b6f67", 0.34),
    mote: hex("#ffe2b8", 0.9),
    beam: hex("#ffd9b5", 0.13),
    canopy: hex("#fff1e4", 0.6),
  },
  day: {
    cloud: hex("#f1e6d1"),
    cloudRim: hex("#fffaf0"),
    cloudShadow: hex("#6e553e", 0.22),
    rain: hex("#5c7f93", 0.48),
    rainNear: hex("#4d7085", 0.6),
    ripple: hex("#f2f5e8", 0.85),
    snow: hex("#fdfaf2"),
    snowShadow: hex("#7c6a57", 0.3),
    mote: hex("#fff3cf", 0.95),
    beam: hex("#fff6dc", 0.16),
    canopy: hex("#eff6f4", 0.6),
  },
  dusk: {
    cloud: hex("#d8a792"),
    cloudRim: hex("#f3cfb3"),
    cloudShadow: hex("#5b3530", 0.3),
    rain: hex("#735f6c", 0.5),
    rainNear: hex("#5d4c5c", 0.62),
    ripple: hex("#f7c9a0", 0.8),
    snow: hex("#fbe9df"),
    snowShadow: hex("#744c49", 0.36),
    mote: hex("#ffcf95", 0.9),
    beam: hex("#ffbf8a", 0.15),
    canopy: hex("#ffe0cc", 0.6),
  },
  night: {
    cloud: hex("#3f5875"),
    cloudRim: hex("#5f7a98"),
    cloudShadow: hex("#020a18", 0.42),
    rain: hex("#aac4d4", 0.42),
    rainNear: hex("#c3d7e2", 0.58),
    ripple: hex("#f4d69b", 0.7),
    snow: hex("#dde6ef"),
    snowShadow: hex("#08162b", 0.45),
    mote: hex("#e6f58a", 1),
    beam: hex("#c7d6ff", 0),
    canopy: hex("#d8e6f0", 0.55),
  },
};

// Rain darkens and cools the clouds; snow washes them pale.
const rainCloud: Record<DayPhase, readonly [string, string]> = {
  dawn: ["#b9a3a0", "#d6c0b8"],
  day: ["#b8b0a2", "#d5cdbd"],
  dusk: ["#977c7e", "#b89a95"],
  night: ["#2f4259", "#475d77"],
};
const snowCloud: Record<DayPhase, readonly [string, string]> = {
  dawn: ["#e9dcd6", "#fbf1ea"],
  day: ["#e4e2dc", "#f7f6f1"],
  dusk: ["#cdb2ab", "#e6d0c6"],
  night: ["#53677f", "#71869f"],
};

export function paletteFor(phase: DayPhase, weather: Weather): Palette {
  const palette = { ...base[phase] };
  const cloud =
    weather === "rain" ? rainCloud[phase] : weather === "snow" ? snowCloud[phase] : null;
  if (cloud) {
    palette.cloud = hex(cloud[0]);
    palette.cloudRim = hex(cloud[1]);
  }
  return palette;
}

export const paletteKeys = Object.keys(base.day) as PaletteKey[];

/** Eases every colour of `current` towards `target` in place. */
export function blendPalette(current: Palette, target: Palette, amount: number): void {
  for (const key of paletteKeys) {
    const from = current[key];
    const to = target[key];
    for (let channel = 0; channel < 4; channel++) {
      from[channel] = (from[channel] ?? 0) + ((to[channel] ?? 0) - (from[channel] ?? 0)) * amount;
    }
  }
}

export function clonePalette(palette: Palette): Palette {
  const copy = { ...palette };
  for (const key of paletteKeys) copy[key] = [...palette[key]];
  return copy;
}

export const css = ([r, g, b, a]: Rgba, alpha = 1) =>
  `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},${(a * alpha).toFixed(3)})`;
