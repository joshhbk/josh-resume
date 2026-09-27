import { useEffect, useLayoutEffect, useRef, type RefObject } from "react";

import type { PassProps } from "../../../motion-types";
import styles from "./stop-motion.module.css";
import { handholds, subscribeTwelves, type Frame, type Incident } from "./twelves";

type Exposure = { tone: "light" | "dark"; opacity: number };

/** The frames a jump cut is made of: blown-out, half-blown, a dark splice, a last flare. */
const phaseCut: readonly Exposure[] = [
  { tone: "light", opacity: 0.94 },
  { tone: "light", opacity: 0.52 },
  { tone: "dark", opacity: 0.5 },
  { tone: "light", opacity: 0.16 },
];
const weatherCut: readonly Exposure[] = [
  { tone: "dark", opacity: 0.32 },
  { tone: "light", opacity: 0.14 },
];

const thumbOpacity = [0.62, 0.5, 0.22];
const handFrames: Record<number, { opacity: number; shift: number }> = {
  0: { opacity: 1, shift: 0 },
  1: { opacity: 0.7, shift: 0.18 },
  8: { opacity: 0.85, shift: -0.1 },
};

type Parts = {
  exposure: HTMLDivElement | null;
  leak: HTMLDivElement | null;
  thumb: HTMLDivElement | null;
  hand: HTMLDivElement | null;
  slate: HTMLSpanElement | null;
};

const pad = (value: number, digits: number) => String(value).padStart(digits, "0");

function show(element: HTMLElement | null, opacity: number) {
  if (element) element.style.opacity = opacity > 0 ? opacity.toFixed(3) : "0";
}

function setTone(element: HTMLDivElement | null, { tone, opacity }: Exposure) {
  if (!element) return;
  element.dataset.tone = tone;
  show(element, opacity);
}

/** Aims the hand's shadow so its fingertips land on the puppet being knocked. */
function aimHand(
  hand: HTMLDivElement,
  sceneRef: RefObject<HTMLDivElement | null>,
  incident: Extract<Incident, { kind: "hand" }>,
) {
  const scene = sceneRef.current;
  if (!scene) return;
  const bounds = scene.getBoundingClientRect();
  const scale = Math.max(bounds.width / 1536, bounds.height / 1024);
  const offsetX = (bounds.width - 1536 * scale) / 2;
  const hold = handholds[incident.target];
  const artX = hold.x + (Math.random() * 2 - 1) * hold.spread;
  hand.style.setProperty("--hand-scale", scale.toFixed(3));
  hand.style.left = `${(offsetX + artX * scale).toFixed(1)}px`;
  hand.style.top = `${(hold.y * scale).toFixed(1)}px`;
  hand.style.setProperty("--hand-turn", `${(Math.random() * 50 - 25).toFixed(1)}deg`);
}

/**
 * Everything the camera itself adds: exposure flicker between frames, light leaks, the stray
 * thumb and the animator's hand caught in a frame, jump-cut flashes, and the exposure-sheet slate.
 */
