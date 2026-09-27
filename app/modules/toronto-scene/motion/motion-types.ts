import type { ComponentType, RefObject } from "react";

import type { Conditions, DayPhase, DepthSettings, Weather, WeatherMode } from "../scene-provider";

/** Built-in scene effects a pass can switch off because it draws its own version. */
export type DefaultEffect = "clouds" | "rain" | "snow" | "sun" | "moon" | "stars" | "water";

export type PassProps = {
  /** The scene root. Its `data-scene-layer` descendants can be targeted from pass CSS or JS. */
  sceneRef: RefObject<HTMLDivElement | null>;
  phase: DayPhase;
  weather: Weather;
  weatherMode: WeatherMode;
  /** Live Toronto conditions, independent of any preview. */
  conditions: Conditions;
  /** Normalised strengths of what the scene is currently showing. */
  intensity: {
    /** 0–1 cloud cover. */
    cloud: number;
    /** 0–1 rain strength (0 unless it is raining). */
    rain: number;
    /** -1 (wind blowing left) to 1 (blowing right). */
    wind: number;
  };
  depth: DepthSettings;
  reducedMotion: boolean;
};

/**
 * A motion or weather treatment for the Toronto scene. Every part is optional:
 * - `className` goes on the scene root, so a CSS module can restyle `[data-scene-layer]` elements.
 * - `Driver` renders nothing and runs effects (pointer, scroll, timers) against `sceneRef`.
 * - `Sky`, `Mid` and `Front` render SVG content in the 1536×1024 artwork coordinate space:
 *   `Sky` inside the sky sheet (behind the city), `Mid` between the buildings and the trees,
 *   `Front` in the overlay sheet in front of everything except the paper frame.
 * - `Screen` renders HTML (e.g. a canvas) covering the whole scene, above the paper frame.
 */
export type ScenePass = {
  className?: string;
  replaces?: readonly DefaultEffect[];
  Driver?: ComponentType<PassProps>;
  Sky?: ComponentType<PassProps>;
  Mid?: ComponentType<PassProps>;
  Front?: ComponentType<PassProps>;
  Screen?: ComponentType<PassProps>;
};
