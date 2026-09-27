import { useEffect, useRef } from "react";

import { useCursorParallax } from "../../../original-passes";
import type { PassProps, ScenePass } from "../../../motion-types";
import { anchorHour, torontoHour } from "./clock";
import { createTimeLapse, type TimeLapse } from "./engine";
import styles from "./time-lapse.module.css";

/** Runs the scroll-scrubbed day against the scene root. */
function TimeLapseDriver({ sceneRef, phase, intensity, depth, reducedMotion }: PassProps) {
  const engine = useRef<TimeLapse | null>(null);
  const latest = useRef({ phase, cloud: intensity.cloud });
  useCursorParallax(sceneRef, reducedMotion ? 0 : depth.parallax * 0.6);

  // Declared first so the engine below starts from the current phase and cloud cover.
  useEffect(() => {
    latest.current = { phase, cloud: intensity.cloud };
  });

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    const { phase: startPhase, cloud } = latest.current;
    const timeLapse = createTimeLapse(scene, {
      reducedMotion,
      anchor: anchorHour(startPhase, torontoHour()),
      cloud,
    });
    engine.current = timeLapse;
    return () => {
      timeLapse.destroy();
      engine.current = null;
    };
  }, [sceneRef, reducedMotion]);

  useEffect(() => {
    engine.current?.setAnchor(anchorHour(phase, torontoHour()));
  }, [phase]);

  useEffect(() => {
    engine.current?.setCloud(intensity.cloud);
  }, [intensity.cloud]);

  return null;
}

/** The artwork's cutout clip paths, each with its bounding box so the shadow fills stay small. */
const castShapes = [
  { id: "toronto-left-buildings-cut", x: 0, y: 448, width: 872, height: 576 },
  { id: "toronto-right-buildings-cut", x: 868, y: 586, width: 668, height: 438 },
  { id: "toronto-center-buildings-cut", x: 747, y: 587, width: 124, height: 267 },
  { id: "toronto-tower-cut", x: 755, y: 108, width: 62, height: 492 },
] as const;

/** Stacked offset copies fade out along the cast, like a long shadow drawn in layers of tissue. */
const castSteps = [1, 0.84, 0.68, 0.52, 0.36, 0.2] as const;

function ShadowCast({ step }: { step: number }) {
  return (
    <g className={styles.cast} data-time-lapse="cast" data-step={step}>
      {castShapes.map(({ id, ...box }) => (
        <rect {...box} clipPath={`url(#${id})`} key={id} />
      ))}
    </g>
  );
}

/** Long shadows the cutouts cast on the back sheet, and the long-exposure light trails. */
function TimeLapseSky() {
  return (
    <g aria-hidden="true">
      <g className={styles.casts} data-time-lapse="shadows" opacity="0">
        {castSteps.map((step) => (
          <ShadowCast step={step} key={step} />
        ))}
      </g>
      <path className={styles.starTrails} data-time-lapse="star-trails" />
      <path className={styles.moonTrail} data-time-lapse="moon-trail" />
      <path className={styles.sunTrail} data-time-lapse="sun-trail" />
    </g>
  );
}

/** The camera's timecode: the scrubbed hour and how fast the day is running. */
function TimeLapseTimecode() {
  return (
    <div className={styles.timecode} data-time-lapse="timecode" data-state="live">
      <span className={styles.timecodeDot} />
      <span data-time-lapse="timecode-clock">--:--</span>
      <span className={styles.timecodeRate} data-time-lapse="timecode-rate">
        live
      </span>
    </div>
  );
}

/**
 * Scroll time-lapse: the page is one day long. Scrolling scrubs the light across Toronto — the
 * sun and moon ride their arcs, cast shadows swing across the paper, the artwork crossfades
 * between day and night, the stars wheel — and scrubbing fast dolly-zooms the layers and smears
 * the light into long-exposure trails. Short pages drift the clock on their own; the cursor nudges it.
 */
export const pass: ScenePass = {
  className: styles.root ?? "",
  Driver: TimeLapseDriver,
  Sky: TimeLapseSky,
  Screen: TimeLapseTimecode,
};
