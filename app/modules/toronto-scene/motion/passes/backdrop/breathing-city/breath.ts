import type { DayPhase } from "../../../../scene-provider";

/** How the city breathes in each light: it wakes at dawn, is brisk by day and sleeps deeply at night. */
export type Rhythm = {
  /** Seconds per breath at rest. */
  period: number;
  /** Rest scaleY swing of a building sheet on each inhale. */
  depth: number;
  /** Resting heart rate, beats per minute. */
  heart: number;
  /** 0–1 how brightly the windows burn. */
  lights: number;
};

export const rhythms: Record<DayPhase, Rhythm> = {
  dawn: { period: 5.4, depth: 0.02, heart: 60, lights: 0.16 },
  day: { period: 4.5, depth: 0.017, heart: 70, lights: 0 },
  dusk: { period: 5.9, depth: 0.019, heart: 58, lights: 0.42 },
  night: { period: 7.4, depth: 0.024, heart: 48, lights: 1 },
};

const TAU = Math.PI * 2;

export const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

export const lerp = (from: number, to: number, amount: number) => from + (to - from) * amount;

export const smoothstep = (value: number) => {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
};

/**
 * One breath as a 0–1 lung volume for a cycle position `p` (any real number, wraps at 1):
 * a quicker inhale (40% of the cycle) and a long, relaxed exhale.
 */
export function breathVolume(p: number): number {
  const cycle = p - Math.floor(p);
  const warped = cycle < 0.4 ? (cycle / 0.4) * 0.5 : 0.5 + ((cycle - 0.4) / 0.6) * 0.5;
  return (1 - Math.cos(TAU * warped)) / 2;
}

/** A lub-dub for a heartbeat position `p` (wraps at 1): a strong beat, then a softer echo. */
export function heartbeat(p: number): number {
  const beat = p - Math.floor(p);
  const lub = Math.exp(-((beat / 0.055) ** 2));
  const dubAt = beat - 0.2;
  const dub = 0.55 * Math.exp(-((dubAt / 0.05) ** 2));
  return Math.min(1, lub + dub);
}

/** A slow, deep yawn over 6.5s: stretch up, hold with a tremble, sag back down. 0–1. */
export function yawn(seconds: number): number {
  if (seconds <= 0 || seconds >= 6.5) return 0;
  if (seconds < 2.8) return smoothstep(seconds / 2.8);
  if (seconds < 3.7) return 1 + Math.sin(seconds * 52) * 0.03;
  return 1 - smoothstep((seconds - 3.7) / 2.8);
}

/**
 * A sigh over 4.6s: a small catch of breath, then a long exhale that sinks below rest before
 * the sheets settle. Returns -1…0.4 (negative means deflated).
 */
export function sigh(seconds: number): number {
  if (seconds <= 0 || seconds >= 4.6) return 0;
  if (seconds < 1) return 0.4 * smoothstep(seconds);
  if (seconds < 2.9) return lerp(0.4, -1, smoothstep((seconds - 1) / 1.9));
  return -1 + smoothstep((seconds - 2.9) / 1.7);
}

/** A startled gasp over 1.4s: a sharp flinch inwards and a shaky recovery. -1…0. */
export function gasp(seconds: number): number {
  if (seconds <= 0 || seconds >= 1.4) return 0;
  const decay = Math.exp(-seconds * 3.2);
  return -decay * Math.abs(Math.cos(seconds * 11));
}

/** The shiver that runs through the trees after a yawn, like a dog shaking off water. 0–1. */
export function shiver(seconds: number): number {
  if (seconds <= 0 || seconds >= 1.8) return 0;
  return Math.exp(-seconds * 2.2) * Math.abs(Math.sin(seconds * 19));
}

/** A damped spring for the tower's sway, integrated with semi-implicit Euler. */
export type Spring = { value: number; velocity: number };

export function stepSpring(
  spring: Spring,
  target: number,
  dt: number,
  stiffness = 3.1,
  damping = 0.55,
): void {
  const acceleration = -stiffness * (spring.value - target) - damping * spring.velocity;
  spring.velocity += acceleration * dt;
  spring.value += spring.velocity * dt;
}
