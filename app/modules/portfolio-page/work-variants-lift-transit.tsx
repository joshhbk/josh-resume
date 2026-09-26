import type { Portfolio } from "../portfolio-content/model";
import styles from "./work-variants-lift-transit.module.css";

type Studies = Portfolio["caseStudies"];

export function LiftCityPrompt() {
  return (
    <a className={styles.liftPrompt} href="#work">
      <span className={styles.liftPromptHandle} aria-hidden="true" />
      <span className={styles.liftPromptText}>
        <span className={styles.liftPromptSmall}>There is more beneath the city</span>
        <strong>Lift to explore</strong>
      </span>
      <span className={styles.liftPromptArrow} aria-hidden="true">
        ↑
      </span>
    </a>
  );
}

export function LiftCityWork({ studies }: { studies: Studies }) {
  return (
    <section className={styles.liftWork} id="work" aria-labelledby="work-heading">
      <div className={styles.liftEdge} aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <header className={styles.liftHeader}>
        <p className={styles.liftOverline}>The city, lifted</p>
        <h2 id="work-heading">What is underneath</h2>
        <p>Three pieces of work, gathered like sheets beneath the skyline.</p>
      </header>
      <div className={styles.liftStack}>
        {studies.map((study, index) => (
          <details className={styles.liftSheet} key={study.id} open={index === 0} id={study.id}>
            <summary className={styles.liftSummary}>
              <span className={styles.liftSheetNumber}>{String(index + 1).padStart(2, "0")}</span>
              <span className={styles.liftSheetIdentity}>
                <span className={styles.liftSheetLabel}>
                  {study.organization} · {study.period}
                </span>
                <span className={styles.liftSheetTitle}>{study.title}</span>
              </span>
              <span className={styles.liftSheetAction} aria-hidden="true">
                ↗
              </span>
            </summary>
            <div className={styles.liftSheetContent}>
              <p className={styles.liftLead}>{study.summary}</p>
              <div className={styles.liftColumns}>
                <div>
                  <h3>Project context</h3>
                  <p>{study.context}</p>
                </div>
                <div>
                  <h3>What I worked on</h3>
                  <ul>
                    {study.contributions.map((contribution) => (
                      <li key={contribution}>{contribution}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </details>
        ))}
      </div>
      <p className={styles.liftFootnote}>Each sheet can be lifted independently.</p>
    </section>
  );
}

export function StreetcarPrompt() {
  return (
    <a className={styles.streetcarPrompt} href="#work">
      <span className={styles.streetcarPromptRoute}>501</span>
      <span className={styles.streetcarPromptText}>
        <strong>Board the work route</strong>
        <small>Next stop: the projects</small>
      </span>
      <span className={styles.streetcarPromptArrow} aria-hidden="true">
        →
      </span>
    </a>
  );
}

export function StreetcarWork({ studies }: { studies: Studies }) {
  return (
    <section className={styles.streetcarWork} id="work" aria-labelledby="work-heading">
      <div className={styles.streetcarMasthead}>
        <div className={styles.streetcarRouteShield} aria-hidden="true">
          501
        </div>
        <div>
          <p className={styles.streetcarEyebrow}>A journey through the work</p>
          <h2 id="work-heading">The project route</h2>
          <p>Follow the line from one stop to the next.</p>
        </div>
      </div>
      <nav className={styles.streetcarStopNav} aria-label="Project stops">
        {studies.map((study, index) => (
          <a href={`#${study.id}`} key={study.id}>
            <span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
            {study.organization}
          </a>
        ))}
      </nav>
      <div className={styles.streetcarStops}>
        {studies.map((study, index) => (
          <article className={styles.streetcarStop} id={study.id} key={study.id}>
            <div className={styles.streetcarStopMarker} aria-hidden="true">
              <span>{String(index + 1).padStart(2, "0")}</span>
            </div>
            <div className={styles.streetcarStopCard}>
              <div className={styles.streetcarStopHeader}>
                <span className={styles.streetcarStopOverline}>
                  Stop {String(index + 1).padStart(2, "0")} · {study.period}
                </span>
                <span className={styles.streetcarStopOrg}>{study.organization}</span>
              </div>
              <h3>{study.title}</h3>
              <p className={styles.streetcarLead}>{study.summary}</p>
              <div className={styles.streetcarColumns}>
                <div>
                  <h4>Along the way</h4>
                  <p>{study.context}</p>
                </div>
                <div>
                  <h4>My contribution</h4>
                  <ul>
                    {study.contributions.map((contribution) => (
                      <li key={contribution}>{contribution}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
      <div className={styles.streetcarTerminus}>
        End of this line <span aria-hidden="true">●</span>
      </div>
    </section>
  );
}
