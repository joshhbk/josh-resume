import type { ComponentType, RefObject } from "react";

import type { DayPhase, DepthSettings } from "../scene-provider";

export type PassProps = {
  /** The scene root. Its `data-scene-layer` descendants can be targeted from pass CSS or JS. */
  sceneRef: RefObject<HTMLDivElement | null>;
  phase: DayPhase;
  depth: DepthSettings;
  reducedMotion: boolean;
};

/**
 * A backdrop motion treatment for the Toronto scene. Every part is optional:
 * - `className` goes on the scene root, so a CSS module can restyle `[data-scene-layer]` elements.
 * - `Driver` renders nothing and runs effects (pointer, scroll, timers) against `sceneRef`.
 * - `Sky` and `Front` render SVG content in the artwork's 1536×1024 space: `Sky` inside the sky
 *   sheet (behind the city), `Front` in the overlay sheet in front of everything but the frame.
 * - `Screen` renders HTML covering the whole scene, above the paper frame.
 */
export type ScenePass = {
  className?: string;
  Driver?: ComponentType<PassProps>;
  Sky?: ComponentType<PassProps>;
  Front?: ComponentType<PassProps>;
  Screen?: ComponentType<PassProps>;
};
