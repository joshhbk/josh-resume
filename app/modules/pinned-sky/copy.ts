import type { Portfolio } from "../portfolio-content/model";
import type { SceneContextValue } from "../toronto-scene/scene-provider";

const countWords = ["No", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];

/** "Three" for 3, falling back to digits past nine. */
export function countWord(count: number): string {
  return countWords[count] ?? String(count);
}

const modeLabels: Record<SceneContextValue["state"]["mode"], string> = {
  live: "Live",
  dawn: "Dawn",
  day: "Day",
  dusk: "Dusk",
  night: "Night",
};

/** Every piece of framing copy this layout adds on top of the portfolio record. */
export const copy = {
  workHeading: "Pinned work",
  /** On the wide board the projects hang either side of the CN Tower. */
  workHintBoard: (studies: Portfolio["caseStudies"]) =>
    `${countWord(studies.length)} projects are pinned up around the tower. Open one to unfold it.`,
  /** On the narrow stack they hang further down the page. */
  workHintStack: (studies: Portfolio["caseStudies"]) =>
    `${countWord(studies.length)} projects hang further down. Tap one to unfold it.`,
  unfold: "Unfold",
  foldAway: "Fold it back",
  contextHeading: "Context",
  contributionsHeading: "What I worked on",
  rolesHeading: "Where I've worked",
  rolesNote: "Most recent on top",
  profilesHeading: "Find me elsewhere",
  controlsHeading: "Change the sky",
  controlsValue: (mode: SceneContextValue["state"]["mode"]) => modeLabels[mode],
};
