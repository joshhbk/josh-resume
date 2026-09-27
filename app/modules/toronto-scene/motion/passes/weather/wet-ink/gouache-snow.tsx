import type { CSSProperties } from "react";

import { seeded } from "./ink-sprites";
import { roofs, shoreEdge } from "./paper-ledges";
import styles from "./wet-ink.module.css";

/** A lumpy mound of gouache sitting on a roof ledge; grows upward from the ledge. */
function moundPath(x1: number, x2: number, y: number, height: number, seed: number): string {
  const rand = seeded(seed);
  const left = x1 - 2;
  const right = x2 + 2;
  const steps = Math.max(2, Math.round((right - left) / 13));
  const step = (right - left) / steps;
  let d = `M${left} ${y + 2}Q${left - 1} ${y - height * 0.6} ${left + step * 0.5} ${y - height * 0.8}`;
  for (let index = 1; index < steps; index += 1) {
    const x = left + step * (index + 0.5);
    const lump = height * (0.72 + rand() * 0.5);
    d += `T${x.toFixed(1)} ${(y - lump).toFixed(1)}`;
  }
  d += `Q${right + 1} ${y - height * 0.5} ${right} ${y + 2}Z`;
  return d;
}

const layers = [
  { className: styles.snowThin, height: 3.5, seed: 1 },
  { className: styles.snowThick, height: 7, seed: 2 },
  { className: styles.snowDrift, height: 11, seed: 3 },
] as const;

/** Mid slot: snow accumulating on the rooftops, behind the trees. Grows and melts in CSS. */
export function RoofSnow() {
  return (
    <g className={styles.roofSnow} aria-hidden="true">
      {layers.map(({ className, height, seed }) => (
        <g className={className} key={seed}>
          {roofs.map(([x1, x2, y], index) => {
            // Narrow ledges hold less; the long flat roofs pile up drifts.
            const hold = Math.min(1, (x2 - x1) / 60);
            if (seed === 3 && hold < 0.6) return null;
            return (
              <path
                className={styles.mound}
                d={moundPath(x1, x2, y, height * (0.55 + hold * 0.45), seed * 97 + index)}
                style={{ "--wi-stagger": `${(index % 5) * 0.7}s` } as CSSProperties}
                key={`${x1}-${y}`}
              />
            );
          })}
        </g>
      ))}
    </g>
  );
}

/** Front slot: gouache frosting along the shore ledge, riding the land sheet. */
export function GroundSnow() {
  return (
    <g className={styles.groundSnow} aria-hidden="true">
      <path className={`${styles.frost} ${styles.frostShore}`} d={shoreEdge} />
    </g>
  );
}
