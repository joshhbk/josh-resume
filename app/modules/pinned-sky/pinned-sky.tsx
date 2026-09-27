import { ArrowUpRight, ChevronUp } from "lucide-react";
import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";

import type { CaseStudy, Portfolio } from "../portfolio-content/model";
import { SceneCredit } from "../toronto-scene/scene-backdrop";
import { SceneControls } from "../toronto-scene/scene-controls";
import { describeScene, useScene, type SceneContextValue } from "../toronto-scene/scene-provider";
import { CaseStudyPin, UnfoldMark } from "./case-study-pin";
import { copy } from "./copy";
import { PaperCard } from "./paper-card";
import { ProfileMark } from "./profile-mark";
import { SheetsProvider, useSheets } from "./sheets";
import styles from "./pinned-sky.module.css";
import { useCursorParallax } from "./use-cursor-parallax";

type Person = Portfolio["person"];
type Role = Portfolio["experience"][number];

/** Live wind (or none, while previewing a weather) decides how hard the cards swing. */
function windStrength(state: SceneContextValue["state"]): "calm" | "breezy" | "gusty" {
  const wind = state.weatherMode === "live" ? state.conditions.windSpeed : 0;
  if (wind >= 28) return "gusty";
  if (wind >= 12) return "breezy";
  return "calm";
}

/** The sky the cards hang in: carries the scene's light and weather down to every card. */
function SkyBoard({ children }: { children: ReactNode }) {
  const boardRef = useRef<HTMLDivElement>(null);
  const { state } = useScene();
  useCursorParallax(boardRef);

  return (
    <div
      className={styles.board}
      data-phase={state.phase}
      data-weather={state.weather}
      data-wind={windStrength(state)}
      ref={boardRef}
    >
      <main className={styles.stage} id="main-content" tabIndex={-1}>
        {children}
      </main>
    </div>
  );
}

function SceneReading({ location }: { location: string }) {
  const { state } = useScene();
  return (
    <p className={styles.sceneReading}>
      <span>{location}</span>
      <span>{describeScene(state)}</span>
    </p>
  );
}

function NameCard({ person, studies }: { person: Person; studies: Portfolio["caseStudies"] }) {
  return (
    <PaperCard.Root as="header" slot="name" depth="near">
      <PaperCard.Swing>
        <PaperCard.Tape at="left" />
        <PaperCard.Tape at="right" />
        <PaperCard.Paper cut="a" className={styles.nameSheet}>
          <h1 className={styles.name}>{person.name}</h1>
          <p className={styles.role}>{person.role}</p>
          <p className={styles.summary}>{person.summary}</p>
          <p className={styles.pencilNote}>
            <span className={styles.boardOnly}>{copy.workHintBoard(studies)}</span>
            <span className={styles.stackOnly}>{copy.workHintStack(studies)}</span>
          </p>
          <SceneReading location={person.location} />
        </PaperCard.Paper>
      </PaperCard.Swing>
    </PaperCard.Root>
  );
}

function PinnedWork({ studies }: { studies: Portfolio["caseStudies"] }) {
  return (
    <section className={styles.workGroup} aria-labelledby="sky-work-heading">
      <h2 className={styles.visuallyHidden} id="sky-work-heading">
        {copy.workHeading}
      </h2>
      {studies.map((study, index) => (
        <CaseStudyPin study={study} index={index} key={study.id} />
      ))}
    </section>
  );
}

function RoleLine({ role }: { role: Role }) {
  return (
    <>
      <span className={styles.roleOrganization}>{role.organization}</span>
      <span className={styles.rolePeriod}>{role.period}</span>
      <span className={styles.roleTitle}>{role.role}</span>
    </>
  );
}

/** A role with a pinned project doubles as an index entry that unfolds that project. */
function LinkedRoleRow({ role, study }: { role: Role; study: CaseStudy }) {
  const { open } = useSheets();
  return (
    <button
      className={styles.roleRow}
      type="button"
      aria-haspopup="dialog"
      onClick={() => open(study.id)}
    >
      <RoleLine role={role} />
      <UnfoldMark className={styles.roleCue} />
    </button>
  );
}

function RoleRow({ role }: { role: Role }) {
  return (
    <div className={styles.roleRow}>
      <RoleLine role={role} />
    </div>
  );
}

