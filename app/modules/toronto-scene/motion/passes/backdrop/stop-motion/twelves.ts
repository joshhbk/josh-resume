/**
 * One shared 12fps clock for the stop-motion pass, so the layers, the boil, the flicker and the
 * exposure-sheet counter all advance on exactly the same frame, like exposures of one camera.
 * It also acts as the "animator": it decides when a stray hand, a thumb or a light leak lands
 * in a frame, and every subscriber reads the same incident.
 */

export const framesPerSecond = 12;
const frameMs = 1000 / framesPerSecond;

export type Incident =
  | { kind: "hand"; start: number; target: KnockTarget }
  | { kind: "thumb"; start: number; corner: 0 | 1 | 2 | 3 }
  | { kind: "leak"; start: number; side: "left" | "right"; length: number };

export type KnockTarget =
  | "tower"
  | "buildings-left"
  | "buildings-right"
  | "buildings-center"
  | "trees";

export type Frame = {
  /** Exposures since the clock started. */
  count: number;
  /** True when the animator forgot to move anything: every layer holds its last pose. */
  held: boolean;
  incident: Incident | null;
};

type Listener = (frame: Frame) => void;

const knockTargets: readonly KnockTarget[] = [
  "tower",
  "tower",
  "buildings-left",
  "buildings-right",
  "buildings-center",
  "trees",
];

/** Where on each puppet the animator's fingertips land, in artwork units. */
export const handholds: Record<KnockTarget, { x: number; y: number; spread: number }> = {
  tower: { x: 786, y: 300, spread: 6 },
  "buildings-left": { x: 250, y: 500, spread: 120 },
  "buildings-right": { x: 1180, y: 600, spread: 120 },
  "buildings-center": { x: 808, y: 600, spread: 30 },
  trees: { x: 768, y: 800, spread: 300 },
};

/** The puppet closest to a point on the artwork: what a tap reaches for. */
export function nearestPuppet(x: number, y: number): KnockTarget {
  let best: KnockTarget = "tower";
  let bestDistance = Infinity;
  for (const [target, hold] of Object.entries(handholds) as [
    KnockTarget,
    (typeof handholds)[KnockTarget],
  ][]) {
    const distance = Math.hypot(Math.max(0, Math.abs(x - hold.x) - hold.spread), y - hold.y);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = target;
    }
  }
  return best;
}

/** How many frames each incident lasts. */
export const incidentLength = { hand: 14, thumb: 3 } as const;

const listeners = new Set<Listener>();
let raf = 0;
let last = 0;
let count = 0;
let incident: Incident | null = null;
let nextIncidentAt = 0;
let lastRequest = -Infinity;

const pick = <T>(items: readonly T[]): T => items[Math.floor(Math.random() * items.length)] as T;

function incidentActive(frame: number): boolean {
  if (!incident) return false;
  const length = incident.kind === "leak" ? incident.length : incidentLength[incident.kind];
  return frame - incident.start < length;
}

function scheduleNext(frame: number) {
  // Something goes wrong on set every 9–20 seconds.
  nextIncidentAt = frame + Math.round((9 + Math.random() * 11) * framesPerSecond);
}

function rollIncident(frame: number): Incident {
  const roll = Math.random();
  if (roll < 0.42) return { kind: "hand", start: frame, target: pick(knockTargets) };
  if (roll < 0.7) return { kind: "thumb", start: frame, corner: pick([0, 1, 2, 3] as const) };
  return {
    kind: "leak",
    start: frame,
    side: Math.random() < 0.5 ? "left" : "right",
    length: 4 + Math.floor(Math.random() * 6),
  };
}

function tick() {
  count++;
  if (!incidentActive(count)) incident = null;
  if (!incident && count >= nextIncidentAt) {
    incident = rollIncident(count);
    scheduleNext(count);
  }
  // Now and then a frame is shot twice: the uneven spacing of a real hand-made film.
  const held = !incident && Math.random() < 0.06;
  const frame: Frame = { count, held, incident };
  for (const listener of listeners) listener(frame);
}

function loop(now: number) {
  raf = requestAnimationFrame(loop);
  if (now - last < frameMs) return;
  // Keep a steady cadence, but never try to catch up after a stall (a hidden tab, a long task).
  last = now - last > frameMs * 3 ? now : last + frameMs;
  tick();
}

function start() {
  if (raf || typeof requestAnimationFrame !== "function") return;
  last = performance.now();
  if (nextIncidentAt === 0) nextIncidentAt = count + 4 * framesPerSecond;
  raf = requestAnimationFrame(loop);
}

function stop() {
  if (!raf) return;
  cancelAnimationFrame(raf);
  raf = 0;
}

function onVisibility() {
  if (document.hidden) stop();
  else if (listeners.size > 0) start();
}

/** Subscribes to the 12fps clock; the clock runs only while someone listens and the tab is visible. */
export function subscribeTwelves(listener: Listener): () => void {
  listeners.add(listener);
  if (listeners.size === 1) {
    document.addEventListener("visibilitychange", onVisibility);
    if (!document.hidden) start();
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    }
  };
}

/** Asks the animator to reach into the set now (a tap on a touch screen), at most every 3s. */
export function requestHand(target?: KnockTarget): void {
  if (incidentActive(count) || count - lastRequest < 3 * framesPerSecond) return;
  lastRequest = count;
  incident = { kind: "hand", start: count + 1, target: target ?? pick(knockTargets) };
}
