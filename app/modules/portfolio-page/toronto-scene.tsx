import { useEffect, useRef, useState, type CSSProperties } from "react";

import styles from "./portfolio-page.module.css";
import { TorontoSkylineArt } from "./toronto-skyline-art";

type DayPhase = "dawn" | "day" | "dusk" | "night";
type Weather = "clear" | "cloudy" | "rain" | "snow";
export type SceneMode = "live" | "day" | "night";
export type WeatherMode = "live" | Weather;
export type DepthSettings = {
  parallax: number;
  separation: number;
  shadow: number;
  edge: number;
};

export const defaultDepthSettings: DepthSettings = {
  parallax: 1,
  separation: 1,
  shadow: 1,
  edge: 1,
};

type Conditions = {
  weather: Weather;
  cloudCover: number;
  precipitation: number;
  windSpeed: number;
  windDirection: number;
};

const clearConditions: Conditions = {
  weather: "clear",
  cloudCover: 0,
  precipitation: 0,
  windSpeed: 0,
  windDirection: 0,
};

const weatherUrl =
  "https://api.open-meteo.com/v1/forecast?latitude=43.6532&longitude=-79.3832&current=weather_code,cloud_cover,precipitation,wind_speed_10m,wind_direction_10m&timezone=America%2FToronto";

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function numberOr(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

const planeMotion = [
  ["sky", 3, 2],
  ["land", 16, 8],
  ["water", 33, 17],
] as const;

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

export function TorontoScene({
  mode,
  weatherMode,
  depth,
}: {
  mode: SceneMode;
  weatherMode: WeatherMode;
  depth: DepthSettings;
}) {
  // The server and the first client render agree; the live scene is applied after hydration.
  const [phase, setPhase] = useState<DayPhase>("day");
  const [conditions, setConditions] = useState<Conditions>(clearConditions);
  const sceneRef = useRef<HTMLDivElement>(null);
  const lastPointer = useRef<{ x: number; y: number } | null>(null);
  const visiblePhase = mode === "live" ? phase : mode;
  const visibleWeather = weatherMode === "live" ? conditions.weather : weatherMode;
  const cloudCover =
    weatherMode === "live"
      ? Math.max(conditions.cloudCover, visibleWeather === "rain" ? 55 : 0)
      : visibleWeather === "rain"
        ? 90
        : visibleWeather === "cloudy"
          ? 76
          : 0;
  const rainStrength =
    visibleWeather === "rain"
      ? weatherMode === "live"
        ? clamp(0.3 + conditions.precipitation / 5, 0.3, 0.82)
        : 0.62
      : 0;
  const windX = clamp(
    -Math.sin((conditions.windDirection * Math.PI) / 180) * conditions.windSpeed * 1.5,
    -65,
    65,
  );
  const separation = depth.separation - 1;
  const shadowPx = (base: number) => `${base * depth.shadow}px`;
  const sceneStyle = {
    "--cloud-opacity": (clamp(cloudCover / 100, 0, 1) * 0.64).toFixed(2),
    "--cloud-front-opacity": (clamp(cloudCover / 100, 0, 1) * 0.44).toFixed(2),
    "--rain-opacity": rainStrength.toFixed(2),
    "--cloud-travel": `${Math.round(windX || 22)}px`,
    "--rain-lean": `${Math.round(clamp(windX * 0.15, -8, 8))}deg`,
    "--snow-drift": `${Math.round(clamp(windX * 0.3, -16, 16))}px`,
    "--land-lift": `${-3 * separation}px`,
    "--water-lift": `${10 * separation}px`,
    "--cloud-shadow-y": shadowPx(12),
    "--cloud-shadow-blur": shadowPx(8),
    "--building-shadow-y": shadowPx(13),
    "--building-shadow-blur": shadowPx(7),
    "--tower-shadow-y": shadowPx(11),
    "--tower-shadow-blur": shadowPx(5),
    "--trees-shadow-y": shadowPx(17),
    "--trees-shadow-blur": shadowPx(9),
    "--shore-shadow-y": shadowPx(12),
    "--shore-shadow-blur": shadowPx(6),
    "--water-shadow-y": shadowPx(10),
    "--water-shadow-blur": shadowPx(5),
    "--edge-offset": `${-depth.edge}px`,
    "--edge-offset-strong": `${-2 * depth.edge}px`,
  } as CSSProperties;

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    const clearOffsets = () => {
      for (const [plane] of planeMotion) {
        scene.style.removeProperty(`--${plane}-x`);
        scene.style.removeProperty(`--${plane}-y`);
      }
    };
    const applyOffsets = (x: number, y: number) => {
      for (const [plane, xRange, yRange] of planeMotion) {
        scene.style.setProperty(`--${plane}-x`, `${Math.round(x * xRange * depth.parallax)}px`);
        scene.style.setProperty(`--${plane}-y`, `${Math.round(y * yRange * depth.parallax)}px`);
      }
    };
    if (lastPointer.current) applyOffsets(lastPointer.current.x, lastPointer.current.y);
    const movePlanes = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      const x = event.clientX / window.innerWidth - 0.5;
      const y = event.clientY / window.innerHeight - 0.5;
      lastPointer.current = { x, y };
      applyOffsets(x, y);
    };
    const resetOffsets = () => {
      lastPointer.current = null;
      clearOffsets();
    };

    window.addEventListener("pointermove", movePlanes);
    window.addEventListener("blur", resetOffsets);
    return () => {
      window.removeEventListener("pointermove", movePlanes);
      window.removeEventListener("blur", resetOffsets);
    };
  }, [depth.parallax]);

  useEffect(() => {
    const updatePhase = () => setPhase(getTorontoPhase());
    updatePhase();
    const timer = window.setInterval(updatePhase, 60_000);
    return () => window.clearInterval(timer);
  }, []);

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
          setConditions({
            weather,
            cloudCover: clamp(numberOr(current.cloud_cover, weather === "cloudy" ? 76 : 0), 0, 100),
            precipitation: Math.max(0, numberOr(current.precipitation, 0)),
            windSpeed: Math.max(0, numberOr(current.wind_speed_10m, 0)),
            windDirection: numberOr(current.wind_direction_10m, 0),
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

  return (
    <div
      ref={sceneRef}
      className={styles.scene}
      data-phase={visiblePhase}
      data-weather={visibleWeather}
      style={sceneStyle}
    >
      <TorontoSkylineArt />
      <span className={styles.sceneStamp} aria-hidden="true">
        TORONTO • 43°39′N
      </span>
    </div>
  );
}
