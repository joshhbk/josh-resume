import { useEffect, useRef, type RefObject } from "react";

import type { DayPhase, Weather } from "../../../../scene-provider";
import { boilFrames, seededRandom } from "./path-boil";
import {
  framesPerSecond,
  nearestPuppet,
  requestHand,
  subscribeTwelves,
  type Frame,
  type KnockTarget,
} from "./twelves";

/** Puppets on the set: how far the animator's hand wanders each exposure (art units / degrees). */
const puppets = [
  { layer: "sky-band-back", drift: 0.9, turn: 0.03 },
  { layer: "sky-band-middle", drift: 1.1, turn: 0.04 },
  { layer: "sky-band-front", drift: 1.2, turn: 0.04 },
  { layer: "sun", drift: 1.8, turn: 0 },
  { layer: "moon", drift: 1.4, turn: 0 },
  { layer: "moon-aura", drift: 1.4, turn: 0 },
  { layer: "stars", drift: 1.2, turn: 0.05 },
  { layer: "clouds-back", drift: 0, turn: 0.12 },
  { layer: "clouds-front", drift: 0, turn: 0.14 },
  { layer: "buildings-left", drift: 0.55, turn: 0.07 },
  { layer: "buildings-right", drift: 0.55, turn: 0.07 },
  { layer: "buildings-center", drift: 0.5, turn: 0.1 },
  { layer: "tower", drift: 0.45, turn: 0.16 },
  { layer: "trees", drift: 0.8, turn: 0.05 },
  { layer: "shore", drift: 0.6, turn: 0.03 },
  { layer: "water", drift: 0.9, turn: 0.02 },
] as const;

/** Where a knock sends each puppet before the animator nudges it back. */
const knocks: Record<KnockTarget, { x: number; y: number; turn: number }> = {
  tower: { x: 3, y: 0, turn: 2.4 },
  "buildings-left": { x: -8, y: 3, turn: -0.9 },
  "buildings-right": { x: 9, y: 2, turn: 1 },
  "buildings-center": { x: 2, y: 6, turn: 0.6 },
  trees: { x: -6, y: 7, turn: 0.7 },
};

/** How much of the knock is still in the set, frame by frame after the hand lands. */
const knockCurve = [1, 1, 1, 1, 1, 1, 1, 1, 0.38, 0.14, 0.14, 0.14, 0.05, 0.05];

/** Cut edges that boil, with how far a redrawn point may stray. */
const boilingEdges = [
  ['[data-scene-layer^="sky-band"]', 1.4],
  ['[data-scene-layer^="clouds"] > path', 2.2],
  ['[data-scene-layer="trees"] > path:first-child', 1.1],
  ["#toronto-trees-cut > path", 1.1],
  ['[data-scene-layer="shore"] > path:first-child', 1],
  ["#toronto-shore-cut > path", 1],
  ['[data-scene-layer="water"] > path:first-child', 1],
  ["#toronto-water-cut > path", 1],
  ["#toronto-tower-cut > path", 0.45],
  ["#toronto-left-buildings-cut > path", 0.8],
  ["#toronto-right-buildings-cut > path", 0.8],
  ["#toronto-center-buildings-cut > path", 0.7],
  ['[data-scene-layer="frame"] > path', 1.8],
  ['[data-scene-layer="mat"]', 1.2],
  ['[data-scene-layer="water-marks"]', 1.6],
  ['[data-scene-layer="stars"] > path', 0.8],
] as const;

const boilDrawings = 3;

const planeMotion = [
  ["sky", 3, 2],
  ["land", 16, 8],
  ["water", 33, 17],
] as const;

type Boil = { path: SVGPathElement; original: string; frames: string[] };
type Puppet = { element: SVGGraphicsElement; drift: number; turn: number; layer: string };

function collectBoils(scene: HTMLElement): Boil[] {
  return boilingEdges.flatMap(([selector, amount]) =>
    [...scene.querySelectorAll<SVGPathElement>(selector)].flatMap((path) => {
      const original = path.getAttribute("d");
      const frames = original ? boilFrames(original, amount, boilDrawings) : null;
      return original && frames ? [{ path, original, frames }] : [];
    }),
  );
}

function collectPuppets(scene: HTMLElement): Puppet[] {
  return puppets.flatMap(({ layer, drift, turn }) => {
    const element = scene.querySelector<SVGGraphicsElement>(`[data-scene-layer="${layer}"]`);
    return element ? [{ element, drift, turn, layer }] : [];
  });
}

const fixed = (value: number, digits = 2) => value.toFixed(digits);

function pose(puppet: Puppet, x: number, y: number, turn: number) {
  if (puppet.drift > 0) puppet.element.style.translate = `${fixed(x)}px ${fixed(y)}px`;
  if (puppet.turn > 0 || turn !== 0) puppet.element.style.rotate = `${fixed(turn, 3)}deg`;
}

function clearPose(puppet: Puppet) {
  puppet.element.style.removeProperty("translate");
  puppet.element.style.removeProperty("rotate");
}

type Options = {
  parallax: number;
  reducedMotion: boolean;
  phase: DayPhase;
  weather: Weather;
};

