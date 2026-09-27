import { useRef, type CSSProperties, type ReactNode } from "react";

import type { PassProps } from "./motion/motion-types";
import { useSceneMotion, type ActivePass } from "./motion/scene-motion-provider";
import { clamp, sceneDepth as depth, useScene } from "./scene-provider";
import styles from "./toronto-scene.module.css";
import { TorontoSkylineArt } from "./toronto-skyline-art";
import { useReducedMotion } from "./use-reduced-motion";

type Slot = "Driver" | "Sky" | "Front" | "Screen";

/** Renders one slot of the active backdrop pass, keyed so a pass swap remounts it. */
function PassSlot({
  slot,
  active: { id, pass },
  props,
}: {
  slot: Slot;
  active: ActivePass;
  props: PassProps;
}): ReactNode {
  const Part = pass[slot];
  return Part ? <Part {...props} key={id} /> : null;
}

export function TorontoScene() {
  const {
    state: { phase: visiblePhase, weather: visibleWeather, weatherMode, conditions },
  } = useScene();
  const {
    state: { backdrop },
  } = useSceneMotion();
  const reducedMotion = useReducedMotion();
  const sceneRef = useRef<HTMLDivElement>(null);
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

  const passProps: PassProps = { sceneRef, phase: visiblePhase, depth, reducedMotion };
  const slot = (name: Slot) => <PassSlot slot={name} active={backdrop} props={passProps} />;

  return (
    <div
      ref={sceneRef}
      className={[styles.scene, backdrop.pass.className].filter(Boolean).join(" ")}
      data-phase={visiblePhase}
      data-weather={visibleWeather}
      data-backdrop-motion={backdrop.id}
      style={sceneStyle}
    >
      {slot("Driver")}
      <TorontoSkylineArt sky={slot("Sky")} front={slot("Front")} />
      <div className={styles.screenSlot} aria-hidden="true">
        {slot("Screen")}
      </div>
      <span className={styles.sceneStamp} aria-hidden="true">
        TORONTO • 43°39′N
      </span>
    </div>
  );
}
