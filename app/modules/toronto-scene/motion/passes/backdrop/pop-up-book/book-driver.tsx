import { useEffect, useRef, type RefObject } from "react";

import type { DayPhase } from "../../../../scene-provider";
import type { PassProps } from "../../../motion-types";
import { pageTurnMs, popLayers } from "./pop-layers";
import { useBookPose } from "./use-book-pose";

const foldFlat: Keyframe[] = [
  { scale: "1 1", easing: "cubic-bezier(0.55, 0, 0.8, 0.4)" },
  { scale: "1 0.05", offset: 0.36 },
  { scale: "1 0.05", offset: 0.5, easing: "cubic-bezier(0.2, 0.7, 0.3, 1)" },
  { scale: "1 1.07", offset: 0.78, easing: "ease-in-out" },
  { scale: "1 1" },
];

const foldTower: Keyframe[] = [
  { scale: "1 1", rotate: "0deg", easing: "cubic-bezier(0.55, 0, 0.8, 0.4)" },
  { scale: "1 0.04", rotate: "-5deg", offset: 0.38 },
  { scale: "1 0.04", rotate: "-5deg", offset: 0.56, easing: "cubic-bezier(0.2, 0.7, 0.3, 1)" },
  { scale: "1 1.14", rotate: "2.5deg", offset: 0.76 },
  { scale: "1 0.95", rotate: "-1deg", offset: 0.88 },
  { scale: "1 1", rotate: "0deg" },
];

/**
 * On a phase change the cut-outs fold flat and stand back up (tower last, with an overshoot)
 * while the sky page tips shut and reopens, timed with the turning leaf.
 */
function usePageTurn(
  sceneRef: RefObject<HTMLDivElement | null>,
  phase: DayPhase,
  reducedMotion: boolean,
  turnAt: RefObject<number | null>,
): void {
  const lastPhase = useRef(phase);

  useEffect(() => {
    if (lastPhase.current === phase) return;
    lastPhase.current = phase;
    const scene = sceneRef.current;
    if (!scene || reducedMotion) return;
    turnAt.current = performance.now();

    const animations = popLayers.flatMap((layer, index) => {
      const targets = scene.querySelectorAll<SVGGElement>(
        `[data-scene-layer="${layer}"], [data-popup-shadow="${layer}"]`,
      );
      return [...targets].flatMap((target) =>
        typeof target.animate === "function"
          ? [
              target.animate(layer === "tower" ? foldTower : foldFlat, {
                duration: pageTurnMs,
                // The tower folds first and rises last; the rest ripple out after it.
                delay: layer === "tower" ? 0 : 40 + index * 45,
              }),
            ]
          : [],
      );
    });
    return () => {
      for (const animation of animations) animation.cancel();
    };
  }, [sceneRef, phase, reducedMotion, turnAt]);
}

/** Runs the book: its 3D pose (cursor, scroll, breathing) and the page turn between phases. */
export function BookDriver({ sceneRef, phase, depth, reducedMotion }: PassProps) {
  const turnAt = useRef<number | null>(null);
  useBookPose(sceneRef, depth, reducedMotion, turnAt);
  usePageTurn(sceneRef, phase, reducedMotion, turnAt);
  return null;
}
