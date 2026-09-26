import type { Portfolio } from "../portfolio-content/model";
import styles from "./work-variants-postcards.module.css";

type Studies = Portfolio["caseStudies"];

export function PostcardsPrompt({ className = "" }: { className?: string }) {
  return (
    <a className={`${styles.prompt} ${className}`} href="#work">
      <span className={styles.promptStack} aria-hidden="true">
        <span />
        <span />
        <span />
      </span>
      <span className={styles.promptCopy}>
        <strong>Postcards from the work</strong>
        <span>Pick one up ↗</span>
      </span>
    </a>
  );
}

export function PostcardsWork({ studies }: { studies: Studies }) {
  return (
    <section className={styles.work} id="work" aria-labelledby="work-heading">
      <div className={styles.intro}>
        <div>
          <p className={styles.overline}>Toronto, Ontario · Portfolio mail</p>
          <h2 id="work-heading">Selected work</h2>
          <p className={styles.description}>
            A few notes from projects I helped shape. Choose a postcard, then follow its story.
          </p>
        </div>
        <nav className={styles.index} aria-label="Choose a work postcard">
          {studies.map((study, index) => (
            <a href={`#${study.id}`} key={study.id}>
              <span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
              {study.organization}
            </a>
          ))}
        </nav>
      </div>

      <div className={styles.postcards}>
        {studies.map((study, index) => (
          <article className={styles.postcard} id={study.id} key={study.id}>
            <div className={styles.front} aria-hidden="true">
              <div className={styles.frontSky}>
                <span className={styles.sun} />
                <span className={styles.tower} />
                <span className={styles.buildingA} />
                <span className={styles.buildingB} />
                <span className={styles.buildingC} />
                <span className={styles.water} />
              </div>
              <div className={styles.frontCaption}>
                <span>From the desk of Joshua Hughes</span>
                <span>Toronto · {String(index + 1).padStart(2, "0")}</span>
              </div>
            </div>

            <div className={styles.back}>
              <header className={styles.cardHeader}>
                <div className={styles.postmark} aria-label={`Project ${index + 1}`}>
                  <span>JH</span>
                  <span>TORONTO</span>
                  <span>{String(index + 1).padStart(2, "0")} / 03</span>
                </div>
                <div className={styles.stamp} aria-hidden="true">
                  <span>✳</span>
                  <small>PORTFOLIO</small>
                </div>
              </header>

              <div className={styles.address}>
                <span>To: Curious people</span>
                <span>From: {study.organization}</span>
              </div>

              <div className={styles.message}>
                <p className={styles.period}>{study.period}</p>
                <h3>{study.title}</h3>
                <p className={styles.summary}>{study.summary}</p>
                <p>{study.context}</p>
                <h4>Notes from the project</h4>
                <ul>
                  {study.contributions.map((contribution) => (
                    <li key={contribution}>{contribution}</li>
                  ))}
                </ul>
              </div>
              <span className={styles.cardNumber} aria-hidden="true">
                POSTCARD {String(index + 1).padStart(2, "0")}
              </span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
