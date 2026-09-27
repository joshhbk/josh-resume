import type { ReactNode } from "react";

import styles from "./pinned-sky.module.css";

/** How far back in the diorama a card hangs: far cards drift least and cast the shortest shadow. */
export type Depth = "far" | "mid" | "near";

type RootProps = {
  /** Named position in the board layout, styled by the board. */
  slot: string;
  depth: Depth;
  as?: "article" | "section" | "header" | "div";
  className?: string | undefined;
  children: ReactNode;
  "aria-labelledby"?: string;
};

const join = (...names: (string | false | undefined)[]) => names.filter(Boolean).join(" ");

/**
 * A sheet of paper hung in the sky. The root follows the cursor at its depth's rate; the swing
 * inside it sways from its fastener with the weather. Anything that must escape the sway (such
 * as a dialog) goes in `after`.
 */
function CardRoot({ slot, depth, as: Element = "div", className, children, ...rest }: RootProps) {
  return (
    <Element className={join(styles.card, className)} data-slot={slot} data-depth={depth} {...rest}>
      {children}
    </Element>
  );
}

/** The part of the card that sways: the fastener and the paper. */
function Swing({ children }: { children: ReactNode }) {
  return <div className={styles.swing}>{children}</div>;
}

/** The cut paper itself, with a slightly hand-trimmed edge. */
function Paper({
  className,
  cut = "a",
  children,
}: {
  className?: string | undefined;
  /** Which of the hand-cut edge profiles to trim this sheet with. */
  cut?: "a" | "b" | "c";
  children: ReactNode;
}) {
  return (
    <div className={join(styles.paper, className)} data-cut={cut}>
      {children}
    </div>
  );
}

/** A round push pin driven into the sky layer. */
function PushPin({ at = "center" }: { at?: "left" | "center" | "right" }) {
  return <span className={styles.pushPin} data-at={at} aria-hidden="true" />;
}

/** A strip of masking tape across one top corner. */
function Tape({ at }: { at: "left" | "right" }) {
  return <span className={styles.tape} data-at={at} aria-hidden="true" />;
}

/** A thread the card hangs from, disappearing up into the sky. */
function Thread({ at = "center" }: { at?: "left" | "center" | "right" }) {
  return <span className={styles.thread} data-at={at} aria-hidden="true" />;
}

export const PaperCard = {
  Root: CardRoot,
  Swing,
  Paper,
  PushPin,
  Tape,
  Thread,
};
