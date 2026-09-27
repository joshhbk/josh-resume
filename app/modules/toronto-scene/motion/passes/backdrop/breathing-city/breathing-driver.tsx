import { useEffect, useRef } from "react";

import type { DayPhase } from "../../../../scene-provider";
import type { PassProps } from "../../../motion-types";
import { useCursorParallax } from "../../../original-passes";
import {
  breathVolume,
  clamp01,
  gasp,
  heartbeat,
  lerp,
  rhythms,
  shiver,
  sigh,
  stepSpring,
  yawn,
  type Spring,
} from "./breath";
import { chimneys, parts, ribs, type BreathingPart } from "./city-anatomy";

type Painted = "scale" | "rotate" | "translate" | "opacity";

type Moment = { kind: "yawn" | "sigh" | "gasp"; at: number };

/** What the loop reads from the latest render without restarting. */
type Live = {
  phase: DayPhase;
  wind: number;
  windSpeed: number;
  cold: boolean;
  reducedMotion: boolean;
};

type Body = {
  sheets: { part: BreathingPart; lag: number; sheet: SVGElement; glow: SVGElement | null }[];
  ribs: { lag: number; el: SVGElement }[];
  water: SVGElement | null;
  trees: SVGElement | null;
  heart: SVGElement | null;
  furOffset: SVGElement | null;
  furMap: SVGElement | null;
  puffs: SVGElement[];
};

function findBody(scene: HTMLElement): Body {
  const query = (selector: string) => scene.querySelector<SVGElement>(selector);
  return {
    sheets: parts.flatMap(({ part, layer, lag }) => {
      const sheet = query(`[data-scene-layer="${layer}"]`);
      return sheet ? [{ part, lag, sheet, glow: query(`[data-bc-glow="${part}"]`) }] : [];
    }),
    ribs: ribs.flatMap(({ layer, lag }) => {
      const el = query(`[data-scene-layer="${layer}"]`);
      return el ? [{ lag, el }] : [];
    }),
    water: query('[data-scene-layer="water"]'),
    trees: query('[data-scene-layer="trees"]'),
    heart: query("[data-bc-heart]"),
    furOffset: query('[data-bc-fur="offset"]'),
    furMap: query('[data-bc-fur="map"]'),
    puffs: [...scene.querySelectorAll<SVGElement>("[data-bc-puff]")],
  };
}

function relax(body: Body) {
  for (const { sheet, glow } of body.sheets) {
    for (const el of [sheet, glow]) {
      el?.style.removeProperty("scale");
      el?.style.removeProperty("rotate");
    }
    glow?.style.removeProperty("opacity");
  }
  for (const { el } of body.ribs) el.style.removeProperty("scale");
  body.water?.style.removeProperty("translate");
  body.trees?.style.removeProperty("translate");
  body.heart?.style.removeProperty("opacity");
}

const fixed = (value: number, digits = 4) => value.toFixed(digits);

/** Seconds until the next idle yawn. */
const nextYawnIn = () => 38 + Math.random() * 32;

/**
 * Runs the city's body: breath, heartbeat, tower sway, fur, yawns, sighs and gasps. Everything is
 * written straight to the elements' independent `scale` / `rotate` / `translate` properties, so
 * it composes with the scene's parallax transforms without re-rendering React.
 */
