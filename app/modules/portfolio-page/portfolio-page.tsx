import type { CaseStudy, Portfolio } from "../portfolio-content/model";
import styles from "./portfolio-page.module.css";

function Hero({ person }: { person: Portfolio["person"] }) {
  return (
    <header className={styles.hero}>
      <div className={styles.poster}>
        <div className={styles.redField} aria-hidden="true" />
        <div className={styles.blueField} aria-hidden="true" />

        <div className={`${styles.identity} ${styles.supportingText}`}>
          <p className={styles.identityName}>{person.name}</p>
          <p className={styles.identityLocation}>{person.location}</p>
        </div>

        <div className={styles.titleBlock}>
          <h1 className={`${styles.displayHeading} ${styles.heroTitle}`} aria-label={person.role}>
            <span className={styles.boxedHeading} aria-hidden="true">
              Staff
            </span>
            <span className={styles.boxedHeading} aria-hidden="true">
              Front-End
            </span>
            <span className={styles.boxedHeading} aria-hidden="true">
              Engineer
            </span>
          </h1>
          <p className={styles.heroSummary}>
            More than 12 years building and improving software products.
          </p>
        </div>

        <a className={`${styles.boxedAction} ${styles.heroLink}`} href="#work">
          Selected work
          <span aria-hidden="true">↓</span>
        </a>

        <figure className={styles.photo}>
          <picture>
            <source
              type="image/webp"
              srcSet="/images/toronto-skyline-960.webp 960w, /images/toronto-skyline-1600.webp 1600w"
              sizes="(max-width: 700px) 82vw, 48vw"
            />
            <img
              src="/images/toronto-skyline.jpg"
              alt="Toronto skyline with the CN Tower"
              width="1800"
              height="1200"
              fetchPriority="high"
            />
          </picture>
          <figcaption className={`${styles.supportingText} ${styles.photoCredit}`}>
            Toronto waterfront. Photo by{" "}
            <a href="https://unsplash.com/photos/cn-tower-grayscale-photography-trq3hS53NYU">
              Osama Saeed
            </a>
            .
          </figcaption>
        </figure>
      </div>
    </header>
  );
}

function CaseStudyArticle({ study }: { study: CaseStudy }) {
  return (
    <article className={styles.caseStudy} id={study.id}>
      <header className={styles.caseStudyHeader}>
        <div className={styles.caseStudyIdentity}>
          <h3 className={`${styles.cardHeading} ${styles.caseStudyTitle}`}>{study.title}</h3>
          <p className={styles.caseMeta}>
            {study.organization}, {study.period}
          </p>
        </div>
        <p className={`${styles.featureText} ${styles.caseSummary}`}>{study.summary}</p>
      </header>

      <div className={styles.caseStudyRule} aria-hidden="true" />

      <div className={styles.caseBody}>
        <section className={styles.caseColumn}>
          <h4 className={`${styles.cardHeading} ${styles.caseBodyHeading}`}>Project context</h4>
          <p>{study.context}</p>
        </section>
        <section className={styles.caseColumn}>
          <h4 className={`${styles.cardHeading} ${styles.caseBodyHeading}`}>What I worked on</h4>
          <ul>
            {study.contributions.map((contribution) => (
              <li key={contribution}>{contribution}</li>
            ))}
          </ul>
        </section>
      </div>
    </article>
  );
}

function SelectedWork({ studies }: { studies: Portfolio["caseStudies"] }) {
  return (
    <section
      className={`${styles.sectionFrame} ${styles.sectionFlow}`}
      id="work"
      aria-labelledby="work-heading"
    >
      <header className={styles.splitSectionHeader}>
        <h2
          className={`${styles.displayHeading} ${styles.workHeading}`}
          id="work-heading"
          aria-label="Selected work"
        >
          <span className={styles.boxedHeading} aria-hidden="true">
            Selected
          </span>
          <span className={styles.boxedHeading} aria-hidden="true">
            work
          </span>
        </h2>
      </header>
      <div className={styles.caseStudyList}>
        {studies.map((study) => (
          <CaseStudyArticle key={study.id} study={study} />
        ))}
      </div>
    </section>
  );
}

function Experience({ experience }: { experience: Portfolio["experience"] }) {
  return (
    <section
      className={`${styles.sectionFrame} ${styles.sectionFlow} ${styles.sectionInset} ${styles.experience}`}
      id="experience"
      aria-labelledby="experience-heading"
    >
      <header>
        <h2
          className={`${styles.displayHeading} ${styles.boxedHeading} ${styles.experienceHeading}`}
          id="experience-heading"
        >
          Selected experience
        </h2>
      </header>
      <div className={styles.experienceList}>
        {experience.map((item) => (
          <article key={`${item.organization}-${item.period}`}>
            <h3 className={`${styles.cardHeading} ${styles.experienceTitle}`}>
              {item.organization}
            </h3>
            <p className={styles.experienceRole}>{item.role}</p>
            <p className={`${styles.supportingText} ${styles.experiencePeriod}`}>{item.period}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function Contact({ person }: { person: Portfolio["person"] }) {
  return (
    <footer
      className={`${styles.sectionFrame} ${styles.sectionFlow} ${styles.sectionInset} ${styles.contact}`}
      id="contact"
    >
      <div className={styles.contactRed} aria-hidden="true" />
      <div className={styles.contactBlue} aria-hidden="true" />
      <h2 className={`${styles.displayHeading} ${styles.boxedHeading} ${styles.contactHeading}`}>
        GitHub
      </h2>
      <div className={styles.githubContact}>
        <p className={styles.contactMessage}>{person.contactMessage}</p>
        <a className={styles.githubLink} href={person.github.url} rel="me">
          <span className={styles.githubIdentity}>
            <svg
              className={styles.githubMark}
              viewBox="0 0 24 24"
              width="24"
              height="24"
              aria-hidden="true"
            >
              <path
                fill="currentColor"
                d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.87c-2.78.6-3.37-1.18-3.37-1.18-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.61.07-.61 1 .07 1.53 1.03 1.53 1.03.9 1.53 2.35 1.09 2.92.83.09-.65.35-1.09.64-1.34-2.22-.25-4.56-1.11-4.56-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02A9.6 9.6 0 0 1 12 6.82a9.6 9.6 0 0 1 2.5.34c1.91-1.29 2.75-1.02 2.75-1.02.55 1.37.2 2.39.1 2.64.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.69-4.57 4.94.36.31.68.92.68 1.85v2.76c0 .27.18.58.69.48A10 10 0 0 0 12 2Z"
              />
            </svg>
            <span>@{person.github.handle}</span>
          </span>
          <span className={styles.githubAction}>
            View profile
            <span className={styles.githubArrow} aria-hidden="true">
              ↗
            </span>
          </span>
        </a>
      </div>
      <div className={`${styles.supportingText} ${styles.contactMeta}`}>
        <span>{person.name}</span>
        <span>{person.location}</span>
      </div>
    </footer>
  );
}

export function PortfolioPage({ content }: { content: Portfolio }) {
  return (
    <div className={styles.page}>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <Hero person={content.person} />
      <main id="main-content" tabIndex={-1}>
        <SelectedWork studies={content.caseStudies} />
        <Experience experience={content.experience} />
      </main>
      <Contact person={content.person} />
    </div>
  );
}
