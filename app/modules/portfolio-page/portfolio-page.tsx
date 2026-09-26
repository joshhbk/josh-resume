import { ExternalLink } from "lucide-react";
import { useState } from "react";

import type { Portfolio } from "../portfolio-content/model";
import { DepthLab } from "./depth-lab";
import { defaultLabelStyle, type LabelStyle } from "./label-options";
import styles from "./portfolio-page.module.css";
import {
  defaultDepthSettings,
  TorontoScene,
  type SceneMode,
  type WeatherMode,
} from "./toronto-scene";
import { defaultWorkVariant, type WorkVariant } from "./work-variant-options";
import { WorkPrompt, WorkSection } from "./work-variants";

const sceneModes: SceneMode[] = ["day", "night", "live"];

function Hero({
  person,
  sceneMode,
  onSceneModeChange,
  weatherMode,
  onWeatherModeChange,
  labelStyle,
  workVariant,
}: {
  person: Portfolio["person"];
  sceneMode: SceneMode;
  onSceneModeChange: (mode: SceneMode) => void;
  weatherMode: WeatherMode;
  onWeatherModeChange: (mode: WeatherMode) => void;
  labelStyle: LabelStyle;
  workVariant: WorkVariant;
}) {
  return (
    <header className={styles.hero} id="top">
      <div className={styles.poster}>
        <div className={styles.sceneControls} role="group" aria-label="Skyline lighting">
          {sceneModes.map((mode) => (
            <button
              className={styles.sceneModeButton}
              type="button"
              aria-pressed={sceneMode === mode}
              onClick={() => onSceneModeChange(mode)}
              key={mode}
            >
              {mode === "live" ? "Live" : mode === "day" ? "Day" : "Night"}
            </button>
          ))}
        </div>

        <label className={styles.weatherControl}>
          <span>Weather</span>
          <select
            aria-label="Skyline weather"
            value={weatherMode}
            onChange={(event) => onWeatherModeChange(event.target.value as WeatherMode)}
          >
            <option value="live">Live</option>
            <option value="clear">Clear</option>
            <option value="cloudy">Clouds</option>
            <option value="rain">Rain</option>
            <option value="snow">Snow</option>
          </select>
        </label>

        <div className={styles.titleBlock}>
          <div className={styles.titleLabel} data-label-style={labelStyle}>
            <p className={styles.labelEyebrow}>
              {person.name} · {person.location}
            </p>
            <h1 className={`${styles.displayHeading} ${styles.heroTitle}`} aria-label={person.role}>
              <span aria-hidden="true">Staff</span>
              <span aria-hidden="true">Front-End</span>
              <span aria-hidden="true">Engineer</span>
            </h1>
            <p className={styles.heroSummary}>
              More than 12 years building and improving software products.
            </p>
            <p className={styles.labelFooter} aria-hidden="true">
              Portfolio · 2026
            </p>
          </div>
        </div>

        <div className={styles.workPrompt} data-work-variant={workVariant}>
          <WorkPrompt variant={workVariant} />
        </div>

        <p className={`${styles.supportingText} ${styles.photoCredit}`}>
          Photo:{" "}
          <a href="https://unsplash.com/photos/cn-tower-grayscale-photography-trq3hS53NYU">
            Osama Saeed
          </a>
          {" · "}
          <a href="https://open-meteo.com/">Weather</a>
        </p>
      </div>
    </header>
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

function ProfileMark({
  platform,
}: {
  platform: Portfolio["person"]["profiles"][number]["platform"];
}) {
  if (platform === "linkedin") {
    return (
      <svg className={styles.profileMark} viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="currentColor"
          d="M5.32 7.41a2.06 2.06 0 1 0 0-4.12 2.06 2.06 0 0 0 0 4.12ZM3.54 20.45H7.1V8.98H3.54v11.47Zm5.8 0h3.56v-5.67c0-1.49.29-2.94 2.14-2.94 1.82 0 1.85 1.71 1.85 3.04v5.57h3.56v-6.29c0-3.09-.67-5.46-4.27-5.46-1.73 0-2.89.95-3.37 1.85h-.05V8.98H9.34v11.47Z"
        />
      </svg>
    );
  }

  return (
    <svg className={styles.profileMark} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.87c-2.78.6-3.37-1.18-3.37-1.18-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.61.07-.61 1 .07 1.53 1.03 1.53 1.03.9 1.53 2.35 1.09 2.92.83.09-.65.35-1.09.64-1.34-2.22-.25-4.56-1.11-4.56-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02A9.6 9.6 0 0 1 12 6.82a9.6 9.6 0 0 1 2.5.34c1.91-1.29 2.75-1.02 2.75-1.02.55 1.37.2 2.39.1 2.64.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.69-4.57 4.94.36.31.68.92.68 1.85v2.76c0 .27.18.58.69.48A10 10 0 0 0 12 2Z"
      />
    </svg>
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
        Profiles
      </h2>
      <div className={styles.profileContact}>
        <p className={styles.contactMessage}>{person.contactMessage}</p>
        <nav className={styles.profileLinks} aria-label="Professional profiles">
          {person.profiles.map((profile) => (
            <a
              className={styles.profileLink}
              data-platform={profile.platform}
              href={profile.url}
              rel="me"
              key={profile.platform}
            >
              <span className={styles.profileIdentity}>
                <ProfileMark platform={profile.platform} />
                <span>{profile.identity}</span>
              </span>
              <span className={styles.profileAction}>
                <span className={styles.profileActionLabel}>{profile.label}</span>
                <span className={styles.profileArrow} aria-hidden="true">
                  <ExternalLink />
                </span>
              </span>
            </a>
          ))}
        </nav>
      </div>
      <div className={`${styles.supportingText} ${styles.contactMeta}`}>
        <span>{person.name}</span>
        <span>{person.location}</span>
      </div>
    </footer>
  );
}

export function PortfolioPage({ content }: { content: Portfolio }) {
  const [sceneMode, setSceneMode] = useState<SceneMode>("live");
  const [weatherMode, setWeatherMode] = useState<WeatherMode>("live");
  const [labelStyle, setLabelStyle] = useState<LabelStyle>(defaultLabelStyle);
  const [depth, setDepth] = useState(defaultDepthSettings);
  const [workVariant, setWorkVariant] = useState<WorkVariant>(defaultWorkVariant);

  return (
    <div className={styles.page} data-work-variant={workVariant}>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <figure className={styles.sceneBackdrop}>
        <TorontoScene mode={sceneMode} weatherMode={weatherMode} depth={depth} />
      </figure>
      {import.meta.env.DEV && (
        <DepthLab
          value={depth}
          onChange={setDepth}
          workVariant={workVariant}
          onWorkVariantChange={setWorkVariant}
          labelStyle={labelStyle}
          onLabelStyleChange={setLabelStyle}
        />
      )}
      <Hero
        person={content.person}
        sceneMode={sceneMode}
        onSceneModeChange={setSceneMode}
        weatherMode={weatherMode}
        onWeatherModeChange={setWeatherMode}
        labelStyle={labelStyle}
        workVariant={workVariant}
      />
      <main id="main-content" tabIndex={-1}>
        <WorkSection variant={workVariant} studies={content.caseStudies} />
        <Experience experience={content.experience} />
      </main>
      <Contact person={content.person} />
    </div>
  );
}
