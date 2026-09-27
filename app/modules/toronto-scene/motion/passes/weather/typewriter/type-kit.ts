import type { DayPhase, Weather } from "../../../../scene-provider";

/** A typewriter's face: whatever monospace the system has, Courier first. */
export const typeFace = '"Courier New", Courier, ui-monospace, "SFMono-Regular", Menlo, monospace';

/** Monospace advance as a fraction of the font size. */
export const advance = 0.6;

export type Ink = { ink: string; red: string; inkRgb: readonly [number, number, number] };

/** Two-colour ribbon per phase: black/red by day, a pale "white ribbon" on the night paper. */
export const inks: Record<DayPhase, Ink> = {
  dawn: { ink: "#3a2630", red: "#c23a2a", inkRgb: [58, 38, 48] },
  day: { ink: "#1d2a3a", red: "#b8322a", inkRgb: [29, 42, 58] },
  dusk: { ink: "#2f2232", red: "#b83226", inkRgb: [47, 34, 50] },
  night: { ink: "#efe4c6", red: "#ff9a7e", inkRgb: [239, 228, 198] },
};

/** A small deterministic PRNG so layouts are stable between renders and tests. */
export function random(seed: number): () => number {
  let state = seed >>> 0 || 1;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 4294967296;
  };
}

export const pick = <T>(items: readonly T[], roll: number): T => {
  const item = items[Math.min(items.length - 1, Math.floor(roll * items.length))];
  if (item === undefined) throw new Error("pick() needs at least one item");
  return item;
};

/** Human key rhythm: mostly quick strikes, the odd hesitation. */
export function keyGap(roll: () => number, fast = false): number {
  const base = fast ? 22 : 55;
  const spread = fast ? 26 : 70;
  const hesitation = roll() < 0.07 ? (fast ? 40 : 180) : 0;
  return base + roll() * spread + hesitation;
}

export const weatherWords: Record<Weather, string> = {
  clear: "clear skies",
  cloudy: "overcast",
  rain: "rain",
  snow: "snow",
};
