import { useEffect, useState } from "react";

import styles from "./portfolio-page.module.css";
import { defaultDepthSettings, type DepthSettings } from "./toronto-scene";

const storageKey = "toronto-depth-settings";
const controls = [
  { key: "parallax", label: "Cursor parallax", detail: "How far layers follow the cursor" },
  { key: "separation", label: "Layer spacing", detail: "Distance between the paper sheets" },
  { key: "shadow", label: "Shadow reach", detail: "How far each sheet casts its shadow" },
  { key: "edge", label: "Cut edge", detail: "Pale rim along the paper cuts" },
] as const;

function isDepthSettings(value: unknown): value is DepthSettings {
  if (!value || typeof value !== "object") return false;
  return controls.every(({ key }) => {
    const number = (value as Record<string, unknown>)[key];
    return typeof number === "number" && Number.isFinite(number) && number >= 0 && number <= 3;
  });
}

export function DepthLab({
  value,
  onChange,
}: {
  value: DepthSettings;
  onChange: (settings: DepthSettings) => void;
}) {
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(storageKey);
      if (!stored) return;
      const parsed: unknown = JSON.parse(stored);
      if (isDepthSettings(parsed)) {
        onChange(parsed);
        setSaved(true);
      }
    } catch {
      // The controls remain usable when storage is unavailable.
    }
  }, [onChange]);

  const update = (key: keyof DepthSettings, next: number) => {
    onChange({ ...value, [key]: next });
    setSaved(false);
  };

  const save = () => {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(value));
      setSaved(true);
    } catch {
      setSaved(false);
    }
  };

  const reset = () => {
    onChange(defaultDepthSettings);
    setSaved(false);
    try {
      window.localStorage.removeItem(storageKey);
    } catch {
      // Reset still updates the current view.
    }
  };

  return (
    <aside className={styles.depthLab} aria-label="Toronto scene depth lab">
      {open && (
        <div className={styles.depthLabPanel} id="depth-lab-panel">
          <div className={styles.depthLabHeader}>
            <div>
              <p className={styles.depthLabKicker}>Toronto scene</p>
              <h2>Depth lab</h2>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close depth lab">
              ×
            </button>
          </div>
          <p className={styles.depthLabIntro}>
            Tune the paper layers live. Move the cursor to test parallax.
          </p>
          <div className={styles.depthLabControls}>
            {controls.map(({ key, label, detail }) => (
              <label className={styles.depthLabControl} key={key}>
                <span className={styles.depthLabControlHeading}>
                  <span>{label}</span>
                  <output>{value[key].toFixed(1)}×</output>
                </span>
                <span className={styles.depthLabDetail}>{detail}</span>
                <input
                  type="range"
                  aria-label={label}
                  min="0"
                  max="3"
                  step="0.1"
                  value={value[key]}
                  onChange={(event) => update(key, Number(event.currentTarget.value))}
                />
              </label>
            ))}
          </div>
          <div className={styles.depthLabActions}>
            <button type="button" onClick={reset}>
              Reset
            </button>
            <button type="button" onClick={save}>
              {saved ? "Saved" : "Save settings"}
            </button>
          </div>
        </div>
      )}
      <button
        className={styles.depthLabToggle}
        type="button"
        aria-expanded={open}
        aria-controls={open ? "depth-lab-panel" : undefined}
        onClick={() => setOpen((current) => !current)}
      >
        Depth lab <span aria-hidden="true">{open ? "−" : "+"}</span>
      </button>
    </aside>
  );
}
