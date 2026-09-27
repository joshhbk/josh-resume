import { useEffect, useState } from "react";

import { useScene, type SceneMode, type WeatherMode } from "../scene-provider";
import styles from "./motion-jig.module.css";
import { backdropPasses, type PassEntry } from "./motion-registry";
import { useSceneMotion, type ActivePass } from "./scene-motion-provider";

const param = "backdrop";

const lightingPreviews = [
  { mode: "dawn", label: "Dawn" },
  { mode: "day", label: "Day" },
  { mode: "dusk", label: "Dusk" },
  { mode: "night", label: "Night" },
  { mode: "live", label: "Live" },
] as const satisfies readonly { mode: SceneMode; label: string }[];

const weatherPreviews = [
  { mode: "clear", label: "Clear" },
  { mode: "cloudy", label: "Clouds" },
  { mode: "rain", label: "Rain" },
  { mode: "snow", label: "Snow" },
  { mode: "live", label: "Live" },
] as const satisfies readonly { mode: WeatherMode; label: string }[];

function writeParam(id: string) {
  const url = new URL(window.location.href);
  if (id === "original") url.searchParams.delete(param);
  else url.searchParams.set(param, id);
  window.history.replaceState(window.history.state, "", url);
}

async function activate(entry: PassEntry, apply: (active: ActivePass) => void) {
  const pass = await entry.load();
  apply({ id: entry.id, pass });
  writeParam(entry.id);
}

/** Loads a pass entry and makes it active, keeping the choice in the URL. */
function usePassLoader(apply: (active: ActivePass) => void) {
  const [loading, setLoading] = useState<string | null>(null);

  const select = async (entry: PassEntry) => {
    setLoading(entry.id);
    try {
      await activate(entry, apply);
    } finally {
      setLoading(null);
    }
  };

  return { loading, select };
}

function PassPicker({
  label,
  entries,
  current,
  loading,
  onSelect,
}: {
  label: string;
  entries: readonly PassEntry[];
  current: string;
  loading: string | null;
  onSelect: (entry: PassEntry) => void;
}) {
  return (
    <fieldset className={styles.picker}>
      <legend>{label}</legend>
      <ol className={styles.passList}>
        {entries.map((entry, index) => (
          <li key={entry.id}>
            <button
              className={styles.pass}
              type="button"
              aria-pressed={entry.id === current}
              aria-busy={entry.id === loading}
              onClick={() => onSelect(entry)}
            >
              <span className={styles.passKey} aria-hidden="true">
                {index}
              </span>
              <span className={styles.passName}>{entry.name}</span>
              <span className={styles.passPitch}>{entry.pitch}</span>
            </button>
          </li>
        ))}
      </ol>
    </fieldset>
  );
}

function PreviewButtons<Mode extends string>({
  label,
  options,
  current,
  onSelect,
}: {
  label: string;
  options: readonly { mode: Mode; label: string }[];
  current: Mode;
  onSelect: (mode: Mode) => void;
}) {
  return (
    <div className={styles.previewRow} role="group" aria-label={label}>
      {options.map((option) => (
        <button
          className={styles.preview}
          type="button"
          aria-pressed={option.mode === current}
          onClick={() => onSelect(option.mode)}
          key={option.mode}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

/** Development only: pick a backdrop motion pass and preview any sky. */
export function MotionJig() {
  const [open, setOpen] = useState(false);
  const {
    state: { mode, weatherMode },
    actions: { setMode, setWeatherMode },
  } = useScene();
  const {
    state: { backdrop, peek },
    actions: { setBackdrop, setPeek },
  } = useSceneMotion();
  const backdropLoader = usePassLoader(setBackdrop);

  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get(param);
    const initial = backdropPasses.find((entry) => entry.id === fromUrl);
    if (initial) void activate(initial, setBackdrop);
  }, [setBackdrop]);

  const activeName = (entries: readonly PassEntry[], id: string) =>
    entries.find((entry) => entry.id === id)?.name ?? id;

  return (
    <aside className={styles.jig} aria-label="Motion lab">
      {open && (
        <div className={styles.panel} id="motion-lab-panel">
          <PassPicker
            label="Backdrop motion"
            entries={backdropPasses}
            current={backdrop.id}
            loading={backdropLoader.loading}
            onSelect={(entry) => void backdropLoader.select(entry)}
          />
          <div className={styles.previews}>
            <PreviewButtons
              label="Preview lighting"
              options={lightingPreviews}
              current={mode}
              onSelect={setMode}
            />
            <PreviewButtons
              label="Preview weather"
              options={weatherPreviews}
              current={weatherMode}
              onSelect={setWeatherMode}
            />
            <button
              className={styles.preview}
              type="button"
              aria-pressed={peek}
              onClick={() => setPeek(!peek)}
            >
              Hide page
            </button>
          </div>
        </div>
      )}
      <button
        className={styles.toggle}
        type="button"
        aria-expanded={open}
        aria-controls={open ? "motion-lab-panel" : undefined}
        onClick={() => setOpen((isOpen) => !isOpen)}
      >
        <span>Motion lab</span>
        <span className={styles.toggleState}>{activeName(backdropPasses, backdrop.id)}</span>
      </button>
    </aside>
  );
}
