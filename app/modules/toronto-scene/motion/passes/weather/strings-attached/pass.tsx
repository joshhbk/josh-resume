import { useEffect, useMemo, useRef, useSyncExternalStore } from "react";

import type { PassProps, ScenePass } from "../../../motion-types";
import { FlyLoft } from "./fly-loft";
import {
  frontRigs,
  paletteFor,
  skyRigs,
  type Cue,
  type RigSpec,
  type StageView,
} from "./stage-plan";
import styles from "./strings-attached.module.css";

function subscribeResize(onChange: () => void) {
  window.addEventListener("resize", onChange);
  return () => window.removeEventListener("resize", onChange);
}

const viewportKey = () => `${window.innerWidth}x${window.innerHeight}`;

/** The slice of the 1536-wide artwork the viewport shows, so props hang where they're seen. */
function useStageView(): StageView {
  const key = useSyncExternalStore(subscribeResize, viewportKey, () => "1536x1024");
  return useMemo(() => {
    const [width = 1536, height = 1024] = key.split("x").map(Number);
    const scale = Math.max(width / 1536, height / 1024);
    const visible = Math.min(1536, width / scale);
    return { left: Math.round((1536 - visible) / 2), width: Math.round(visible) };
  }, [key]);
}

/** Intensities are rounded so small live fluctuations don't call a new cue. */
const step = (value: number) => Math.round(value * 10) / 10;

function useCue({ phase, weather, intensity }: PassProps): Cue {
  const view = useStageView();
  const cloud = step(intensity.cloud);
  const rain = step(intensity.rain);
  return useMemo(
    () => ({ phase, weather, cloud, rain, view }),
    [phase, weather, cloud, rain, view],
  );
}

/** Mounts a fly loft into an SVG group and feeds it cues, lighting and wind. */
function useFlyLoft(specs: readonly RigSpec[], props: PassProps) {
  const group = useRef<SVGGElement>(null);
  const loft = useRef<FlyLoft | null>(null);
  const palette = paletteFor(props.phase);
  const wind = step(props.intensity.wind);

  useEffect(() => {
    const container = group.current;
    if (!container) return;
    // Built still and unlit; the effects below hand it the lighting, the wind and the first cue.
    const instance = new FlyLoft(container, "day", { wind: 0, reducedMotion: true });
    loft.current = instance;
    return () => {
      instance.destroy();
      loft.current = null;
    };
  }, []);

  useEffect(() => {
    loft.current?.setPalette(palette);
  }, [palette]);

  useEffect(() => {
    loft.current?.setWeathering({ wind, reducedMotion: props.reducedMotion });
  }, [wind, props.reducedMotion]);

  useEffect(() => {
    loft.current?.cue(specs);
  }, [specs]);

  return group;
}

function SkyRigs(props: PassProps) {
  const cue = useCue(props);
  const specs = useMemo(() => skyRigs(cue), [cue]);
  const group = useFlyLoft(specs, props);
  return <g ref={group} className={styles.loft} data-fly-loft="sky" />;
}

function FrontRigs(props: PassProps) {
  const cue = useCue(props);
  const specs = useMemo(() => frontRigs(cue), [cue]);
  const group = useFlyLoft(specs, props);
  return <g ref={group} className={styles.loft} data-fly-loft="front" />;
}

/**
 * Strings attached: the weather is a toy-theatre puppet show. Felt clouds, a cardboard sun, a
 * tinfoil moon with paper stars, glass-bead rain and cotton-wool snow all hang on threads from
 * the fly loft above the frame. The wind swings them; a change of weather is the stagehand's
 * cue, hauling the old props out and lowering the new ones in.
 */
export const pass: ScenePass = {
  className: styles.root ?? "",
  replaces: ["clouds", "rain", "snow", "sun", "moon", "stars"],
  Sky: SkyRigs,
  Front: FrontRigs,
};
