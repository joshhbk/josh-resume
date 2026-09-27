import { useState } from "react";

import type { DayPhase } from "../../../../scene-provider";
import type { PassProps } from "../../../motion-types";
import styles from "./pop-up-book.module.css";
import { shadowCards } from "./pop-layers";

/**
 * Shadows the standing cut-outs cast on the sky page behind them. They live on the sky sheet,
 * deeper in the book than the city, so they slide against the buildings as the book tilts.
 */
export function CardShadows() {
  return (
    <g className={styles.cardShadows} aria-hidden="true">
      {shadowCards.map(([layer, clip]) => (
        <g className={styles.cardShadow} data-popup-shadow={layer} key={layer}>
          <rect width="1536" height="1024" clipPath={`url(#${clip})`} />
        </g>
      ))}
    </g>
  );
}

/** The book's centre fold: a soft crease running down the spread, just left of the tower. */
export function Gutter() {
  return (
    <g className={styles.gutter} aria-hidden="true">
      <defs>
        <linearGradient id="pop-up-book-gutter" x1="0" x2="1">
          <stop offset="0" stopColor="var(--book-crease)" stopOpacity="0" />
          <stop offset="0.44" stopColor="var(--book-crease)" stopOpacity="0.05" />
          <stop offset="0.495" stopColor="var(--book-crease)" stopOpacity="0.2" />
          <stop offset="0.505" stopColor="var(--book-crease-light)" stopOpacity="0.2" />
          <stop offset="0.56" stopColor="var(--book-crease-light)" stopOpacity="0.04" />
          <stop offset="1" stopColor="var(--book-crease-light)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect x="668" width="200" height="1024" fill="url(#pop-up-book-gutter)" />
    </g>
  );
}

const pageNames: Record<DayPhase, { folio: string; title: string }> = {
  dawn: { folio: "i", title: "Dawn" },
  day: { folio: "ii", title: "Day" },
  dusk: { folio: "iii", title: "Dusk" },
  night: { folio: "iv", title: "Night" },
};

type Turn = { from: DayPhase; to: DayPhase; id: number };

function Leaf({ turn, onDone }: { turn: Turn; onDone: () => void }) {
  const { folio, title } = pageNames[turn.to];
  return (
    <div className={styles.leaf} onAnimationEnd={onDone}>
      <div className={styles.leafFront} data-page={turn.from} />
      <div className={styles.leafBack} data-page={turn.to}>
        <span className={styles.folio}>{folio}</span>
        <span className={styles.chapter}>{title}</span>
      </div>
    </div>
  );
}

/**
 * A vellum leaf that turns over the spread when the light changes, carrying the new chapter title
 * on its back. Hidden entirely under reduced motion.
 */
export function PageTurn({ phase, reducedMotion }: PassProps) {
  const [shownPhase, setShownPhase] = useState(phase);
  const [turn, setTurn] = useState<Turn | null>(null);

  if (phase !== shownPhase) {
    setShownPhase(phase);
    setTurn({ from: shownPhase, to: phase, id: (turn?.id ?? 0) + 1 });
  }

  return (
    <div className={styles.spread}>
      {turn && !reducedMotion ? (
        <Leaf turn={turn} onDone={() => setTurn(null)} key={turn.id} />
      ) : null}
    </div>
  );
}
