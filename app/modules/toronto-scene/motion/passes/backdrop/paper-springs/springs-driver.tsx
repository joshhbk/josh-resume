import { useEffect, useRef } from "react";

import type { PassProps } from "../../../motion-types";
import { bodies } from "./bodies";
import { soft, SpringWorld, type BodyState } from "./spring-world";

const artWidth = 1536;
const artHeight = 1024;
const step = 1 / 120;

type Mount = { body: BodyState; elements: SVGElement[]; last: string };

function layerElements(scene: HTMLElement, layers: readonly string[]): SVGElement[] {
  return layers.flatMap((layer) => [
    ...scene.querySelectorAll<SVGElement>(`[data-scene-layer="${layer}"]`),
  ]);
}

function sheetStyle({ spec, x, y, lean, squash }: BodyState): string {
  const { limits } = spec;
  const tx = soft(x.p, limits.x).toFixed(2);
  const ty = soft(y.p, limits.y).toFixed(2);
  if (spec.write === "translate") return `${tx}px ${ty}px`;
  const tip = spec.lean ? soft(lean.p, limits.lean ?? 0.1) : 0;
  const stretch = spec.squash ? soft(squash.p, limits.squash ?? 0.05) : 0;
  const skew = ((-Math.atan(tip) * 180) / Math.PI).toFixed(3);
  // Stretching tall narrows the sheet a little, like paper holding its area.
  const sx = (1 - stretch * 0.4).toFixed(4);
  const sy = (1 + stretch).toFixed(4);
  return `translate(${tx}px, ${ty}px) skewX(${skew}deg) scale(${sx}, ${sy})`;
}

function writeSheet(mount: Mount): void {
  const style = sheetStyle(mount.body);
  if (style === mount.last) return;
  mount.last = style;
  for (const element of mount.elements) {
    if (mount.body.spec.write === "translate") element.style.translate = style;
    else element.style.transform = style;
  }
}

function clearSheet(mount: Mount): void {
  for (const element of mount.elements) {
    element.style.removeProperty("translate");
    element.style.removeProperty("transform");
    element.style.removeProperty("transform-origin");
    element.style.removeProperty("transform-box");
  }
}

type FxElements = {
  rings: SVGGElement[];
  ripples: SVGEllipseElement[];
  thread: SVGLineElement | null;
  pin: SVGCircleElement | null;
};

function setAttributes(element: Element, values: Record<string, number>): void {
  for (const [name, value] of Object.entries(values)) {
    element.setAttribute(name, value.toFixed(1));
  }
}

/** Draws the shockwave creases, lake splashes and the pluck thread from the world state. */
function drawFx(world: SpringWorld, fx: FxElements): void {
  const t = world.time;
  const rings = world.waves.filter((wave) => !wave.silent);
  fx.rings.forEach((ring, index) => {
    const wave = rings[rings.length - 1 - index];
    if (!wave) {
      if (ring.style.opacity !== "0") ring.style.opacity = "0";
      return;
    }
    const radius = (t - wave.born) * 1500;
    const fade = Math.max(0, 1 - radius / 1700) ** 1.6 * Math.min(1, wave.strength);
    ring.style.opacity = fade.toFixed(3);
    const [crease, shade] = ring.children;
    if (crease) setAttributes(crease, { cx: wave.x, cy: wave.y, r: radius });
    if (shade) setAttributes(shade, { cx: wave.x, cy: wave.y + 3, r: radius + 4 });
  });
  fx.ripples.forEach((ellipse, index) => {
    const ripple = world.ripples[world.ripples.length - 1 - index];
    if (!ripple) {
      if (ellipse.style.opacity !== "0") ellipse.style.opacity = "0";
      return;
    }
    const age = Math.min(1, (t - ripple.born) / 1.6);
    const ease = 1 - (1 - age) ** 3;
    const rx = (8 + 86 * ease) * (0.6 + ripple.size * 0.4);
    setAttributes(ellipse, { cx: ripple.x, cy: ripple.y, rx, ry: rx * 0.17 });
    ellipse.style.opacity = ((1 - age) * 0.85 * ripple.size).toFixed(3);
  });
  const point = world.pluckPoint();
  const pluck = world.pluck;
  if (fx.thread && fx.pin) {
    if (!point || !pluck) {
      if (fx.thread.style.opacity !== "0") {
        fx.thread.style.opacity = "0";
        fx.pin.style.opacity = "0";
      }
      return;
    }
    setAttributes(fx.thread, { x1: point.x, y1: point.y, x2: pluck.toX, y2: pluck.toY });
    setAttributes(fx.pin, { cx: point.x, cy: point.y });
    fx.thread.style.opacity = "1";
    fx.pin.style.opacity = "1";
  }
}

