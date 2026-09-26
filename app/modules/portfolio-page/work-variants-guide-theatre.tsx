import { useState } from "react";

import type { Portfolio } from "../portfolio-content/model";
import styles from "./work-variants-guide-theatre.module.css";

type Studies = Portfolio["caseStudies"];

export function FieldGuidePrompt() {
  return (
    <a className={styles.guidePrompt} href="#work">
      <span className={styles.guidePromptTab} aria-hidden="true">
        01 / FIELD NOTES
      </span>
      <span className={styles.guidePromptTitle}>Open the field guide</span>
      <span className={styles.guidePromptArrow} aria-hidden="true">
        ↘
      </span>
    </a>
  );
}

export function FieldGuideWork({ studies }: { studies: Studies }) {
  return (
    <section className={styles.guideSection} id="work" aria-labelledby="work-heading">
      <div className={styles.guideBinding} aria-hidden="true">
        <i />
        <i />
        <i />
      </div>
      <div className={styles.guideIntro}>
        <p className={styles.guideKicker}>Joshua Hughes / collected notes</p>
        <h2 id="work-heading">
          A field guide to
          <br />
          <em>making things work.</em>
        </h2>
        <p>
          Pull open a chapter. Each page is a little record of the people, products, and problems
          behind the work.
        </p>
      </div>
      <div className={styles.guideChapters}>
        {studies.map((study, index) => (
          <details className={styles.guideChapter} key={study.id} open={index === 0}>
            <summary>
              <span className={styles.guideChapterNumber}>
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className={styles.guideChapterName}>{study.title}</span>
              <span className={styles.guideChapterOrganization}>{study.organization}</span>
              <span className={styles.guideChapterToggle} aria-hidden="true">
                +
              </span>
            </summary>
            <div className={styles.guideChapterContents}>
              <div className={styles.guideChapterMain}>
                <p className={styles.guideChapterLabel}>Observation / {study.period}</p>
                <h3>{study.title}</h3>
                <p className={styles.guideChapterSummary}>{study.summary}</p>
                <p className={styles.guideChapterContext}>{study.context}</p>
              </div>
              <aside className={styles.guideChapterMargin} aria-label={`Notes on ${study.title}`}>
                <span className={styles.guideMarginIcon} aria-hidden="true">
                  ✳
                </span>
                <h4>Work in the margins</h4>
                <ul>
                  {study.contributions.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </aside>
            </div>
          </details>
        ))}
      </div>
      <p className={styles.guideColophon}>End of field notes · keep exploring ↓</p>
    </section>
  );
}

export function PaperTheatrePrompt() {
  return (
    <a className={styles.theatrePrompt} href="#work">
      <span className={styles.theatrePromptCord} aria-hidden="true" />
      <span className={styles.theatrePromptTag}>
        PULL
        <br />
        TO
        <br />
        BEGIN
      </span>
      <span className={styles.theatrePromptTitle}>
        The curtain rises <span aria-hidden="true">↘</span>
      </span>
    </a>
  );
}

export function PaperTheatreWork({ studies }: { studies: Studies }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const active = studies[activeIndex] ?? studies[0]!;

  return (
    <section className={styles.theatreSection} id="work" aria-labelledby="work-heading">
      <div className={styles.theatreMarquee}>
        <span className={styles.theatreStar} aria-hidden="true">
          ✳
        </span>
        <div>
          <p>Joshua Hughes presents</p>
          <h2 id="work-heading">A few selected acts</h2>
        </div>
        <span className={styles.theatreStar} aria-hidden="true">
          ✳
        </span>
      </div>
      <div className={styles.theatreStage}>
        <div className={styles.theatreCurtainLeft} aria-hidden="true" />
        <div className={styles.theatreCurtainRight} aria-hidden="true" />
        <div className={styles.theatreBackdrop} aria-hidden="true">
          <span className={styles.theatreMoon} />
          <span className={styles.theatreHillBack} />
          <span className={styles.theatreHillFront} />
        </div>
        <article className={styles.theatreCard} key={active.id} aria-live="polite">
          <p className={styles.theatreAct}>
            Act {String(activeIndex + 1).padStart(2, "0")} <span>/</span>{" "}
            {String(studies.length).padStart(2, "0")}
          </p>
          <h3>{active.title}</h3>
          <p className={styles.theatreMeta}>
            {active.organization} · {active.period}
          </p>
          <p className={styles.theatreSummary}>{active.summary}</p>
          <div className={styles.theatreDetails}>
            <div>
              <h4>The scene</h4>
              <p>{active.context}</p>
            </div>
            <div>
              <h4>Behind the scenes</h4>
              <ul>
                {active.contributions.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </article>
        <div className={styles.theatreFootlights} aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
          <i />
          <i />
          <i />
        </div>
      </div>
      <nav className={styles.theatreControls} aria-label="Choose a project act">
        <button
          type="button"
          onClick={() => setActiveIndex((activeIndex - 1 + studies.length) % studies.length)}
          aria-label="Previous act"
        >
          ← <span>Previous</span>
        </button>
        <div className={styles.theatreActList}>
          {studies.map((study, index) => (
            <button
              type="button"
              key={study.id}
              aria-label={`Show act ${index + 1}: ${study.title}`}
              aria-current={index === activeIndex ? "true" : undefined}
              onClick={() => setActiveIndex(index)}
            >
              {String(index + 1).padStart(2, "0")}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setActiveIndex((activeIndex + 1) % studies.length)}
          aria-label="Next act"
        >
          <span>Next</span> →
        </button>
      </nav>
    </section>
  );
}
