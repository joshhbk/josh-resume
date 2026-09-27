import { useEffect, useRef } from "react";

import type { PassProps } from "../../../motion-types";
import styles from "./origami.module.css";
import { PaperWeather, type PaperConditions } from "./paper-weather";

type Surface = { context: CanvasRenderingContext2D; compact: boolean };

/** Sizes the canvas to its box and maps the artwork's slice-scaled 1536×1024 space onto it. */
function prepare(canvas: HTMLCanvasElement): Surface | null {
  const context = canvas.getContext("2d");
  if (!context) return null;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const compact = width < 700;
  const ratio = Math.min(window.devicePixelRatio || 1, compact ? 1.5 : 2);
  const pixelWidth = Math.round(width * ratio);
  const pixelHeight = Math.round(height * ratio);
  if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
  }
  const scale = Math.max(width / 1536, height / 1024);
  const offsetX = (width - 1536 * scale) / 2;
  context.setTransform(ratio * scale, 0, 0, ratio * scale, ratio * offsetX, 0);
  return { context, compact };
}

function paint(canvas: HTMLCanvasElement, surface: Surface, world: PaperWeather) {
  const { context } = surface;
  context.save();
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.restore();
  context.save();
  // Stay inside the paper mat.
  context.beginPath();
  context.rect(20, 20, 1496, 985);
  context.clip();
  world.draw(context);
  context.restore();
}

/** Canvas rendering is unavailable in jsdom; skip it there rather than log errors. */
const canDraw = () => typeof navigator !== "undefined" && !navigator.userAgent.includes("jsdom");

/** Folded paper rain and hole-punch snow, drawn on a canvas over the scene. */
export function PaperWeatherCanvas({ phase, weather, intensity, reducedMotion }: PassProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const conditions = useRef<Omit<PaperConditions, "compact">>({
    phase,
    weather,
    rain: intensity.rain,
    cloud: intensity.cloud,
    wind: intensity.wind,
  });

  useEffect(() => {
    conditions.current = {
      phase,
      weather,
      rain: intensity.rain,
      cloud: intensity.cloud,
      wind: intensity.wind,
    };
  }, [phase, weather, intensity.rain, intensity.cloud, intensity.wind]);

  // Animated: a rAF loop that pauses while the tab is hidden.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || reducedMotion || !canDraw()) return;
    let surface = prepare(canvas);
    if (!surface) return;
    const world = new PaperWeather();
    let frame = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (surface) {
        world.setConditions({ ...conditions.current, compact: surface.compact });
        world.step(dt);
        paint(canvas, surface, world);
      }
      frame = requestAnimationFrame(tick);
    };
    const start = () => {
      cancelAnimationFrame(frame);
      last = performance.now();
      frame = requestAnimationFrame(tick);
    };
    const onVisibility = () => (document.hidden ? cancelAnimationFrame(frame) : start());
    const onResize = () => (surface = prepare(canvas));

    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", onVisibility);
    start();
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [reducedMotion]);

  // Reduced motion: one still frame, with the drifts already settled, redrawn when things change.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !reducedMotion || !canDraw()) return;
    const draw = () => {
      const surface = prepare(canvas);
      if (!surface) return;
      const world = new PaperWeather();
      world.setConditions({
        phase,
        weather,
        rain: intensity.rain,
        cloud: intensity.cloud,
        wind: intensity.wind,
        compact: surface.compact,
      });
      world.prefill(weather === "snow" ? 14 : 1.2);
      paint(canvas, surface, world);
    };
    draw();
    window.addEventListener("resize", draw);
    return () => window.removeEventListener("resize", draw);
  }, [reducedMotion, phase, weather, intensity.rain, intensity.cloud, intensity.wind]);

  return <canvas className={styles.canvas} ref={canvasRef} aria-hidden="true" />;
}
