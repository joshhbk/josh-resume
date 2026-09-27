import { useEffect, useRef, type RefObject } from "react";

import type { DepthSettings } from "../../../../scene-provider";
import { pageTurnMs } from "./pop-layers";

/** Perspective distance set on the scene root in the CSS module; used to keep far sheets full-size. */
const perspectivePx = 1500;

// The overlay (paper mat and frame) stays put: it is the rigid board around the pages.
type SheetName = "base" | "planes";

/**
 * Each paper sheet sits at its own depth inside the book. `close` is how much of the book's
 * closing (scroll, breathing, page turns) the sheet takes: the sky page swings most, the land less.
 */
const sheets: Record<SheetName, { z: number; overscan: number; close: number }> = {
  base: { z: -170, overscan: 1.06, close: 1 },
  planes: { z: -55, overscan: 1.06, close: 0.24 },
};

const sheetNames = Object.keys(sheets) as SheetName[];

type Pose = { rx: number; ry: number; scroll: number; idle: number };

const smooth = (current: number, target: number, rate: number, dt: number) =>
  current + (target - current) * (1 - Math.exp(-rate * dt));

/** 0 → 1 → 0 over a page turn: the book closes quickly and reopens with a little bounce. */
function turnCurve(progress: number): number {
  if (progress <= 0 || progress >= 1) return 0;
  if (progress < 0.42) {
    const t = progress / 0.42;
    return t * t * (3 - 2 * t);
  }
  const t = (progress - 0.42) / 0.58;
  const back = 1.9;
  const eased = 1 + (back + 1) * (t - 1) ** 3 + back * (t - 1) ** 2;
  return 1 - eased;
}

function scrollProgress(target: EventTarget | null): number {
  if (target instanceof Element && target.scrollHeight > target.clientHeight + 40) {
    return target.scrollTop / Math.max(1, target.scrollHeight - target.clientHeight);
  }
  const root = document.scrollingElement ?? document.documentElement;
  return window.scrollY / Math.max(1, root.scrollHeight - window.innerHeight);
}

function sheetTransform(name: SheetName, pose: Pose, closeDeg: number, depth: DepthSettings) {
  const { z, overscan, close } = sheets[name];
  const depthZ = z * depth.separation;
  const scale = ((perspectivePx - depthZ) / perspectivePx) * overscan;
  return `rotateX(${pose.rx.toFixed(2)}deg) rotateY(${pose.ry.toFixed(2)}deg) translateZ(${depthZ.toFixed(1)}px) scale(${scale.toFixed(4)}) rotateX(${(closeDeg * close).toFixed(2)}deg)`;
}

/**
 * Tilts the whole book in 3D: the cursor steers it, scrolling slowly closes it, and on touch or
 * when the cursor rests it breathes open and closed on its own. `turnAt` starts a page turn.
 */
export function useBookPose(
  sceneRef: RefObject<HTMLDivElement | null>,
  depth: DepthSettings,
  reducedMotion: boolean,
  turnAt: RefObject<number | null>,
): void {
  const depthRef = useRef(depth);

  useEffect(() => {
    depthRef.current = depth;
  }, [depth]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    const elements = sheetNames.flatMap((name) => {
      const element = scene.querySelector<SVGSVGElement>(`[data-scene-sheet="${name}"]`);
      return element ? [[name, element] as const] : [];
    });
    const written = new Map<SheetName, string>();
    const write = (pose: Pose, closeDeg: number) => {
      for (const [name, element] of elements) {
        const value = sheetTransform(name, pose, closeDeg, depthRef.current);
        if (written.get(name) === value) continue;
        written.set(name, value);
        element.style.transform = value;
      }
    };
    const clear = () => {
      for (const [, element] of elements) element.style.removeProperty("transform");
    };

    if (reducedMotion || typeof window.requestAnimationFrame !== "function") {
      // A still, open book seen from slightly above and to the left.
      write({ rx: 2.2, ry: -2.4, scroll: 0, idle: 0 }, 4);
      return clear;
    }

    const noHover =
      typeof window.matchMedia === "function" && window.matchMedia("(hover: none)").matches;
    const pose: Pose = { rx: 0, ry: 0, scroll: 0, idle: noHover ? 1 : 0 };
    const pointer = { x: 0, y: 0, at: -Infinity };
    let scrollTarget = scrollProgress(null);
    let flutterAt = -Infinity;
    let frame = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const t = now / 1000;
      const { parallax } = depthRef.current;

      const idleTarget = noHover || now - pointer.at > 3500 ? 1 : 0;
      pose.idle = smooth(pose.idle, idleTarget, idleTarget ? 0.8 : 4, dt);
      const drift = { rx: Math.sin(t * 0.37) * 1.3, ry: Math.sin(t * 0.5) * 2.6 };
      const aim = { rx: -pointer.y * 6, ry: pointer.x * 9 };
      const target = {
        rx: (aim.rx * (1 - pose.idle) + drift.rx * pose.idle) * parallax,
        ry: (aim.ry * (1 - pose.idle) + drift.ry * pose.idle) * parallax,
      };
      pose.rx = smooth(pose.rx, target.rx, 5, dt);
      pose.ry = smooth(pose.ry, target.ry, 5, dt);
      pose.scroll = smooth(pose.scroll, scrollTarget, 4, dt);

      const breath = pose.idle * ((1 - Math.cos((t * Math.PI * 2) / 9)) / 2) * 7;
      const sinceFlutter = (now - flutterAt) / 1000;
      const flutter =
        sinceFlutter < 2 ? Math.exp(-3 * sinceFlutter) * Math.sin(sinceFlutter * 11) * 9 : 0;
      const turnStart = turnAt.current;
      const turn = turnStart === null ? 0 : turnCurve((now - turnStart) / pageTurnMs);
      if (turnStart !== null && now - turnStart > pageTurnMs) turnAt.current = null;

      write(pose, pose.scroll * 16 + breath + flutter + turn * 42);
      frame = requestAnimationFrame(tick);
    };

    const start = () => {
      cancelAnimationFrame(frame);
      last = performance.now();
      frame = requestAnimationFrame(tick);
    };
    const onVisibility = () => (document.hidden ? cancelAnimationFrame(frame) : start());
    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      pointer.x = event.clientX / window.innerWidth - 0.5;
      pointer.y = event.clientY / window.innerHeight - 0.5;
      pointer.at = performance.now();
    };
    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType === "touch") flutterAt = performance.now();
    };
    const onScroll = (event: Event) => {
      scrollTarget = Math.min(1, Math.max(0, scrollProgress(event.target)));
    };
    const onBlur = () => (pointer.at = -Infinity);

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerdown", onPointerDown, { passive: true });
    document.addEventListener("scroll", onScroll, { passive: true, capture: true });
    window.addEventListener("blur", onBlur);
    document.addEventListener("visibilitychange", onVisibility);
    start();

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("scroll", onScroll, { capture: true });
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", onVisibility);
      clear();
    };
  }, [sceneRef, reducedMotion, turnAt]);
}