/**
 * Animates the diorama on twelves: every puppet is re-posed by a slightly unsteady hand each
 * exposure, the cut edges boil through three drawings, the cursor parallax snaps to the 12fps
 * grid, and when the animator's hand reaches in, the puppet it touches is knocked and corrected.
 */
export function useStopMotionSet(
  sceneRef: RefObject<HTMLDivElement | null>,
  { parallax, reducedMotion, phase, weather }: Options,
): void {
  const frameCount = useRef(0);
  const bumpUntil = useRef(0);
  const firstCut = useRef(true);

  // A jump cut to a new lighting or weather set bumps the camera for a few frames.
  useEffect(() => {
    if (firstCut.current) {
      firstCut.current = false;
      return;
    }
    bumpUntil.current = frameCount.current + 4;
  }, [phase, weather]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    const boils = collectBoils(scene);
    const cast = collectPuppets(scene);
    const restore = () => {
      for (const { path, original } of boils) path.setAttribute("d", original);
      for (const puppet of cast) clearPose(puppet);
      for (const [plane] of planeMotion) {
        scene.style.removeProperty(`--${plane}-x`);
        scene.style.removeProperty(`--${plane}-y`);
      }
    };

    if (reducedMotion) {
      // One still exposure: the edges hand-cut, the puppets resting slightly off their marks.
      const random = seededRandom(12);
      for (const { path, frames } of boils) path.setAttribute("d", frames[1] ?? "");
      for (const puppet of cast) {
        pose(
          puppet,
          (random() * 2 - 1) * puppet.drift,
          (random() * 2 - 1) * puppet.drift,
          (random() * 2 - 1) * puppet.turn,
        );
      }
      return restore;
    }

    let drawing = 0;
    let pointer: { x: number; y: number } | null = null;
    let lastPointerAt = -Infinity;
    const camera = { x: 0, y: 0 };
    const wander = cast.map(() => ({ x: 0, y: 0, turn: 0 }));

    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      pointer = {
        x: event.clientX / window.innerWidth - 0.5,
        y: event.clientY / window.innerHeight - 0.5,
      };
      lastPointerAt = performance.now();
    };
    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType !== "touch") return;
      // A tap is the animator reaching in for whichever puppet is nearest the finger.
      const bounds = scene.getBoundingClientRect();
      const scale = Math.max(bounds.width / 1536, bounds.height / 1024);
      const x = (event.clientX - bounds.left - (bounds.width - 1536 * scale) / 2) / scale;
      const y = (event.clientY - bounds.top) / scale;
      requestHand(nearestPuppet(x, y));
    };
    const onBlur = () => {
      pointer = null;
    };

    const onFrame = ({ count, held, incident }: Frame) => {
      frameCount.current = count;
      if (held) return;

      // Boil: never the same drawing twice in a row.
      drawing = (drawing + 1 + Math.floor(Math.random() * (boilDrawings - 1))) % boilDrawings;
      for (const { path, frames } of boils) path.setAttribute("d", frames[drawing] ?? "");

      // Camera: the cursor, or a slow motion-control truck across the set when nobody's steering.
      const idle = performance.now() - lastPointerAt > 4000 || !pointer;
      const seconds = count / framesPerSecond;
      const target = idle
        ? { x: Math.sin(seconds / 2.6) * 0.34, y: Math.sin(seconds / 3.7) * 0.12 }
        : (pointer ?? { x: 0, y: 0 });
      camera.x += (target.x - camera.x) * 0.38;
      camera.y += (target.y - camera.y) * 0.38;
      for (const [plane, xRange, yRange] of planeMotion) {
        scene.style.setProperty(`--${plane}-x`, `${Math.round(camera.x * xRange * parallax)}px`);
        scene.style.setProperty(`--${plane}-y`, `${Math.round(camera.y * yRange * parallax)}px`);
      }

      // Puppets: re-posed by hand each exposure, never quite where they were.
      const bump = count < bumpUntil.current ? 4 : 1;
      const knockStage = incident?.kind === "hand" ? count - incident.start : -1;
      const knock = incident?.kind === "hand" ? knocks[incident.target] : null;
      const knockAmount = knockStage >= 0 ? (knockCurve[knockStage] ?? 0) : 0;
      cast.forEach((puppet, index) => {
        const hand = wander[index];
        if (!hand) return;
        hand.x = hand.x * 0.45 + (Math.random() * 2 - 1) * puppet.drift * bump;
        hand.y = hand.y * 0.45 + (Math.random() * 2 - 1) * puppet.drift * bump;
        hand.turn = hand.turn * 0.45 + (Math.random() * 2 - 1) * puppet.turn * bump;
        const knocked = knock && incident?.kind === "hand" && incident.target === puppet.layer;
        pose(
          puppet,
          hand.x + (knocked ? knock.x * knockAmount : 0),
          hand.y + (knocked ? knock.y * knockAmount : 0),
          hand.turn + (knocked ? knock.turn * knockAmount : 0),
        );
      });
    };

    const unsubscribe = subscribeTwelves(onFrame);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("blur", onBlur);
    return () => {
      unsubscribe();
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("blur", onBlur);
      restore();
    };
  }, [sceneRef, parallax, reducedMotion]);
}
