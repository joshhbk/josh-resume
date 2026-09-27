/**
 * "Boil" for the paper cut-outs: every cut edge is redrawn a few times with its points nudged by
 * hand, and the frames cycle like a stop-motion replacement. The paths are vector, so swapping
 * their `d` costs nothing like an animated displacement filter would.
 */

type Segment =
  | { kind: "M" | "L"; x: number; y: number }
  | { kind: "Q"; cx: number; cy: number; x: number; y: number }
  | { kind: "Z" };

const artWidth = 1536;
const artHeight = 1024;
const tokenPattern = /[MmLlHhVvQqZz]|[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g;

/** Parses the subset of path syntax the skyline art uses into absolute segments, or null. */
export function parsePath(d: string): Segment[] | null {
  const tokens = d.match(tokenPattern);
  if (!tokens || d.replace(tokenPattern, "").replace(/[\s,]/g, "") !== "") return null;

  const segments: Segment[] = [];
  let index = 0;
  let command = "";
  let x = 0;
  let y = 0;
  let startX = 0;
  let startY = 0;
  const next = () => {
    const token = tokens[index++];
    const value = token === undefined ? Number.NaN : Number(token);
    if (Number.isNaN(value)) throw new Error("bad path");
    return value;
  };

  try {
    while (index < tokens.length) {
      const token = tokens[index] ?? "";
      if (/[A-Za-z]/.test(token)) {
        command = token;
        index++;
        if (command === "Z" || command === "z") {
          segments.push({ kind: "Z" });
          x = startX;
          y = startY;
          continue;
        }
      }
      const relative = command === command.toLowerCase();
      const baseX = relative ? x : 0;
      const baseY = relative ? y : 0;
      switch (command.toUpperCase()) {
        case "M": {
          x = baseX + next();
          y = baseY + next();
          startX = x;
          startY = y;
          segments.push({ kind: "M", x, y });
          // Further pairs after a moveto are implicit linetos.
          command = relative ? "l" : "L";
          break;
        }
        case "L": {
          x = baseX + next();
          y = baseY + next();
          segments.push({ kind: "L", x, y });
          break;
        }
        case "H": {
          x = baseX + next();
          segments.push({ kind: "L", x, y });
          break;
        }
        case "V": {
          y = baseY + next();
          segments.push({ kind: "L", x, y });
          break;
        }
        case "Q": {
          const cx = baseX + next();
          const cy = baseY + next();
          x = baseX + next();
          y = baseY + next();
          segments.push({ kind: "Q", cx, cy, x, y });
          break;
        }
        default:
          return null;
      }
    }
  } catch {
    return null;
  }
  return segments;
}

/** A small seeded generator so every boil drawing is the same on each visit. */
export function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash(text: string): number {
  let value = 2166136261;
  for (let index = 0; index < text.length; index++) {
    value = Math.imul(value ^ text.charCodeAt(index), 16777619);
  }
  return value >>> 0;
}

const round = (value: number) => Math.round(value * 10) / 10;

/**
 * Redraws a path with every point nudged up to `amount` units (control points twice as far).
 * Points on the artwork's edges stay pinned to that edge so no gaps open at the frame.
 */
export function boilPath(segments: readonly Segment[], amount: number, seed: number): string {
  const random = seededRandom(seed);
  const wobble = (value: number, limit: number, scale: number) => {
    if (value <= 0 || value >= limit) return value;
    return round(value + (random() * 2 - 1) * amount * scale);
  };
  return segments
    .map((segment) => {
      switch (segment.kind) {
        case "Z":
          return "Z";
        case "Q":
          return `Q${wobble(segment.cx, artWidth, 2)} ${wobble(segment.cy, artHeight, 2)} ${wobble(
            segment.x,
            artWidth,
            1,
          )} ${wobble(segment.y, artHeight, 1)}`;
        default:
          return `${segment.kind}${wobble(segment.x, artWidth, 1)} ${wobble(segment.y, artHeight, 1)}`;
      }
    })
    .join("");
}

/** The drawings for one boiling path: `frames` hand-redrawn versions of the original `d`. */
export function boilFrames(d: string, amount: number, frames: number): string[] | null {
  const segments = parsePath(d);
  if (!segments) return null;
  const seed = hash(d);
  return Array.from({ length: frames }, (_, frame) =>
    boilPath(segments, amount, seed + frame * 7919),
  );
}
