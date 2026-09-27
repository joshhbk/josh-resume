import { useEffect, useRef } from "react";

import type { PassProps } from "../../../motion-types";
import { createInkEngine, type InkWeather } from "./ink-engine";
import styles from "./wet-ink.module.css";

/** True in real browsers; jsdom has canvases that can't paint. */
const canPaint = () => typeof navigator !== "undefined" && !navigator.userAgent.includes("jsdom");

/**
 * The Screen slot: the sheet itself getting wet. Rain blooms into blots that run in rivulets and
 * dry to tide lines; snow falls as gouache dabs that settle on the ledges.
 */
export function InkPaper({ phase, weather, intensity, reducedMotion }: PassProps) {
  const holder = useRef<HTMLDivElement>(null);
  const stain = useRef<HTMLCanvasElement>(null);
  const wet = useRef<HTMLCanvasElement>(null);
  const fx = useRef<HTMLCanvasElement>(null);
  const drift = useRef<HTMLCanvasElement>(null);
  const snow = useRef<HTMLCanvasElement>(null);
  const live = useRef<InkWeather>({
    phase,
    weather,
    rain: intensity.rain,
    wind: intensity.wind,
    reducedMotion,
  });
  const repaint = useRef<(() => void) | null>(null);

  useEffect(() => {
    live.current = { phase, weather, rain: intensity.rain, wind: intensity.wind, reducedMotion };
    if (reducedMotion) repaint.current?.();
  }, [phase, weather, intensity.rain, intensity.wind, reducedMotion]);

  useEffect(() => {
    const box = holder.current;
    const canvases = {
      stain: stain.current,
      wet: wet.current,
      fx: fx.current,
      drift: drift.current,
      snow: snow.current,
    };
    if (
      !box ||
      !canvases.stain ||
      !canvases.wet ||
      !canvases.fx ||
      !canvases.drift ||
      !canvases.snow ||
      !canPaint()
    ) {
      return;
    }
    const engine = createInkEngine(
      {
        stain: canvases.stain,
        wet: canvases.wet,
        fx: canvases.fx,
        drift: canvases.drift,
        snow: canvases.snow,
      },
      () => live.current,
    );
    const fit = () => {
      engine.resize(box.clientWidth, box.clientHeight);
      if (live.current.reducedMotion) engine.paintStill();
    };
    fit();
    repaint.current = () => engine.paintStill();

    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      frame = requestAnimationFrame(tick);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (document.hidden || live.current.reducedMotion) return;
      engine.step(dt);
      engine.draw();
    };
    frame = requestAnimationFrame(tick);

    const observer = typeof ResizeObserver === "function" ? new ResizeObserver(fit) : null;
    observer?.observe(box);
    if (!observer) window.addEventListener("resize", fit);
    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener("resize", fit);
      repaint.current = null;
    };
  }, []);

  return (
    <div className={styles.paper} ref={holder}>
      <div className={styles.inkBlend}>
        <canvas className={styles.canvas} ref={stain} />
        <canvas className={styles.canvas} ref={wet} />
        <canvas className={styles.canvas} ref={fx} />
      </div>
      <canvas className={styles.canvas} ref={drift} />
      <canvas className={styles.canvas} ref={snow} />
    </div>
  );
}