function RolesCard({ content }: { content: Portfolio }) {
  return (
    <PaperCard.Root as="section" slot="roles" depth="far" aria-labelledby="sky-roles-heading">
      <PaperCard.Swing>
        <PaperCard.PushPin at="right" />
        <span className={styles.stackedSheet} data-layer="1" aria-hidden="true" />
        <span className={styles.stackedSheet} data-layer="2" aria-hidden="true" />
        <PaperCard.Paper cut="c" className={styles.rolesSheet}>
          <h2 className={styles.cardHeading} id="sky-roles-heading">
            {copy.rolesHeading}
          </h2>
          <p className={styles.cardNote}>{copy.rolesNote}</p>
          <ol className={styles.roles}>
            {content.experience.map((role) => {
              const study = content.caseStudies.find(
                (candidate) =>
                  candidate.organization === role.organization && candidate.period === role.period,
              );
              return (
                <li key={`${role.organization}-${role.period}`}>
                  {study ? <LinkedRoleRow role={role} study={study} /> : <RoleRow role={role} />}
                </li>
              );
            })}
          </ol>
        </PaperCard.Paper>
      </PaperCard.Swing>
    </PaperCard.Root>
  );
}

function ProfilesTag({ person }: { person: Person }) {
  return (
    <PaperCard.Root as="section" slot="profiles" depth="mid" aria-labelledby="sky-profiles-heading">
      <PaperCard.Swing>
        <PaperCard.Thread />
        <PaperCard.Paper cut="b" className={styles.tagSheet}>
          <span className={styles.tagEyelet} aria-hidden="true" />
          <h2 className={styles.cardHeading} id="sky-profiles-heading">
            {copy.profilesHeading}
          </h2>
          <p className={styles.cardNote}>{person.contactMessage}</p>
          <nav className={styles.profileLinks} aria-label="Professional profiles">
            {person.profiles.map((profile) => (
              <a className={styles.profileLink} href={profile.url} rel="me" key={profile.platform}>
                <ProfileMark className={styles.profileMark} platform={profile.platform} />
                <span className={styles.profileText}>
                  <span className={styles.profileLabel}>
                    {profile.label}
                    <ArrowUpRight className={styles.profileArrow} aria-hidden="true" />
                  </span>
                  <span className={styles.profileIdentity}>{profile.identity}</span>
                </span>
              </a>
            ))}
          </nav>
        </PaperCard.Paper>
      </PaperCard.Swing>
    </PaperCard.Root>
  );
}

/**
 * The scene's lighting and weather controls, folded into a slip at the foot of the board.
 * The panel is only visually collapsed (and inert) so the controls stay in the document.
 */
function SkyControls() {
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const { state } = useScene();
  const closeOnEscape = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Escape" || !open) return;
    setOpen(false);
    toggleRef.current?.focus();
  };

  return (
    <div
      className={styles.controlsSlip}
      data-slot="controls"
      data-open={open}
      onKeyDown={closeOnEscape}
    >
      <div className={styles.controlsPanel} id="sky-controls-panel" inert={!open}>
        <SceneControls.Root className={styles.controls}>
          <SceneControls.Lighting />
          <SceneControls.Weather />
        </SceneControls.Root>
      </div>
      <button
        className={styles.controlsToggle}
        type="button"
        aria-expanded={open}
        aria-controls="sky-controls-panel"
        onClick={() => setOpen((current) => !current)}
        ref={toggleRef}
      >
        <span>{copy.controlsHeading}</span>
        <span className={styles.controlsValue}>{copy.controlsValue(state.mode)}</span>
        <ChevronUp className={styles.controlsChevron} aria-hidden="true" />
      </button>
      <SceneCredit className={styles.credit} />
    </div>
  );
}

export function PinnedSky({ content }: { content: Portfolio }) {
  const { person, caseStudies } = content;

  return (
    <SheetsProvider>
      <SkyBoard>
        <NameCard person={person} studies={caseStudies} />
        <ProfilesTag person={person} />
        <PinnedWork studies={caseStudies} />
        <RolesCard content={content} />
        <SkyControls />
      </SkyBoard>
    </SheetsProvider>
  );
}