export function BreathingDriver({
  sceneRef,
  phase,
  intensity,
  conditions,
  weather,
  depth,
  reducedMotion,
}: PassProps) {
  useCursorParallax(sceneRef, depth.parallax * 0.55);

  const cold =
    weather === "snow" || (conditions.temperature !== null && conditions.temperature <= 5);
  const live = useRef<Live>({
    phase,
    wind: intensity.wind,
    windSpeed: conditions.windSpeed,
    cold,
    reducedMotion,
  });
  const moments = useRef<Moment[]>([]);
  const lastPhase = useRef<DayPhase | null>(null);

  useEffect(() => {
    live.current = {
      phase,
      wind: intensity.wind,
      windSpeed: conditions.windSpeed,
      cold,
      reducedMotion,
    };
  });

  // A change of light is a moment: the city wakes with a yawn, or settles into a long sigh.
  useEffect(() => {
    const previous = lastPhase.current;
    lastPhase.current = phase;
    if (previous === null || previous === phase) return;
    const fallingAsleep = phase === "dusk" || phase === "night";
    moments.current.push({ kind: fallingAsleep ? "sigh" : "yawn", at: performance.now() / 1000 });
  }, [phase]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    const body = findBody(scene);
    if (body.sheets.length === 0) return;

    const firstRhythm = rhythms[live.current.phase];
    const state = {
      last: performance.now() / 1000,
      breath: 0.08,
      beat: 0,
      period: firstRhythm.period,
      depth: firstRhythm.depth,
      heartRate: firstRhythm.heart,
      arousal: 0,
      lights: Object.fromEntries(parts.map(({ part }) => [part, firstRhythm.lights])) as Record<
        BreathingPart,
        number
      >,
      flicker: 1,
      nextFlicker: 0,
      nextYawn: performance.now() / 1000 + 9,
      nextGust: 0,
      sway: { value: 0, velocity: 0 } satisfies Spring,
      furStep: 0,
      lastPaint: 0,
      furDrift: 0,
      exhaling: false,
      // Reduced motion: a single slow breath after mount or a change of light, then stillness.
      stillFrom: performance.now() / 1000 + firstRhythm.period,
    };
    let frame = 0;
    let lastPointer: { x: number; y: number; t: number } | null = null;
    let lastScroll = window.scrollY;

    const rouse = (amount: number) => {
      state.arousal = Math.min(1, state.arousal + amount);
    };
    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      const t = event.timeStamp;
      if (lastPointer) {
        const dt = Math.max(8, t - lastPointer.t);
        const dx = event.clientX - lastPointer.x;
        const dy = event.clientY - lastPointer.y;
        const speed = Math.hypot(dx, dy) / dt;
        rouse(Math.min(0.08, speed * 0.012));
        // A flick of the cursor is a gust against the tower.
        state.sway.velocity += (dx / dt) * 0.05;
      }
      lastPointer = { x: event.clientX, y: event.clientY, t };
    };
    const onPointerDown = () => {
      if (live.current.reducedMotion) return;
      rouse(0.45);
      moments.current.push({ kind: "gasp", at: performance.now() / 1000 });
    };
    const onScroll = () => {
      const delta = Math.abs(window.scrollY - lastScroll);
      lastScroll = window.scrollY;
      rouse(Math.min(0.06, delta * 0.0009));
    };

    const puffAt = (index: number, now: number) => {
      const puff = body.puffs[index];
      if (!puff || typeof puff.animate !== "function") return;
      const drift = 18 + live.current.wind * 60;
      puff.animate(
        [
          { translate: "0 0", scale: "0.3", opacity: 0 },
          { translate: `${drift * 0.2}px -16px`, scale: "0.8", opacity: 0.85, offset: 0.18 },
          { translate: `${drift}px -82px`, scale: "2.1", opacity: 0 },
        ],
        { duration: 3600 + (now % 1) * 900, easing: "cubic-bezier(0.16, 1, 0.3, 1)" },
      );
    };

    const tick = (nowMs: number) => {
      frame = requestAnimationFrame(tick);
      const now = nowMs / 1000;
      const dt = Math.min(0.05, Math.max(0, now - state.last));
      state.last = now;
      if (document.hidden) return;

      const {
        phase: currentPhase,
        wind,
        windSpeed,
        cold: isCold,
        reducedMotion: still,
      } = live.current;
      const rhythm = rhythms[currentPhase];

      // Settle the rhythm toward the current light, and let excitement ebb away.
      const ease = 1 - Math.exp(-dt / 1.8);
      state.period = lerp(state.period, rhythm.period, ease);
      state.depth = lerp(state.depth, rhythm.depth, ease);
      state.heartRate = lerp(
        state.heartRate,
        rhythm.heart + state.arousal * 68,
        1 - Math.exp(-dt * 2),
      );
      state.arousal *= Math.exp(-dt / 3.2);

      // Live wind quickens the breath a little; excitement quickens it a lot.
      const period = state.period / (1 + state.arousal * 0.95 + Math.min(0.2, windSpeed / 150));
      state.breath += dt / period;
      state.beat += (dt * state.heartRate) / 60;

      // Idle yawns keep the city alive when nobody is around (and on touch screens).
      if (!still && now > state.nextYawn) {
        moments.current.push({ kind: "yawn", at: now });
        state.nextYawn = now + nextYawnIn();
      }
      moments.current = moments.current.filter((moment) => now - moment.at < 9);
      if (still) {
        const phaseMoment = moments.current.find((moment) => moment.kind !== "gasp");
        if (phaseMoment)
          state.stillFrom = Math.max(state.stillFrom, phaseMoment.at + rhythm.period);
        moments.current = [];
      }
      const momentValue = (kind: Moment["kind"], delay: number) => {
        let total = 0;
        for (const moment of moments.current) {
          if (moment.kind !== kind) continue;
          const seconds = now - moment.at - delay;
          total +=
            kind === "yawn" ? yawn(seconds) : kind === "sigh" ? sigh(seconds) : gasp(seconds);
        }
        return total;
      };

      // Reduced motion: breathe once, slowly, then rest completely.
      const calm = still ? clamp01((state.stillFrom - now) / rhythm.period) : 1;
      const arousalDepth = state.depth * (1 + state.arousal * 0.6) * calm;
      const pulse = still ? 0 : heartbeat(state.beat);

      // Window lights come on sheet by sheet (left first), stuttering like old tubes.
      if (now > state.nextFlicker) {
        state.flicker = 0.55 + Math.random() * 0.45;
        state.nextFlicker = now + 0.05 + Math.random() * 0.12;
      }
      const inhaleWhole = breathVolume(state.breath);
      // Slow breathing is painted at 30fps (half the SVG repaints); a stirred city gets every frame.
      const paint = still || state.arousal > 0.2 || now - state.lastPaint >= 1 / 30 - 0.004;
      if (paint) state.lastPaint = now;
      const write = (el: SVGElement | null, property: Painted, value: string) => {
        if (paint && el) el.style[property] = value;
      };

      for (const [index, { part, lag, sheet, glow }] of body.sheets.entries()) {
        const volume = breathVolume(state.breath - lag);
        const delay = lag * 3;
        const stretch = still ? 0 : clamp01(momentValue("yawn", delay));
        const deflate = still ? 0 : momentValue("sigh", delay);
        const flinch = still ? 0 : momentValue("gasp", lag);
        const lift =
          arousalDepth * volume * (1 - stretch) +
          0.055 * stretch +
          0.022 * deflate +
          0.02 * flinch +
          0.0035 * pulse;
        const isTower = part === "tower";
        const sy = 1 + lift * (isTower ? 0.8 : 1);
        const sx = 1 + lift * (isTower ? 0.05 : 0.2);
        const scale = `${fixed(sx)} ${fixed(sy)}`;
        write(sheet, "scale", scale);
        write(glow, "scale", scale);

        const target = rhythm.lights;
        const current = state.lights[part];
        const rate = still
          ? 1
          : (1 - Math.exp(-dt * (1.6 - index * 0.32))) * (target > current ? 1 : 1.4);
        const level = lerp(current, target, rate);
        state.lights[part] = level;
        if (glow && part !== "tower") {
          const warming = target - level > 0.04 && !still ? state.flicker : 1;
          const drowsy = 1 - 0.78 * stretch;
          const opacity = level * warming * drowsy * (0.62 + 0.38 * volume + 0.08 * pulse);
          write(glow, "opacity", fixed(clamp01(opacity), 3));
        }
      }

      // The tower is a reed: it leans with the wind, sways on its own and rings after gusts.
      const tower = body.sheets.find(({ part }) => part === "tower");
      if (tower) {
        if (!still && now > state.nextGust) {
          state.sway.velocity +=
            (Math.random() - 0.3) * Math.sign(wind || 1) * Math.abs(wind) * 0.9;
          state.nextGust = now + 2.5 + Math.random() * 4;
        }
        const lean = wind * 1.1;
        const reed =
          Math.sin(now * ((Math.PI * 2) / 3.7)) *
          (0.22 + Math.abs(wind) * 0.9 + state.arousal * 0.5);
        stepSpring(state.sway, still ? 0 : lean + reed, dt);
        state.sway.value = Math.max(-3.2, Math.min(3.2, state.sway.value));
        const angle = still ? 0 : state.sway.value;
        const rotate = `${fixed(angle, 3)}deg`;
        write(tower.sheet, "rotate", rotate);
        write(tower.glow, "rotate", rotate);
      }

      for (const { lag, el } of body.ribs) {
        write(el, "scale", `1 ${fixed(1 + arousalDepth * 1.1 * breathVolume(state.breath - lag))}`);
      }
      const swell = breathVolume(state.breath - 0.3);
      write(body.water, "translate", `0 ${fixed(-4.5 * swell * calm - 1.2 * pulse, 2)}px`);
      write(body.heart, "opacity", fixed(clamp01(state.lights.tower * (0.18 + 0.72 * pulse)), 3));

      // Fur steps at 12fps: the noise field is stroked back and forth, bristling after a yawn.
      let bristle = 0;
      if (!still) {
        for (const moment of moments.current) {
          if (moment.kind === "yawn") bristle += shiver(now - moment.at - 6.3);
        }
      }
      write(
        body.trees,
        "translate",
        bristle > 0 ? `${fixed(Math.sin(now * 70) * 2.4 * bristle, 2)}px 0` : "",
      );
      if (!still && now - state.furStep > 1 / 12) {
        state.furStep = now;
        state.furDrift += wind * 0.9;
        const stroke = Math.sin(now * 0.8) * 70 + Math.sin(now * 2.1) * 12 * (0.3 + Math.abs(wind));
        const offset = ((((stroke + state.furDrift + 110) % 220) + 220) % 220) - 110;
        body.furOffset?.setAttribute("dx", fixed(offset, 1));
        body.furMap?.setAttribute(
          "scale",
          fixed(5 + Math.abs(wind) * 5 + state.arousal * 5 + bristle * 18 + inhaleWhole * 2, 1),
        );
      }

      // Cold days: each exhale steams from the rooftops.
      const exhaling = breathVolume(state.breath + 0.01) < inhaleWhole;
      if (!still && isCold && exhaling && !state.exhaling) {
        const count = 2 + Math.round(Math.random() * 2);
        const start = Math.floor(Math.random() * chimneys.length);
        for (let n = 0; n < count; n += 1) puffAt((start + n * 3) % chimneys.length, now);
      }
      state.exhaling = exhaling;

      if (still && now > state.stillFrom + 0.5) {
        cancelAnimationFrame(frame);
        frame = 0;
      }
    };

    const wake = () => {
      if (frame === 0) {
        state.last = performance.now() / 1000;
        frame = requestAnimationFrame(tick);
      }
    };
    // Reduced motion wakes the loop only for the single breath after a change of light.
    const watchStill = window.setInterval(() => {
      if (!live.current.reducedMotion || moments.current.length > 0) wake();
    }, 500);

    frame = requestAnimationFrame(tick);
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerdown", onPointerDown, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("visibilitychange", wake);
    return () => {
      cancelAnimationFrame(frame);
      window.clearInterval(watchStill);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", wake);
      for (const puff of body.puffs)
        for (const animation of puff.getAnimations?.() ?? []) animation.cancel();
      relax(body);
    };
  }, [sceneRef]);

  return null;
}
