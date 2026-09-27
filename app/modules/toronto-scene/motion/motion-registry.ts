import type { ScenePass } from "./motion-types";
import { originalBackdrop } from "./original-passes";

export type PassEntry = {
  id: string;
  name: string;
  pitch: string;
  load: () => Promise<ScenePass>;
};

/**
 * Backdrop motion passes the Motion lab can apply. Each loads on demand, so production (which
 * only uses the original) never bundles them.
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
] as const satisfies readonly PassEntry[];
