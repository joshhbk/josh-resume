import { useEffect, useRef } from "react";

import { clamp } from "../../../../scene-provider";
import type { PassProps } from "../../../motion-types";
import styles from "./umbrella.module.css";
import { drawWeather, glowSprite, skyRegion, type Surface } from "./weather-draw";
import { WeatherSim, type WeatherInput } from "./weather-sim";

const artWidth = 1536;
const artHeight = 1024;

/**
 * Follows the land sheet and the tower wherever a backdrop pass moves them (parallax, springs,
 * sway), in artwork units, so weather keeps colliding with what is actually on screen.
 */
function trackSheets(scene: HTMLElement, sim: WeatherSim): () => void {
  const land = scene.querySelector<SVGGraphicsElement>('[data-scene-layer="land"]');
  const tower = scene.querySelector<SVGGraphicsElement>('[data-scene-layer="tower"]');
  const sheet = land?.ownerSVGElement;
  return () => {
    const base = sheet?.getScreenCTM();
    const landMatrix = land?.getScreenCTM();
    if (!base || !landMatrix) return;
    const inLand = base.inverse().multiply(landMatrix);
    sim.land.x = inLand.e;
    sim.land.y = inLand.f;
    const towerMatrix = tower?.getScreenCTM();
    if (!towerMatrix) return;
    const m = landMatrix.inverse().multiply(towerMatrix);
    sim.placeTower([m.a, m.b, m.c, m.d, m.e, m.f]);
  };
}

/**
 * The umbrella weather canvas. The simulation runs in artwork coordinates and is drawn with the
 * artwork's slice scaling, so rain lands on the painted roofs at every viewport size.
 */
export function UmbrellaScreen({
  sceneRef,
  phase,
  weather,
  weatherMode,
  conditions,
  intensity,
  reducedMotion,
}: PassProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const simRef = useRef<WeatherSim | null>(null);
  const redrawRef = useRef<(() => void) | null>(null);
  const snow = weatherMode === "live" ? clamp(0.5 + conditions.precipitation / 3, 0.5, 1) : 0.72;
  const inputRef = useRef<WeatherInput>({
    phase,
    weather,
    rain: intensity.rain,
    cloud: intensity.cloud,
    snow,
    wind: intensity.wind,
  });

  useEffect(() => {
    const input = {
      phase,
      weather,
      rain: intensity.rain,
      cloud: intensity.cloud,
      snow,
      wind: intensity.wind,
    };
    inputRef.current = input;
    const sim = simRef.current;
    if (!sim) return;
    sim.input = input;
    if (reducedMotion) {
      sim.settle();
      redrawRef.current?.();
    }
  }, [phase, weather, intensity.rain, intensity.cloud, intensity.wind, snow, reducedMotion]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const scene = sceneRef.current;
    // Canvas drawing needs a real browser (jsdom has no Path2D or 2D context).
    if (!canvas || !scene || typeof Path2D === "undefined") return;
    const ctx = canvas.getContext("2d");
    const glow = ctx ? glowSprite() : null;
    if (!ctx || !glow) return;

    const sim = new WeatherSim();
    sim.input = inputRef.current;
    sim.still = reducedMotion;
    simRef.current = sim;
    const track = trackSheets(scene, sim);
    let rect = canvas.getBoundingClientRect();
    let artScale = 1;
    let artOffset = 0;
    const surface: Surface = {
      ctx,
      width: 1,
      height: 1,
      scale: 1,
      offsetX: 0,
      skyClip: skyRegion(sim),
      skylineVersion: 0,
      glow,
    };
    const measure = () => {
      rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.max(1, rect.width);
      const height = Math.max(1, rect.height);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      artScale = Math.max(width / artWidth, height / artHeight);
      artOffset = (width - artWidth * artScale) / 2;
      surface.width = canvas.width;
      surface.height = canvas.height;
      surface.scale = artScale * dpr;
      surface.offsetX = artOffset * dpr;
      sim.setView(-artOffset / artScale, (width - artOffset) / artScale, height / artScale);
    };
    const toArt = (event: PointerEvent) => ({
      x: (event.clientX - rect.left - artOffset) / artScale,
      y: (event.clientY - rect.top) / artScale,
    });
    const draw = () => drawWeather(surface, sim);

    measure();
    sim.settle();
    draw();
    redrawRef.current = draw;

    let resizeObserver: ResizeObserver | null = null;
    const onResize = () => {
      measure();
      if (reducedMotion) draw();
    };
    if (typeof ResizeObserver === "function") {
      resizeObserver = new ResizeObserver(onResize);
      resizeObserver.observe(canvas);
    } else {
      window.addEventListener("resize", onResize);
    }

    if (reducedMotion) {
      return () => {
        resizeObserver?.disconnect();
        window.removeEventListener("resize", onResize);
        simRef.current = null;
        redrawRef.current = null;
      };
    }

    let lastEvent = 0;
    const onMove = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      const art = toArt(event);
      sim.move(art.x, art.y, (event.timeStamp - lastEvent) / 1000);
      lastEvent = event.timeStamp;
    };
    const onDown = (event: PointerEvent) => {
      if (event.pointerType !== "touch") return;
      const art = toArt(event);
      sim.tap(art.x, art.y);
    };
    const onLeave = (event: PointerEvent) => {
      if (event.relatedTarget === null) sim.pointer.hover = false;
    };
    const onBlur = () => {
      sim.pointer.hover = false;
    };

    let frame = 0;
    let last = 0;
    const tick = (now: number) => {
      const dt = Math.min(0.05, last ? (now - last) / 1000 : 1 / 60);
      last = now;
      track();
      sim.step(dt);
      draw();
      frame = requestAnimationFrame(tick);
    };
    const start = () => {
      if (frame || document.hidden) return;
      last = 0;
      frame = requestAnimationFrame(tick);
    };
    const stop = () => {
      cancelAnimationFrame(frame);
      frame = 0;
    };
    const onVisibility = () => (document.hidden ? stop() : start());

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointerout", onLeave, { passive: true });
    window.addEventListener("blur", onBlur);
    document.addEventListener("visibilitychange", onVisibility);
    start();

    return () => {
      stop();
      resizeObserver?.disconnect();
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerout", onLeave);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", onVisibility);
      simRef.current = null;
      redrawRef.current = null;
    };
  }, [sceneRef, reducedMotion]);

  return <canvas ref={canvasRef} className={styles.canvas} />;
}