export function CameraGate({ sceneRef, phase, weather, reducedMotion }: PassProps) {
  const parts = useRef<Parts>({ exposure: null, leak: null, thumb: null, hand: null, slate: null });
  const clock = useRef({ count: 0, sceneStart: 0, scene: 1, take: 1 });
  const cut = useRef<{ start: number; frames: readonly Exposure[] } | null>(null);
  const previous = useRef({ phase, weather });

  // A lighting change is a new scene, a weather change a new take; both cut in hard on the
  // very next paint, before the clock ticks, so the new set never fades in.
  useLayoutEffect(() => {
    const last = previous.current;
    previous.current = { phase, weather };
    if (last.phase === phase && last.weather === weather) return;
    const state = clock.current;
    if (last.phase !== phase) {
      state.scene++;
      state.take = 1;
    } else {
      state.take++;
    }
    state.sceneStart = state.count;
    if (reducedMotion) return;
    const frames = last.phase !== phase ? phaseCut : weatherCut;
    cut.current = { start: state.count, frames };
    const first = frames[0];
    if (first) setTone(parts.current.exposure, first);
  }, [phase, weather, reducedMotion]);

  useEffect(() => {
    const writeSlate = () => {
      const { count, sceneStart, scene, take } = clock.current;
      const slate = parts.current.slate;
      if (slate) {
        slate.textContent = `SC ${pad(scene, 2)} · TK ${take} · FR ${pad(count - sceneStart + 1, 4)}`;
      }
    };
    writeSlate();
    if (reducedMotion) return;

    let handAimedFor = -1;
    const onFrame = ({ count, incident }: Frame) => {
      clock.current.count = count;
      writeSlate();
      const { exposure, leak, thumb, hand, slate } = parts.current;

      // Exposure: no two frames get quite the same light.
      const cutting = cut.current;
      const cutFrame = cutting ? cutting.frames[count - cutting.start] : undefined;
      if (cutFrame) setTone(exposure, cutFrame);
      else {
        cut.current = null;
        const flare = Math.random() < 0.03;
        setTone(exposure, {
          tone: Math.random() < 0.55 ? "light" : "dark",
          opacity: flare ? 0.09 : Math.random() * 0.045,
        });
      }

      const stage = incident ? count - incident.start : -1;
      show(leak, incident?.kind === "leak" ? 0.35 + Math.random() * 0.45 : 0);
      if (leak && incident?.kind === "leak") leak.dataset.side = incident.side;
      show(thumb, incident?.kind === "thumb" ? (thumbOpacity[stage] ?? 0) : 0);
      if (thumb && incident?.kind === "thumb") thumb.dataset.corner = String(incident.corner);

      if (hand && incident?.kind === "hand") {
        if (handAimedFor !== incident.start) {
          handAimedFor = incident.start;
          aimHand(hand, sceneRef, incident);
        }
        const handFrame = handFrames[stage];
        hand.style.setProperty("--hand-shift", String(handFrame?.shift ?? 0));
        show(hand, handFrame?.opacity ?? 0);
      } else show(hand, 0);

      // The slate is a paper label taped to the mat: it shakes with the table.
      if (slate) {
        slate.style.translate = `${(Math.random() - 0.5).toFixed(2)}px ${(Math.random() - 0.5).toFixed(2)}px`;
      }
    };
    return subscribeTwelves(onFrame);
  }, [sceneRef, reducedMotion]);

  return (
    <div className={styles.gate} data-motion={reducedMotion ? "still" : "running"}>
      <div
        className={styles.hand}
        ref={(element) => {
          parts.current.hand = element;
        }}
      >
        <HandShadow />
      </div>
      <div
        className={styles.thumb}
        ref={(element) => {
          parts.current.thumb = element;
        }}
      />
      <div
        className={styles.leak}
        ref={(element) => {
          parts.current.leak = element;
        }}
      />
      <div
        className={styles.exposure}
        ref={(element) => {
          parts.current.exposure = element;
        }}
      />
      <span
        className={styles.slate}
        ref={(element) => {
          parts.current.slate = element;
        }}
      />
    </div>
  );
}

/** The out-of-focus shadow of a hand reaching down into the set, fingertips at the bottom. */
function HandShadow() {
  return (
    <svg viewBox="0 0 300 640" className={styles.handArt} aria-hidden="true">
      <defs>
        <filter id="stop-motion-hand-soft" x="-30%" y="-10%" width="160%" height="120%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
      </defs>
      <g filter="url(#stop-motion-hand-soft)">
        <rect x="92" y="-60" width="132" height="400" rx="60" />
        <rect x="70" y="270" width="178" height="190" rx="70" />
        <rect x="74" y="400" width="36" height="150" rx="18" transform="rotate(7 92 400)" />
        <rect x="114" y="410" width="40" height="200" rx="20" transform="rotate(2 134 410)" />
        <rect x="160" y="412" width="40" height="214" rx="20" />
        <rect x="204" y="404" width="38" height="186" rx="19" transform="rotate(-5 223 404)" />
        <rect x="224" y="280" width="42" height="160" rx="21" transform="rotate(-38 245 290)" />
      </g>
    </svg>
  );
}
