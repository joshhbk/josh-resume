/**
 * The paper cut-outs that stand up off the page, in the order they fold down when a page turns.
 * Each hinges at its base (see the matching `transform-origin`s in the CSS module).
 */
export const popLayers = [
  "tower",
  "buildings-center",
  "buildings-right",
  "buildings-left",
  "trees",
] as const;

export type PopLayer = (typeof popLayers)[number];

/**
 * Cut-outs that cast a card shadow onto the sky page behind them, with the clip path of their
 * silhouette. Only these two: the side buildings' clip paths are loose boxes around keyed-out art,
 * so their shadows would read as ghost buildings.
 */
export const shadowCards = [
  ["tower", "toronto-tower-cut"],
  ["buildings-center", "toronto-center-buildings-cut"],
] as const satisfies readonly (readonly [PopLayer, string])[];

/** How long a page turn takes, shared by the leaf, the folding cut-outs and the tipping sky page. */
export const pageTurnMs = 1300;
