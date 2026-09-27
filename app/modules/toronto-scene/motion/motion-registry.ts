import type { ScenePass } from "./motion-types";
import { originalBackdrop, originalWeather } from "./original-passes";

export type PassEntry = {
  id: string;
  name: string;
  pitch: string;
  load: () => Promise<ScenePass>;
};

/**
 * Backdrop motion passes the Motion lab can apply. Each loads on demand, so production (which
 * only uses the originals) never bundles them.
 */
export const backdropPasses = [
  {
    id: "original",
    name: "Original",
    pitch: "Cursor parallax across the sky, land and water sheets.",
    load: async () => originalBackdrop,
  },
  {
    id: "pop-up-book",
    name: "Pop-up book",
    pitch:
      "The diorama opens from flat, its cut-outs hinge up off the page, and the book tilts, closes as you scroll and turns a page when the light changes.",
    load: () => import("./passes/backdrop/pop-up-book/pass").then((module) => module.pass),
  },
  {
    id: "stop-motion",
    name: "Stop-motion boil",
    pitch:
      "Shot on twelves: every cut-out re-posed by an unsteady hand, edges boiling, and the animator's hand, thumb and light leaks caught on film.",
    load: () => import("./passes/backdrop/stop-motion/pass").then((module) => module.pass),
  },
  {
    id: "time-lapse",
    name: "Scroll time-lapse",
    pitch:
      "The page is one day long: scrolling scrubs the sun, shadows and stars across Toronto; scrub fast and it dolly-zooms and burns long-exposure trails.",
    load: () => import("./passes/backdrop/time-lapse/pass").then((module) => module.pass),
  },
  {
    id: "breathing-city",
    name: "Breathing city",
    pitch:
      "The skyline is one sleeping animal: it breathes in a wave, yawns, gasps when you click, and its tower pod beats like a heart.",
    load: () => import("./passes/backdrop/breathing-city/pass").then((module) => module.pass),
  },
  {
    id: "paper-springs",
    name: "Paper springs",
    pitch:
      "Every paper sheet hangs on its own spring: shove the city with the cursor, pluck the tower, click the sky to send a shockwave.",
    load: () => import("./passes/backdrop/paper-springs/pass").then((module) => module.pass),
  },
] as const satisfies readonly PassEntry[];

/** Weather passes the Motion lab can apply. Each one treats clear, cloudy, rain and snow. */
export const weatherPasses = [
  {
    id: "original",
    name: "Original",
    pitch: "Drifting paper clouds, two depths of rain with ripples, and two depths of snow.",
    load: async () => originalWeather,
  },
  {
    id: "origami",
    name: "Origami weather",
    pitch:
      "Folded paper clouds, paper-strip rain that crumples on the lake, flipping hole-punch snow, and a pinwheel sun or pleated moon.",
    load: () => import("./passes/weather/origami/pass").then((module) => module.pass),
  },
  {
    id: "strings-attached",
    name: "Strings attached",
    pitch:
      "Toy-theatre weather flown in on threads: felt clouds, a cardboard sun, a tinfoil moon, glass-bead rain and cotton-wool snow.",
    load: () => import("./passes/weather/strings-attached/pass").then((module) => module.pass),
  },
  {
    id: "typewriter",
    name: "Typewriter weather",
    pitch:
      "The sky is typed: overstruck glyph clouds, slash rain that leaves commas on the lake, asterisk snow, a red-ribbon sun, and a carriage return when the weather changes.",
    load: () => import("./passes/weather/typewriter/pass").then((module) => module.pass),
  },
  {
    id: "wet-ink",
    name: "Wet ink",
    pitch:
      "Weather happens to the paper: rain blooms, runs and dries into tide lines, snow piles up as gouache, clouds are wet-in-wet washes.",
    load: () => import("./passes/weather/wet-ink/pass").then((module) => module.pass),
  },
  {
    id: "umbrella",
    name: "Umbrella",
    pitch:
      "Weather that lands on the real roofs: rain parts around your invisible umbrella, snow piles up for you to sweep, clouds come apart in your hands.",
    load: () => import("./passes/weather/umbrella/pass").then((module) => module.pass),
  },
] as const satisfies readonly PassEntry[];

export type BackdropPassId = (typeof backdropPasses)[number]["id"];
export type WeatherPassId = (typeof weatherPasses)[number]["id"];
