import { UnfoldVertical, X } from "lucide-react";
import type { MouseEvent, ReactNode } from "react";

import type { CaseStudy } from "../portfolio-content/model";
import { copy } from "./copy";
import { PaperCard, type Depth } from "./paper-card";
import { useSheets } from "./sheets";
import styles from "./pinned-sky.module.css";

/** Each pinned project hangs at its own depth, with its own fastener and hand-cut edge. */
const hangings: readonly { depth: Depth; cut: "a" | "b" | "c"; fastener: ReactNode }[] = [
  { depth: "mid", cut: "b", fastener: <PaperCard.PushPin /> },
  { depth: "far", cut: "c", fastener: <PaperCard.Thread at="left" /> },
  {
    depth: "near",
    cut: "a",
    fastener: (
      <>
        <PaperCard.PushPin at="left" />
        <PaperCard.PushPin at="right" />
      </>
    ),
  },
];

/** The unfold mark shared by project cards and the roles index. */
export function UnfoldMark({ className }: { className?: string | undefined }) {
  return (
    <span className={className} aria-hidden="true">
      <UnfoldVertical />
    </span>
  );
}

/** The unfold mark with its label, for the project cards' dog-eared corner. */
function UnfoldCue({ className }: { className?: string | undefined }) {
  return (
    <span className={className} aria-hidden="true">
      <UnfoldVertical />
      {copy.unfold}
    </span>
  );
}

/** The face of a project card: what you can read while it is still folded and pinned up. */
function CardFace({ study, headingId }: { study: CaseStudy; headingId: string }) {
  const { open } = useSheets();
  const titleId = `${study.id}-project`;

  return (
    <>
      <div className={styles.workHead}>
        <h3 className={styles.workCompany} id={headingId}>
          <button
            className={styles.unfoldTrigger}
            type="button"
            aria-haspopup="dialog"
            aria-describedby={titleId}
            onClick={() => open(study.id)}
          >
            {study.organization}
          </button>
        </h3>
        <span className={styles.period}>{study.period}</span>
      </div>
      <p className={styles.workTitle} id={titleId}>
        {study.title}
      </p>
      <p className={styles.workSummary}>{study.summary}</p>
      <UnfoldCue className={styles.unfoldCue} />
    </>
  );
}

/**
 * The project unfolded: lifted out of the sky into the top layer, opening panel by panel like
 * folded paper. It stays in the DOM while closed so the full record is always in the page.
 */
function UnfoldedSheet({ study }: { study: CaseStudy }) {
  const sheets = useSheets();
  const headingId = `${study.id}-sheet`;
  // The dialog's own box is only its ::backdrop, so a click on it means "put this back".
  const closeOnBackdrop = (event: MouseEvent<HTMLDialogElement>) => {
    if (event.target === event.currentTarget) event.currentTarget.close();
  };

  return (
    <dialog
      className={styles.sheetDialog}
      aria-labelledby={headingId}
      ref={(dialog) => (dialog ? sheets.register(study.id, dialog) : undefined)}
      onClick={closeOnBackdrop}
      onClose={sheets.closed}
    >
      <div className={styles.sheet}>
        <PaperCard.PushPin />
        <div className={styles.fold} data-fold="head">
          <div className={styles.workHead}>
            <h3 className={styles.sheetCompany} id={headingId} tabIndex={-1} data-sheet-heading>
              {study.organization}
            </h3>
            <span className={styles.period}>{study.period}</span>
          </div>
          <p className={styles.sheetTitle}>{study.title}</p>
          <p className={styles.sheetSummary}>{study.summary}</p>
          <form method="dialog" className={styles.closeForm}>
            <button className={styles.closeButton} type="submit">
              <X aria-hidden="true" />
              <span>{copy.foldAway}</span>
            </button>
          </form>
        </div>
        <section className={styles.fold} data-fold="context">
          <h4 className={styles.foldHeading}>{copy.contextHeading}</h4>
          <p>{study.context}</p>
        </section>
        <section className={styles.fold} data-fold="contributions">
          <h4 className={styles.foldHeading}>{copy.contributionsHeading}</h4>
          <ul className={styles.contributions}>
            {study.contributions.map((contribution) => (
              <li key={contribution}>{contribution}</li>
            ))}
          </ul>
        </section>
      </div>
    </dialog>
  );
}

/** One project, pinned into the sky. Opening it lifts an unfolded copy forward. */
export function CaseStudyPin({ study, index }: { study: CaseStudy; index: number }) {
  const hanging = hangings[index % hangings.length];
  const headingId = `${study.id}-card`;

  if (!hanging) return null;

  return (
    <PaperCard.Root
      as="article"
      slot={`work-${index + 1}`}
      depth={hanging.depth}
      className={styles.workCard}
      aria-labelledby={headingId}
    >
      <PaperCard.Swing>
        {hanging.fastener}
        <PaperCard.Paper cut={hanging.cut} className={styles.workSheet}>
          <CardFace study={study} headingId={headingId} />
        </PaperCard.Paper>
      </PaperCard.Swing>
      <UnfoldedSheet study={study} />
    </PaperCard.Root>
  );
}
