import type { ScenePass } from "../../../motion-types";
import { UmbrellaScreen } from "./umbrella-screen";

/**
 * Umbrella: physical weather on a canvas. Rain and snow collide with the skyline's real
 * rooflines, snow piles up on the ledges, clouds are soft masses of paper puffs, and the cursor
 * is an umbrella, a broom and a hand in the clouds.
 */
export const pass: ScenePass = {
  replaces: ["clouds", "rain", "snow"],
  Screen: UmbrellaScreen,
};
