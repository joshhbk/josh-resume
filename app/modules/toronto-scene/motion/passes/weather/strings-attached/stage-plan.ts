/**
 * The stage manager's plot: for a given sky, which props hang where. Pure data, so the same
 * weather always gets the same rigs, and a change of cue can be diffed prop by prop.
 */
import type { DayPhase, Weather } from "../../../../scene-provider";
import type { CloudTone, Palette } from "./props";
import { seeded, spread } from "./random";

type RigBase = {
  /** Stable identity: a rig keeps hanging across cues while its key survives. */
  key: string;
  /** Pivot x in artwork units; every thread runs up to the fly loft above the frame. */
  x: number;
  /** Thread length from the pivot to the hook, in artwork units. */
  length: number;
  /** 0 is the back of the stage, 1 the front. Also scales the prop. */
  depth: number;
  /** 0–1: when this rig moves within a cue (back rows go first). */
  order: number;
  seed: number;
};

export type RigSpec = RigBase &
  (
    | { kind: "cloud"; tone: CloudTone; variant: number }
    | { kind: "strand"; beads: number; bob: number }
    | { kind: "cotton"; balls: number; spacing: number }
    | { kind: "sun" }
    | { kind: "moon" }
    | { kind: "star" }
  );

export type StageView = {
  /** Leftmost visible artwork x. */
  left: number;
  /** Visible artwork width. */
  width: number;
};

export type Cue = {
  weather: Weather;
  phase: DayPhase;
  cloud: number;
  rain: number;
  view: StageView;
};

/** Pivots hang this far above the top of the artwork, out of sight in the fly loft. */
export const pivotY = -80;

export function paletteFor(phase: DayPhase): Palette {
  if (phase === "night") return "night";
  return phase === "day" ? "day" : "warm";
}

const hang = (hookY: number) => hookY - pivotY;
const towerX = 786;

function celestial({ weather, phase, cloud, view }: Cue): RigSpec[] {
  const showsThrough = weather === "clear" || (weather === "cloudy" && cloud < 0.85);
  if (!showsThrough) return [];
  // Keep the sun and moon clear of the CN Tower (x ≈ 786), however narrow the view.
  const at = (fraction: number) => {
    const x = view.left + fraction * view.width;
    if (Math.abs(x - towerX) >= 160) return x;
    const side = x < towerX ? -1 : 1;
    const moved = towerX + side * 160;
    return moved > view.left + 60 && moved < view.left + view.width - 60
      ? moved
      : towerX - side * 160;
  };
  if (phase !== "night") {
    const place = {
      day: { x: 0.72, y: 150 },
      dawn: { x: 0.8, y: 250 },
      dusk: { x: 0.2, y: 262 },
    }[phase];
    return [
      {
        key: `sun-${phase}`,
        kind: "sun",
        x: at(place.x),
        length: hang(place.y),
        depth: 0,
        order: 0,
        seed: 1,
      },
    ];
  }
  const rigs: RigSpec[] = [
    { key: "moon", kind: "moon", x: at(0.64), length: hang(150), depth: 0, order: 0.2, seed: 2 },
  ];
  if (weather !== "clear") return rigs;
  const random = seeded(77);
  const stars = Math.round(4 + 8 * (view.width / 1536));
  for (let index = 0; index < stars; index++) {
    rigs.push({
      key: `star-${index}`,
      kind: "star",
      x: view.left + (0.04 + spread(index, 0.13) * 0.92) * view.width,
      length: hang(40 + random() * 240),
      depth: 0.1 + random() * 0.3,
      order: random(),
      seed: 100 + index,
    });
  }
  return rigs;
}

function clouds({ weather, phase, cloud, rain, view }: Cue): RigSpec[] {
  const tone: CloudTone = weather === "rain" ? "storm" : weather === "snow" ? "snow" : "fair";
  const cover =
    weather === "clear"
      ? phase === "night"
        ? 0
        : 0.12
      : weather === "rain"
        ? 0.6 + rain * 0.4
        : weather === "snow"
          ? Math.max(cloud, 0.45)
          : cloud;
  if (cover <= 0) return [];
  const random = seeded(tone.length * 31 + 5);
  const rigs: RigSpec[] = [];
  const rows = cover < 0.3 ? [1] : [0, 1];
  for (const row of rows) {
    const scale = row === 0 ? 0.72 : 1;
    // Near-touching at full cover, so a gust sends them bumping into each other.
    const pitch = 240 * scale * (row === 0 ? 2.3 - cover : 1.95 - cover * 0.7);
    const count =
      cover < 0.3 ? 1 : Math.max(1, Math.floor(view.width / pitch) + (row === 0 ? 1 : 0));
    const start =
      view.left + (view.width - (count - 1) * pitch) / 2 + (row === 0 ? pitch * 0.5 : 0);
    for (let index = 0; index < count; index++) {
      const variant = (index + row * 2) % 4;
      rigs.push({
        key: `cloud-${tone}-${row}-${index}`,
        kind: "cloud",
        tone,
        variant,
        // Front-row clouds hang in pairs, close enough to knock together in a gust.
        x:
          (cover < 0.3
            ? view.left + view.width * 0.3
            : start + index * pitch - (row === 1 && index % 2 === 1 ? pitch * 0.2 : 0)) +
          (random() - 0.5) * 30,
        length: hang(row === 0 ? 50 + random() * 60 : 120 + random() * 90),
        depth: row === 0 ? 0.35 : 0.8,
        order: row * 0.5 + random() * 0.5,
        seed: 300 + row * 40 + index,
      });
    }
  }
  return rigs;
}

/** Props hung behind the city: the sun, the moon and stars, and the felt clouds. */
export function skyRigs(cue: Cue): RigSpec[] {
  return [...celestial(cue), ...clouds(cue)];
}

/** Props hung in front of the city: bead rain and cotton snow. */
export function frontRigs({ weather, cloud, rain, view }: Cue): RigSpec[] {
  const span = view.width / 1536;
  if (weather === "rain") {
    const random = seeded(909);
    const count = Math.max(5, Math.round((8 + rain * 30) * span));
    return Array.from({ length: count }, (_, index) => {
      const depth = random();
      return {
        key: `strand-${index}`,
        kind: "strand" as const,
        x: view.left + (0.02 + spread(index, 0.31) * 0.96) * view.width,
        length: hang(90 + random() * 400),
        beads: 6 + Math.floor(random() * 6),
        bob: 14 + rain * 30 + random() * 12,
        depth,
        order: depth * 0.6 + random() * 0.4,
        seed: 500 + index,
      };
    });
  }
  if (weather === "snow") {
    const random = seeded(4242);
    const amount = 0.65 + cloud * 0.45;
    const rigs: RigSpec[] = [];
    for (const row of [0, 1, 2]) {
      const count = Math.max(2, Math.round((6 + row * 3) * span * amount));
      for (let index = 0; index < count; index++) {
        rigs.push({
          key: `cotton-${row}-${index}`,
          kind: "cotton",
          x: view.left + (0.03 + spread(index, 0.17 + row * 0.29) * 0.94) * view.width,
          length: hang(20 + random() * 200),
          balls: 3 + Math.floor(random() * 3),
          spacing: 58 + random() * 40,
          depth: row / 2,
          order: row / 3 + random() * 0.3,
          seed: 700 + row * 50 + index,
        });
      }
    }
    return rigs;
  }
  return [];
}
