import { useEffect, useRef } from "react";

import type { PassProps, ScenePass } from "../../../motion-types";
import { createTypedSky, type TypedSky } from "./typed-sky";
import { createTypedWeather, type TypedWeather } from "./typed-weather";
import styles from "./typewriter.module.css";

/** Clouds, sun, moon and stars struck as SVG text on the sky sheet, behind the city. */
function TypewriterSky({ phase, weather, intensity, reducedMotion }: PassProps) {
  const groupRef = useRef<SVGGElement>(null);
  const skyRef = useRef<TypedSky | null>(null);
  const { cloud, wind } = intensity;

  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;
    const sky = createTypedSky(group, reducedMotion);
    skyRef.current = sky;
    return () => {
      sky.destroy();
      skyRef.current = null;
    };
  }, [reducedMotion]);

  useEffect(() => {
    skyRef.current?.update({ phase, weather, cloud, wind });
  }, [phase, weather, cloud, wind, reducedMotion]);

  return <g className={styles.sky} ref={groupRef} aria-hidden="true" />;
}

/** Canvas can't run in environments without layout (tests, SSR); the sky text still renders. */
const canDraw = () =>
  typeof window.matchMedia === "function" && !/jsdom/i.test(window.navigator.userAgent);

/** Typed rain and snow, their impressions on the lake, and the carriage-return sweep. */
function TypewriterScreen({
  sceneRef,
  phase,
  weather,
  weatherMode,
  conditions,
  intensity,
  reducedMotion,
}: PassProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const weatherRef = useRef<TypedWeather | null>(null);
  const { rain, wind } = intensity;
  const temperature = weatherMode === "live" ? conditions.temperature : null;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !canDraw()) return;
    const typed = createTypedWeather(canvas, sceneRef.current, reducedMotion);
    weatherRef.current = typed;
    return () => {
      typed.destroy();
      weatherRef.current = null;
    };
  }, [sceneRef, reducedMotion]);

  useEffect(() => {
    weatherRef.current?.update({ phase, weather, rain, wind, temperature });
  }, [phase, weather, rain, wind, temperature, reducedMotion]);

  return <canvas className={styles.canvas} ref={canvasRef} />;
}

/**
 * Typewriter weather: the sky is typed. Clouds are blocks of overstruck glyphs typed in line by
 * line and backspaced away; rain falls as columns of struck slashes that leave commas on the lake;
 * snow is re-struck asterisks; the sun is a ring of red-ribbon O's, the moon a great "(". A change
 * of weather is a carriage return: the bell dings, the line is swept, and the new weather types in.
 */
export const pass: ScenePass = {
  className: styles.root ?? "",
  replaces: ["clouds", "rain", "snow", "sun", "moon", "stars"],
  Sky: TypewriterSky,
  Screen: TypewriterScreen,
};
