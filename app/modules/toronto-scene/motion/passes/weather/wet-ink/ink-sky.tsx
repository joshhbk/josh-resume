import { useSyncExternalStore, type CSSProperties } from "react";

import type { PassProps } from "../../../motion-types";
import { getSkyTextures, type SkyTextures } from "./ink-sprites";
import styles from "./wet-ink.module.css";

const noSubscription = () => () => {};

/** The painted sky textures, made once on the client (null on the server and in jsdom). */
function useSkyTextures(): SkyTextures | null {
  return useSyncExternalStore(noSubscription, getSkyTextures, () => null);
}

/** Where each wash of cloud ink pools: x, y, width, height. */
const washes = [
  [-90, 20, 820, 380],
  [520, -40, 760, 330],
  [1000, 40, 760, 360],
  [150, 230, 860, 340],
  [800, 250, 820, 320],
] as const;

function Washes({ sources, className }: { sources: readonly string[]; className: string }) {
  return (
    <g className={className}>
      {washes.map(([x, y, width, height], index) => (
        <g className={styles.wash} style={{ "--wi-i": index } as CSSProperties} key={`${x}-${y}`}>
          <image
            className={styles.washInk}
            href={sources[index % sources.length]}
            x={x}
            y={y}
            width={width}
            height={height}
            preserveAspectRatio="none"
          />
        </g>
      ))}
    </g>
  );
}

/**
 * The Sky slot: cloud cover as wet-in-wet ink washes, the sun as a spot of lifted (bleached)
 * paper with a dry-brush glow, and at night a masking-fluid moon among salt-crystal stars.
 */
export function InkSky({ intensity }: PassProps) {
  const textures = useSkyTextures();
  if (!textures) return null;
  const style = {
    "--wi-cloud": (0.3 + intensity.cloud * 0.6).toFixed(2),
  } as CSSProperties;

  return (
    <g className={styles.sky} style={style} aria-hidden="true">
      <g className={styles.salt}>
        <image className={styles.saltA} href={textures.salt[0]} width={1536} height={520} />
        <image className={styles.saltB} href={textures.salt[1]} width={1536} height={520} />
      </g>
      <g className={styles.sun}>
        <image
          className={styles.warmth}
          href={textures.warmth}
          x={1070}
          y={60}
          width={360}
          height={360}
        />
        <image
          className={styles.dryBrush}
          href={textures.dryBrush}
          x={930}
          y={170}
          width={640}
          height={170}
        />
        <image
          className={styles.bleach}
          href={textures.bleach}
          x={1150}
          y={140}
          width={200}
          height={200}
        />
      </g>
      <g className={styles.moon}>
        <image href={textures.moon} x={923} y={198} width={84} height={84} />
      </g>
      <g className={styles.washes}>
        <Washes sources={textures.washesDay} className={styles.washesDay ?? ""} />
        <Washes sources={textures.washesNight} className={styles.washesNight ?? ""} />
      </g>
    </g>
  );
}
