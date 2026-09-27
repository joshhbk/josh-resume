import { createContext, use, useEffect, useState, type ReactNode } from "react";

export type DayPhase = "dawn" | "day" | "dusk" | "night";
export type Weather = "clear" | "cloudy" | "rain" | "snow";
export type SceneMode = "live" | DayPhase;
export type WeatherMode = "live" | Weather;
export type DepthSettings = {
  parallax: number;
  separation: number;
  shadow: number;
  edge: number;
};

export type Conditions = {
  weather: Weather;
  cloudCover: number;
  precipitation: number;
  windSpeed: number;
  windDirection: number;
  /** Degrees Celsius; null until Open-Meteo responds. */
  temperature: number | null;
};

/** How far the paper sheets move, separate, cast shadows and show their cut edges. */
export const sceneDepth: DepthSettings = {
  parallax: 3,
  separation: 3,
  shadow: 3,
  edge: 3,
};

const clearConditions: Conditions = {
  weather: "clear",
  cloudCover: 0,
  precipitation: 0,
  windSpeed: 0,
  windDirection: 0,
  temperature: null,
};

const weatherUrl =
  "https://api.open-meteo.com/v1/forecast?latitude=43.6532&longitude=-79.3832&current=weather_code,temperature_2m,cloud_cover,precipitation,wind_speed_10m,wind_direction_10m&timezone=America%2FToronto";

export const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

function numberOr(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function getTorontoPhase(): DayPhase {
  const hour = Number(
    new Intl.DateTimeFormat("en-CA", {
      hour: "numeric",
      hourCycle: "h23",
      timeZone: "America/Toronto",
    }).format(new Date()),
  );

  if (hour < 6 || hour >= 21) return "night";
  if (hour < 9) return "dawn";
  if (hour < 18) return "day";
  return "dusk";
}

function getWeather(code: number): Weather {
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "snow";
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99].includes(code)) {
    return "rain";
  }
  if ([2, 3, 45, 48].includes(code)) return "cloudy";
  return "clear";
}

function useTorontoPhase(): DayPhase {
  // The server and the first client render agree; the live phase is applied after hydration.
  const [phase, setPhase] = useState<DayPhase>("day");

  useEffect(() => {
    const updatePhase = () => setPhase(getTorontoPhase());
    updatePhase();
    const timer = window.setInterval(updatePhase, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  return phase;
}

function useTorontoConditions(): Conditions {
  const [conditions, setConditions] = useState<Conditions>(clearConditions);

  useEffect(() => {
    const controller = new AbortController();
    const updateWeather = async () => {
      try {
        const response = await fetch(weatherUrl, { signal: controller.signal });
        if (!response.ok) return;
        const result: unknown = await response.json();
        if (
          typeof result === "object" &&
          result !== null &&
          "current" in result &&
          typeof result.current === "object" &&
          result.current !== null &&
          "weather_code" in result.current &&
          typeof result.current.weather_code === "number"
        ) {
          const current = result.current as Record<string, unknown>;
          const weather = getWeather(result.current.weather_code);
          const temperature = current.temperature_2m;
          setConditions({
            weather,
            cloudCover: clamp(numberOr(current.cloud_cover, weather === "cloudy" ? 76 : 0), 0, 100),
            precipitation: Math.max(0, numberOr(current.precipitation, 0)),
            windSpeed: Math.max(0, numberOr(current.wind_speed_10m, 0)),
            windDirection: numberOr(current.wind_direction_10m, 0),
            temperature:
              typeof temperature === "number" && Number.isFinite(temperature)
                ? Math.round(temperature)
                : null,
          });
        }
      } catch {
        // Keep the static clear-sky scene when weather is unavailable.
      }
    };

    void updateWeather();
    const timer = window.setInterval(() => void updateWeather(), 30 * 60_000);
    return () => {
      controller.abort();
      window.clearInterval(timer);
    };
  }, []);

  return conditions;
}

export type SceneContextValue = {
  state: {
    mode: SceneMode;
    weatherMode: WeatherMode;
    /** The phase the scene is showing: Toronto's live phase or the previewed one. */
    phase: DayPhase;
    /** The weather the scene is showing: live conditions or the previewed weather. */
    weather: Weather;
    /** Live Toronto conditions, independent of any preview. */
    conditions: Conditions;
  };
  actions: {
    setMode: (mode: SceneMode) => void;
    setWeatherMode: (mode: WeatherMode) => void;
  };
};

const SceneContext = createContext<SceneContextValue | null>(null);

export function SceneProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<SceneMode>("live");
  const [weatherMode, setWeatherMode] = useState<WeatherMode>("live");
  const livePhase = useTorontoPhase();
  const conditions = useTorontoConditions();

  const value: SceneContextValue = {
    state: {
      mode,
      weatherMode,
      phase: mode === "live" ? livePhase : mode,
      weather: weatherMode === "live" ? conditions.weather : weatherMode,
      conditions,
    },
    actions: { setMode, setWeatherMode },
  };

  return <SceneContext value={value}>{children}</SceneContext>;
}

export function useScene(): SceneContextValue {
  const context = use(SceneContext);
  if (!context) {
    throw new Error("useScene must be used inside a SceneProvider.");
  }
  return context;
}

const phaseWords: Record<DayPhase, string> = {
  dawn: "early morning",
  day: "daytime",
  dusk: "evening",
  night: "night",
};

const weatherWords: Record<Weather, string> = {
  clear: "clear skies",
  cloudy: "cloudy",
  rain: "rain",
  snow: "snow",
};

/** A short phrase such as "14°C · rain · evening" describing what the scene is showing. */
export function describeScene(state: SceneContextValue["state"]): string {
  const parts = [weatherWords[state.weather], phaseWords[state.phase]];
  const showingLive = state.weatherMode === "live";
  if (showingLive && state.conditions.temperature !== null) {
    parts.unshift(`${state.conditions.temperature}°C`);
  }
  return parts.join(" · ");
}