/** Page content people use or read: pressing on it must never shake or grab the scene. */
const pageContent = [
  "a",
  "button",
  "input",
  "select",
  "textarea",
  "label",
  "summary",
  '[role="button"]',
  "[contenteditable]",
  "p",
  "li",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "dd",
  "dt",
  "td",
  "th",
  "blockquote",
  "figcaption",
  "pre",
  "code",
  '[aria-label="Motion lab"]',
].join(",");

/** Whether a press landed on empty background (the page shell or a layout's open space). */
function onBackground(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return true;
  return target.closest(pageContent) === null;
}

function selecting(): boolean {
  const selection = typeof window.getSelection === "function" ? window.getSelection() : null;
  return selection !== null && !selection.isCollapsed && selection.toString().length > 0;
}

function canHover(): boolean {
  return typeof window.matchMedia === "function" && window.matchMedia("(hover: hover)").matches;
}

/**
 * The spring simulation: one rAF loop steps the physics at a fixed 120 Hz and writes each
 * sheet's transform directly (no React renders per frame). Pointer, taps, scroll and idle gusts
 * feed forces in; the loop stops while the tab is hidden.
 */
function LiveSprings({ sceneRef, phase, weather, intensity, depth }: PassProps) {
  const worldRef = useRef<SpringWorld | null>(null);
  const weatherRef = useRef(weather);
  const lastPhase = useRef(phase);
  const lastWeather = useRef(weather);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    const world = new SpringWorld();
    worldRef.current = world;

    const mounts: Mount[] = world.bodies.map((body) => {
      const elements = layerElements(scene, body.spec.layers);
      if (body.spec.write === "transform") {
        for (const element of elements) {
          element.style.transformBox = "view-box";
          element.style.transformOrigin = `${body.spec.origin[0]}px ${body.spec.origin[1]}px`;
        }
      }
      return { body, elements, last: "" };
    });
    const fx: FxElements = {
      rings: [...scene.querySelectorAll<SVGGElement>("[data-springs-ring]")],
      ripples: [...scene.querySelectorAll<SVGEllipseElement>("[data-springs-ripple]")],
      thread: scene.querySelector<SVGLineElement>("[data-springs-thread]"),
      pin: scene.querySelector<SVGCircleElement>("[data-springs-pin]"),
    };

    let rect = scene.getBoundingClientRect();
    let scale = Math.max(rect.width / artWidth, rect.height / artHeight) || 1;
    let offsetX = (rect.width - artWidth * scale) / 2;
    const measure = () => {
      rect = scene.getBoundingClientRect();
      scale = Math.max(rect.width / artWidth, rect.height / artHeight) || 1;
      offsetX = (rect.width - artWidth * scale) / 2;
    };
    const toArt = (clientX: number, clientY: number) => ({
      x: (clientX - rect.left - offsetX) / scale,
      y: (clientY - rect.top) / scale,
    });

    const hover = canHover();
    let lastMove = -Infinity;
    let lastEvent = 0;
    let press: { x: number; y: number; at: number; art: { x: number; y: number } } | null = null;

    const onMove = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      const art = toArt(event.clientX, event.clientY);
      const { cursor } = world;
      const dt = (event.timeStamp - lastEvent) / 1000;
      if (cursor.active && dt > 0.001 && dt < 0.1) {
        cursor.vx = cursor.vx * 0.5 + ((art.x - cursor.x) / dt) * 0.5;
        cursor.vy = cursor.vy * 0.5 + ((art.y - cursor.y) / dt) * 0.5;
      }
      lastEvent = event.timeStamp;
      cursor.x = art.x;
      cursor.y = art.y;
      cursor.active = true;
      world.aim.x = event.clientX / window.innerWidth - 0.5;
      world.aim.y = event.clientY / window.innerHeight - 0.5;
      if (world.pluck && selecting()) {
        // The visitor is selecting text: let go quietly, and don't count this press as a tap.
        world.pluck = null;
        press = null;
      }
      if (world.pluck) {
        world.pluck.toX = art.x;
        world.pluck.toY = art.y;
      }
      lastMove = performance.now();
    };
    const onDown = (event: PointerEvent) => {
      if (event.button !== 0 || !onBackground(event.target)) return;
      const art = toArt(event.clientX, event.clientY);
      press = { x: event.clientX, y: event.clientY, at: event.timeStamp, art };
      if (event.pointerType !== "touch") world.grab(art.x, art.y);
    };
    const onUp = (event: PointerEvent) => {
      if (!press) return;
      const tap =
        Math.hypot(event.clientX - press.x, event.clientY - press.y) < 10 &&
        event.timeStamp - press.at < 450;
      if (tap && !selecting()) {
        world.pluck = null;
        world.shockwave(press.art.x, press.art.y);
      } else {
        world.release();
      }
      press = null;
    };
    const onCancel = () => {
      press = null;
      world.release();
    };
    const onLeave = (event: PointerEvent) => {
      if (event.relatedTarget === null) world.cursor.active = false;
    };
    const onBlur = () => {
      world.cursor.active = false;
      world.release();
    };
    const scrollPositions = new WeakMap<EventTarget, number>();
    const onScroll = (event: Event) => {
      const target = event.target;
      if (!target) return;
      const position = target instanceof Element ? target.scrollTop : window.scrollY;
      const previous = scrollPositions.get(target);
      scrollPositions.set(target, position);
      if (previous !== undefined) world.kick(position - previous);
    };

    let frame = 0;
    let last = 0;
    let nextGust = 2.5;
    let gustSide: 1 | -1 = 1;
    const tick = (now: number) => {
      const dt = Math.min(0.05, last ? (now - last) / 1000 : step);
      last = now;
      const steps = Math.max(1, Math.round(dt / step));
      for (let index = 0; index < steps; index++) world.step(dt / steps);

      const idle = !hover || now - lastMove > 4000;
      if (world.time > nextGust) {
        const stormy = weatherRef.current === "rain" || weatherRef.current === "snow";
        if (idle || stormy) {
          const dir: 1 | -1 = Math.abs(world.wind) > 0.08 ? (world.wind > 0 ? 1 : -1) : gustSide;
          gustSide = gustSide > 0 ? -1 : 1;
          world.gust(dir, (stormy ? 1.2 : 0.8) + Math.random() * 0.5);
        }
        nextGust = world.time + (stormy ? 4 : 6.5) + Math.random() * 4;
      }

      for (const mount of mounts) writeSheet(mount);
      drawFx(world, fx);
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
    window.addEventListener("pointerup", onUp, { passive: true });
    window.addEventListener("pointercancel", onCancel, { passive: true });
    window.addEventListener("pointerout", onLeave, { passive: true });
    window.addEventListener("blur", onBlur);
    window.addEventListener("scroll", onScroll, { passive: true, capture: true });
    window.addEventListener("resize", measure, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);
    start();

    return () => {
      stop();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
      window.removeEventListener("pointerout", onLeave);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("scroll", onScroll, { capture: true });
      window.removeEventListener("resize", measure);
      document.removeEventListener("visibilitychange", onVisibility);
      for (const mount of mounts) clearSheet(mount);
      worldRef.current = null;
    };
  }, [sceneRef]);

  useEffect(() => {
    if (worldRef.current) worldRef.current.wind = intensity.wind;
  }, [intensity.wind]);

  useEffect(() => {
    if (worldRef.current) worldRef.current.parallax = depth.parallax;
  }, [depth.parallax]);

  // A change of light bumps the table from below: the whole diorama hops and settles.
  useEffect(() => {
    if (lastPhase.current === phase) return;
    lastPhase.current = phase;
    worldRef.current?.shockwave(768, 1320, 1.25, true);
  }, [phase]);

  // A change of weather arrives as a gust sweeping across the city.
  useEffect(() => {
    weatherRef.current = weather;
    if (lastWeather.current === weather) return;
    lastWeather.current = weather;
    const world = worldRef.current;
    if (world) world.gust(world.wind < -0.05 ? -1 : 1, 1.7);
  }, [weather]);

  return null;
}

const stillLean: Record<string, number> = { tower: 0.05, trees: 0.03, "buildings-center": 0.012 };

/**
 * Reduced motion: no springs and no input. The sheets stay put, with the tall ones leaning a
 * touch into the live wind, as though the diorama were photographed mid-breeze.
 */
function StillPose({ sceneRef, intensity }: PassProps) {
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    const posed = bodies.flatMap((spec) => {
      const lean = (stillLean[spec.id] ?? 0) * intensity.wind;
      if (lean === 0) return [];
      const skew = (-Math.atan(lean) * 180) / Math.PI;
      return layerElements(scene, spec.layers).map((element) => {
        element.style.transformBox = "view-box";
        element.style.transformOrigin = `${spec.origin[0]}px ${spec.origin[1]}px`;
        element.style.transform = `skewX(${skew.toFixed(3)}deg)`;
        return element;
      });
    });
    return () => {
      for (const element of posed) {
        element.style.removeProperty("transform");
        element.style.removeProperty("transform-origin");
        element.style.removeProperty("transform-box");
      }
    };
  }, [sceneRef, intensity.wind]);

  return null;
}

export function SpringsDriver(props: PassProps) {
  return props.reducedMotion ? <StillPose {...props} /> : <LiveSprings {...props} />;
}
