import type { CaseStudy, Portfolio } from "../../portfolio-content/model";
import styles from "./ajpw-portfolio.module.css";

function Hero({ person }: { person: Portfolio["person"] }) {
  return (
    <header className={styles.hero}>
      <div className={styles.poster}>
        <div className={styles.redField} aria-hidden="true" />
        <div className={styles.blueField} aria-hidden="true" />
        <div className={styles.dividingLine} aria-hidden="true" />

        <div className={styles.identity}>
          <p>{person.name}</p>
          <p>{person.location}</p>
        </div>

        <div className={styles.titleBlock}>
          <h1 aria-label={person.role}>
            <span aria-hidden="true">Staff</span>
            <span aria-hidden="true">Front-End</span>
            <span aria-hidden="true">Engineer</span>
          </h1>
          <p>React and TypeScript. More than 12 years of product engineering.</p>
        </div>

        <div className={styles.heroDetails}>
          <span>Product engineering</span>
          <span>Frontend architecture</span>
          <span>Design systems</span>
        </div>

        <button
          className={styles.heroLink}
          type="button"
          onClick={() => document.querySelector("#profile")?.scrollIntoView()}
        >
          Read the portfolio
          <span aria-hidden="true">↓</span>
        </button>

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
          <figcaption>
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
    <section className={styles.profile} id="profile">
      <header className={styles.plainSectionHeader}>
        <h2>Profile</h2>
        <p>{content.person.location}</p>
      </header>
      <div className={styles.profileCopy}>
        <p>{content.person.summary}</p>
        <p>{content.person.siteIntroduction}</p>
      </div>
    </section>
  );
}

function CaseStudyArticle({ study }: { study: CaseStudy }) {
  return (
    <article className={styles.caseStudy} id={study.id}>
      <header className={styles.caseStudyHeader}>
        <p className={styles.caseNumber}>{study.number}</p>
        <div>
          <h3>{study.title}</h3>
          <p className={styles.caseMeta}>
            {study.organization} / {study.period}
          </p>
        </div>
      </header>

      <p className={styles.caseSummary}>{study.summary}</p>

      <div className={styles.caseBody}>
        <div>
          <h4>Background</h4>
          <p>{study.context}</p>
        </div>
        <div>
          <h4>Work completed</h4>
          <ol>
            {study.decisions.map((decision) => (
              <li key={decision}>{decision}</li>
            ))}
          </ol>
        </div>
      </div>

      <ul className={styles.technologyList} aria-label="Technologies used">
        {study.technologies.map((technology) => (
          <li key={technology}>{technology}</li>
        ))}
      </ul>
    </article>
  );
}

function SelectedWork({ studies }: { studies: Portfolio["caseStudies"] }) {
  return (
    <section className={styles.work} id="work">
      <header className={styles.splitSectionHeader}>
        <h2 aria-label="Selected work">
          <span aria-hidden="true">Selected</span>
          <span aria-hidden="true">work</span>
        </h2>
        <p>Three projects from recent roles.</p>
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
    <section className={styles.experience} id="experience">
      <header>
        <h2>Experience</h2>
      </header>
      <div className={styles.experienceList}>
        {experience.map((item) => (
          <article key={`${item.organization}-${item.period}`}>
            <h3>{item.organization}</h3>
            <p className={styles.experienceRole}>{item.role}</p>
            <p className={styles.experiencePeriod}>{item.period}</p>
            <p>{item.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function Practice({ content }: { content: Portfolio }) {
  return (
    <section className={styles.practice}>
      <header className={styles.plainSectionHeader}>
        <h2>Areas of work</h2>
        <p>Day-to-day engineering practice</p>
      </header>
      <div className={styles.capabilityGrid}>
        {content.capabilities.map((capability) => (
          <article key={capability.title}>
            <h3>{capability.title}</h3>
            <p>{capability.description}</p>
          </article>
        ))}
      </div>
      <div className={styles.principles}>
        <h2>How I work</h2>
        <ol>
          {content.principles.map((principle) => (
            <li key={principle}>{principle}</li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function Contact({ person }: { person: Portfolio["person"] }) {
  return (
    <footer className={styles.contact} id="contact">
      <div className={styles.contactRed} aria-hidden="true" />
      <div className={styles.contactBlue} aria-hidden="true" />
      <h2>Contact</h2>
      <p>{person.contactMessage}</p>
      <a href={`mailto:${person.email}`}>{person.email}</a>
      <div className={styles.contactMeta}>
        <span>{person.name}</span>
        <span>{person.location}</span>
      </div>
    </footer>
  );
}

export function AjpwPortfolio({ content }: { content: Portfolio }) {
  return (
    <div className={styles.page}>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <Hero person={content.person} />
      <main id="main-content">
        <Profile content={content} />
        <SelectedWork studies={content.caseStudies} />
        <Experience experience={content.experience} />
        <Practice content={content} />
      </main>
      <Contact person={content.person} />
    </div>
  );
}
