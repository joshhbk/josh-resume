import type { ReactNode } from "react";

import { useScene, type SceneMode, type WeatherMode } from "./scene-provider";
import styles from "./scene-controls.module.css";

const sceneModes = [
  { mode: "dawn", label: "Dawn" },
  { mode: "day", label: "Day" },
  { mode: "dusk", label: "Dusk" },
  { mode: "night", label: "Night" },
  { mode: "live", label: "Live" },
] as const satisfies readonly { mode: SceneMode; label: string }[];

const weatherModes = [
  { mode: "live", label: "Live" },
  { mode: "clear", label: "Clear" },
  { mode: "cloudy", label: "Clouds" },
  { mode: "rain", label: "Rain" },
  { mode: "snow", label: "Snow" },
] as const satisfies readonly { mode: WeatherMode; label: string }[];

function isWeatherMode(value: string): value is WeatherMode {
  return weatherModes.some(({ mode }) => mode === value);
}

/** Positions a set of scene controls. Variants pass a className to place it. */
function SceneControlsRoot({
  className,
  children,
}: {
  className?: string | undefined;
  children: ReactNode;
}) {
  return <div className={[styles.root, className].filter(Boolean).join(" ")}>{children}</div>;
}

/** Dawn / Day / Dusk / Night / Live buttons for the skyline lighting. */
function SceneLighting({ className }: { className?: string | undefined }) {
  const {
    state: { mode: current },
    actions: { setMode },
  } = useScene();

  return (
    <div
      className={[styles.lighting, className].filter(Boolean).join(" ")}
      role="group"
      aria-label="Skyline lighting"
    >
      {sceneModes.map(({ mode, label }) => (
        <button
          className={styles.modeButton}
          type="button"
          aria-pressed={current === mode}
          onClick={() => setMode(mode)}
          key={mode}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

/** Weather preview select for the skyline. */
function SceneWeather({ className }: { className?: string | undefined }) {
  const {
    state: { weatherMode },
    actions: { setWeatherMode },
  } = useScene();

  return (
    <label className={[styles.weather, className].filter(Boolean).join(" ")}>
      <span>Weather</span>
      <select
        aria-label="Skyline weather"
        value={weatherMode}
        onChange={(event) => {
          const next = event.target.value;
          if (isWeatherMode(next)) setWeatherMode(next);
        }}
      >
        {weatherModes.map(({ mode, label }) => (
          <option value={mode} key={mode}>
            {label}
          </option>
        ))}
      </select>
    </label>
  );
}

export const SceneControls = {
  Root: SceneControlsRoot,
  Lighting: SceneLighting,
  Weather: SceneWeather,
};

/** The standard stacked panel: lighting buttons above the weather select. */
export function SceneControlPanel({ className }: { className?: string | undefined }) {
  return (
    <SceneControls.Root className={className}>
      <SceneControls.Lighting />
      <SceneControls.Weather />
    </SceneControls.Root>
  );
}
