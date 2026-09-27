import { useEffect, useRef, type RefObject } from "react";

import type { PassProps, ScenePass } from "./motion-types";

const planeMotion = [
  ["sky", 3, 2],
  ["land", 16, 8],
  ["water", 33, 17],
] as const;

/**
 * Moves the sky, land and water sheets by different amounts as the cursor crosses the window,
 * through the `--sky-x/y`, `--land-x/y` and `--water-x/y` custom properties on the scene root.
 */
export function useCursorParallax(
  sceneRef: RefObject<HTMLDivElement | null>,
  strength: number,
): void {
  const lastPointer = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    const clearOffsets = () => {
      for (const [plane] of planeMotion) {
        scene.style.removeProperty(`--${plane}-x`);
        scene.style.removeProperty(`--${plane}-y`);
      }
    };
    const applyOffsets = (x: number, y: number) => {
      for (const [plane, xRange, yRange] of planeMotion) {
        scene.style.setProperty(`--${plane}-x`, `${Math.round(x * xRange * strength)}px`);
        scene.style.setProperty(`--${plane}-y`, `${Math.round(y * yRange * strength)}px`);
      }
    };
    if (lastPointer.current) applyOffsets(lastPointer.current.x, lastPointer.current.y);
    const movePlanes = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      const x = event.clientX / window.innerWidth - 0.5;
      const y = event.clientY / window.innerHeight - 0.5;
      lastPointer.current = { x, y };
      applyOffsets(x, y);
    };
    const resetOffsets = () => {
      lastPointer.current = null;
      clearOffsets();
    };

    window.addEventListener("pointermove", movePlanes);
    window.addEventListener("blur", resetOffsets);
    return () => {
      window.removeEventListener("pointermove", movePlanes);
      window.removeEventListener("blur", resetOffsets);
      clearOffsets();
    };
  }, [sceneRef, strength]);
}

function CursorParallax({ sceneRef, depth }: PassProps) {
  useCursorParallax(sceneRef, depth.parallax);
  return null;
}

/** The shipped backdrop motion: cursor parallax across three paper sheets. */
export const originalBackdrop: ScenePass = { Driver: CursorParallax };
