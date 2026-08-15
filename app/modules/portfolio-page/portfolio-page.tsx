import type { CaseStudy, Portfolio } from "../portfolio-content/model";
import styles from "./portfolio-page.module.css";

function Hero({ person }: { person: Portfolio["person"] }) {
  return (
    <header className={styles.hero}>
      <div className={styles.poster}>
        <div className={styles.redField} aria-hidden="true" />
        <div className={styles.blueField} aria-hidden="true" />
        <div className={styles.dividingLine} aria-hidden="true" />

        <div className={`${styles.identity} ${styles.metadata}`}>
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
          <figcaption className={`${styles.metadata} ${styles.photoCredit}`}>
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

function Profile({ content }: { content: Portfolio }) {
  return (
    <section
      className={`${styles.sectionFrame} ${styles.surfacePanel}`}
      id="profile"
      aria-labelledby="profile-heading"
    >
      <header className={styles.plainSectionHeader}>
        <h2 className={`${styles.displayHeading} ${styles.profileHeading}`} id="profile-heading">
          Profile
        </h2>
        <p className={`${styles.metadata} ${styles.profileLocation}`}>{content.person.location}</p>
      </header>
      <div className={styles.profileCopy}>
        <p className={`${styles.featureText} ${styles.profileSummary}`}>{content.person.summary}</p>
      </div>
    </section>
  );
}

function CaseStudyArticle({ study }: { study: CaseStudy }) {
  return (
    <article className={styles.caseStudy} id={study.id}>
      <header className={styles.caseStudyHeader}>
        <p className={`${styles.metadata} ${styles.caseNumber}`}>{study.number}</p>
        <div>
          <h3 className={`${styles.cardHeading} ${styles.caseStudyTitle}`}>{study.title}</h3>
          <p className={`${styles.metadata} ${styles.caseMeta}`}>
            {study.organization} / {study.period}
          </p>
        </div>
      </header>

      <p className={`${styles.featureText} ${styles.caseSummary}`}>{study.summary}</p>

      <div className={styles.caseBody}>
        <div className={styles.caseColumn}>
          <h4 className={`${styles.metadata} ${styles.caseBodyHeading}`}>Background</h4>
          <p>{study.context}</p>
        </div>
        <div className={styles.caseColumn}>
          <h4 className={`${styles.metadata} ${styles.caseBodyHeading}`}>Work completed</h4>
          <ol role="list">
            {study.decisions.map((decision) => (
              <li key={decision}>{decision}</li>
            ))}
          </ol>
        </div>
      </div>

      <ul
        className={`${styles.metadata} ${styles.technologyList}`}
        aria-label="Technologies used"
        role="list"
      >
        {study.technologies.map((technology) => (
          <li key={technology}>{technology}</li>
        ))}
      </ul>
    </article>
  );
}

function SelectedWork({ studies }: { studies: Portfolio["caseStudies"] }) {
  return (
    <section
      className={`${styles.sectionFrame} ${styles.surfacePanel} ${styles.sectionFlow}`}
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
            <p className={`${styles.metadata} ${styles.experiencePeriod}`}>{item.period}</p>
            <p className={styles.experienceDescription}>{item.description}</p>
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
        Contact
      </h2>
      <address>
        <p className={styles.contactMessage}>{person.contactMessage}</p>
        <a
          className={`${styles.boxedAction} ${styles.contactLink}`}
          href={`mailto:${person.email}`}
        >
          {person.email}
        </a>
      </address>
      <div className={`${styles.metadata} ${styles.contactMeta}`}>
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
        <Profile content={content} />
        <SelectedWork studies={content.caseStudies} />
        <Experience experience={content.experience} />
      </main>
      <Contact person={content.person} />
    </div>
  );
}
