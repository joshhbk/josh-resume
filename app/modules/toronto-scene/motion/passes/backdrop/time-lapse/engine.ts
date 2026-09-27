import { arcPath, clockLabel, lightAt, moonAt, rgb, sunAt, wrapHour, type Body } from "./clock";

/** Stars of the artwork's night sky (see `toronto-skyline-art.tsx`), for their trails. */
const stars = [
  [120, 105],
  [295, 157],
  [460, 80],
  [610, 199],
  [915, 108],
  [1050, 235],
  [1392, 112],
  [1460, 300],
  [240, 254],
  [1002, 156],
  [1323, 336],
] as const;

/** The celestial pole the stars wheel around: above the city, off the top of the paper. */
export const starPole = { x: 780, y: -260 } as const;

/** The real sky turns 15° an hour; the paper one turns slower so the stars stay on the page. */
const degreesPerHour = 6;
/** The hour the artwork's star field is drawn for. */
const starHour = 1;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

type Tween = { from: number; to: number; start: number; duration: number };

export type TimeLapseOptions = {
  reducedMotion: boolean;
  anchor: number;
  cloud: number;
};

export type TimeLapse = {
  /** Moves the "real" hour; in motion it fast-forwards there, reduced motion snaps. */
  setAnchor: (hour: number) => void;
  setCloud: (cloud: number) => void;
  destroy: () => void;
};

function mixShadow(night: number, alphaDay: number, alphaNight: number): string {
  return rgb(
    [34 + (2 - 34) * night, 43 + (10 - 43) * night, 47 + (24 - 47) * night],
    alphaDay + (alphaNight - alphaDay) * night,
  );
}

/** The scroller that last moved, as 0–1 progress plus its scrollable range in pixels. */
function readScroll(target: EventTarget | null): { top: number; range: number } {
  const element =
    target instanceof Element ? target : (document.scrollingElement ?? document.documentElement);
  return {
    top: element.scrollTop,
    range: Math.max(0, element.scrollHeight - element.clientHeight),
  };
}

/** Drives the scroll-scrubbed day over the scene root and the pass's own SVG/HTML parts. */
export function createTimeLapse(scene: HTMLElement, options: TimeLapseOptions): TimeLapse {
  const { reducedMotion } = options;
  const find = <T extends Element>(name: string) =>
    scene.querySelector<T>(`[data-time-lapse="${name}"]`);
  const shadowCasts = [...scene.querySelectorAll<SVGGElement>('[data-time-lapse="cast"]')];
  const shadowGroup = find<SVGGElement>("shadows");
  const sunTrail = find<SVGPathElement>("sun-trail");
  const moonTrail = find<SVGPathElement>("moon-trail");
  const starTrails = find<SVGPathElement>("star-trails");
  const timecode = find<HTMLElement>("timecode");
  const timecodeClock = find<HTMLElement>("timecode-clock");
  const timecodeRate = find<HTMLElement>("timecode-rate");

  let anchor = options.anchor;
  /** Where the clouds' time-lapse sway is centred. */
  const reference = options.anchor;
  let cloud = options.cloud;
  let tween: Tween | null = null;
  let scrollHours = 0;
  let pointerTarget = 0;
  let pointerHours = 0;
  let shortPage = false;
  let driftStart = performance.now();

  let hour = anchor;
  let velocity = 0;
  let sunExposure = hour;
  let starExposure = hour;
  let lastFrame = 0;
  let lastApply = 0;
  let frame = 0;
  const written = new Map<string, string>();

  const setVar = (name: string, value: string) => {
    if (written.get(name) === value) return;
    written.set(name, value);
    scene.style.setProperty(name, value);
  };
  const setAttr = (element: Element | null, name: string, value: string) => {
    if (element && element.getAttribute(name) !== value) element.setAttribute(name, value);
  };

  const measureScroll = (target: EventTarget | null = null) => {
    const { top, range } = readScroll(target);
    // A long page walks through a whole day; a short one only part of it.
    scrollHours = (top * 24) / Math.max(range, 2400);
    shortPage = range < window.innerHeight * 0.6;
  };

  const baseHour = (now: number) => {
    if (!tween) return anchor;
    const t = clamp((now - tween.start) / tween.duration, 0, 1);
    if (t >= 1) {
      tween = null;
      return anchor;
    }
    return tween.from + (tween.to - tween.from) * easeInOut(t);
  };

  const driftHours = (now: number) => {
    if (reducedMotion || !shortPage) return 0;
    // Pages that can hardly scroll let the clock wander most of a day either side of now,
    // lingering at the extremes like a slow pendulum.
    const elapsed = (now - driftStart) / 1000;
    const ramp = clamp((elapsed - 2.5) / 6, 0, 1);
    return ramp * 9 * Math.sin((elapsed * Math.PI * 2) / 140);
  };

  const replaced = () => scene.getAttribute("data-fx-replaces") ?? "";

  const drawTrail = (
    path: SVGPathElement | null,
    from: number,
    to: number,
    body: (h: number) => Body,
    visible: boolean,
  ) => {
    if (!path) return;
    const length = Math.abs(to - from);
    if (!visible || length < 0.04) {
      setAttr(path, "d", "");
      return;
    }
    setAttr(path, "d", arcPath(from, to, body));
    setAttr(path, "opacity", clamp(length * 0.45, 0, 0.55).toFixed(2));
  };

  const drawStarTrails = (degrees: number, opacity: number) => {
    if (!starTrails) return;
    if (Math.abs(degrees) < 0.6 || opacity < 0.02) {
      setAttr(starTrails, "d", "");
      return;
    }
    const radians = (clamp(degrees, -170, 170) * Math.PI) / 180;
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    const arcs = stars.map(([x, y]) => {
      const dx = x - starPole.x;
      const dy = y - starPole.y;
      const radius = Math.hypot(dx, dy);
      const startX = starPole.x + dx * cos - dy * sin;
      const startY = starPole.y + dx * sin + dy * cos;
      const sweep = radians > 0 ? 0 : 1;
      return `M${startX.toFixed(1)} ${startY.toFixed(1)}A${radius.toFixed(1)} ${radius.toFixed(1)} 0 0 ${sweep} ${x} ${y}`;
    });
    setAttr(starTrails, "d", arcs.join(""));
    setAttr(starTrails, "opacity", (opacity * clamp(Math.abs(degrees) / 30, 0.3, 1)).toFixed(2));
  };

  const apply = (now: number) => {
    const light = lightAt(hour);
    const sun = sunAt(hour);
    const moon = moonAt(hour);
    const sunUp = clamp(sun.elevation * 3.2, 0, 1);
    const moonUp = clamp(moon.elevation * 3.2, 0, 1) * clamp(light.night * 1.4, 0, 1);
    const speed = Math.abs(velocity);
    // A time-lapse camera never quite holds exposure: it flickers when it runs fast.
    const flicker =
      reducedMotion || speed < 2 ? 0 : (Math.random() - 0.5) * 0.06 * clamp(speed / 6, 0, 1);

    setVar("--tl-night", light.night.toFixed(3));
    setVar("--tl-warm", light.warm.toFixed(3));
    setVar("--tl-bright", (light.brightness + flicker).toFixed(3));
    setVar("--tl-wash-opacity", light.washOpacity.toFixed(3));
    setVar("--scene-sky-wash", rgb(light.wash));
    setVar("--scene-backdrop", rgb(light.backdrop));
    setVar("--scene-backdrop-light", rgb(light.backdropLight));
    setVar("--paper-shadow", mixShadow(light.night, 0.36, 0.66));
    setVar("--paper-shadow-deep", mixShadow(light.night, 0.48, 0.78));

    // The built-in sun and moon ride their arcs.
    setVar("--tl-sun-x", `${(sun.x - 1250).toFixed(1)}px`);
    setVar("--tl-sun-y", `${(sun.y - 240).toFixed(1)}px`);
    setVar("--tl-sun-opacity", (sunUp * 0.78).toFixed(2));
    setVar("--tl-sun-low", `${Math.round((1 - clamp(sun.elevation, 0, 1)) * 70)}%`);
    setVar("--tl-moon-x", `${(moon.x - 965).toFixed(1)}px`);
    setVar("--tl-moon-y", `${(moon.y - 240).toFixed(1)}px`);
    setVar("--tl-moon-opacity", (moonUp * 0.88).toFixed(2));
    setVar("--tl-star-opacity", (clamp((light.night - 0.35) / 0.65, 0, 1) * 0.8).toFixed(2));
    setVar(
      "--tl-star-turn",
      `${(-(wrapHour(hour - starHour + 12) - 12) * degreesPerHour).toFixed(2)}deg`,
    );

    // Clouds race in a time-lapse and smear when it runs fast.
    const cloudShift = (Math.sin((hour - reference) * 0.55) + 1) * 36;
    setVar("--tl-cloud-x", `${cloudShift.toFixed(1)}px`);
    setVar("--tl-cloud-stretch", (1 + clamp(speed * 0.012, 0, 0.18)).toFixed(3));

    // Shadows fall away from whichever light is up, longer when it is low.
    const source = sunUp >= moonUp ? sun : moon;
    const strength = Math.max(sunUp, moonUp * 0.5) * (1 - cloud * 0.45);
    const across = clamp((source.x - 768) / 648, -1, 1);
    const height = clamp(source.elevation, 0, 1);
    const reach = 16 + (1 - height) * 78;
    const castX = -across * reach;
    const castY = 5 + height * 12;
    for (const cast of shadowCasts) {
      const step = Number(cast.dataset.step ?? 1);
      setAttr(
        cast,
        "transform",
        `translate(${(castX * step).toFixed(1)} ${(castY * step).toFixed(1)})`,
      );
    }
    setAttr(shadowGroup, "opacity", (strength * 0.95).toFixed(2));
    setVar(
      "--tl-shadow-x",
      `${Math.round(-across * (2 + (1 - height) * 11) * Math.max(strength, 0.25))}px`,
    );
    setVar("--tl-shadow-y", (0.55 + height * 0.6).toFixed(2));

    // Dolly zoom: the sky pushes in while the city pulls back, harder the faster time runs.
    const zoom = reducedMotion ? 0 : clamp(velocity * 0.0055, -0.05, 0.05);
    setVar("--tl-sky-scale", (1 + zoom).toFixed(4));
    setVar("--tl-land-scale", (1 - zoom * 0.45).toFixed(4));
    setVar("--tl-water-scale", (1 - zoom * 0.6).toFixed(4));

    // Long-exposure trails.
    const fx = replaced();
    if (reducedMotion) {
      // One still frame: the day so far, burned into the paper.
      drawTrail(
        sunTrail,
        5.8,
        clamp(wrapHour(hour), 5.8, 20.6),
        sunAt,
        sunUp > 0 && !fx.includes("sun"),
      );
      drawStarTrails(28, fx.includes("stars") ? 0 : clamp((light.night - 0.35) / 0.65, 0, 1) * 0.5);
      setAttr(moonTrail, "d", "");
    } else {
      drawTrail(sunTrail, sunExposure, hour, sunAt, sunUp > 0 && !fx.includes("sun"));
      drawTrail(moonTrail, sunExposure, hour, moonAt, moonUp > 0 && !fx.includes("moon"));
      const starOpacity = fx.includes("stars")
        ? 0
        : clamp((light.night - 0.35) / 0.65, 0, 1) * 0.55;
      drawStarTrails((hour - starExposure) * degreesPerHour, starOpacity);
    }

    // The timecode tag.
    const live = !tween && Math.abs(hour - anchor) < 0.05 && speed < 0.05;
    if (timecode) setAttr(timecode, "data-state", live ? "live" : speed > 0.2 ? "running" : "held");
    if (timecodeClock) {
      const label = clockLabel(hour);
      if (timecodeClock.textContent !== label) timecodeClock.textContent = label;
    }
    if (timecodeRate) {
      const rate = live ? "live" : speed > 0.2 ? `×${Math.round(speed * 3600)}` : "held";
      if (timecodeRate.textContent !== rate) timecodeRate.textContent = rate;
    }
    lastApply = now;
  };

  const tick = (now: number) => {
    frame = 0;
    const dt = lastFrame ? clamp((now - lastFrame) / 1000, 0.001, 0.1) : 1 / 60;
    lastFrame = now;
    pointerHours += (pointerTarget - pointerHours) * (1 - Math.exp(-dt * 3));
    const target = baseHour(now) + scrollHours + pointerHours + driftHours(now);
    const previous = hour;
    // A little inertia makes the scrub feel like a jog wheel rather than a slider.
    hour += (target - hour) * (1 - Math.exp(-dt * 7));
    velocity += ((hour - previous) / dt - velocity) * (1 - Math.exp(-dt * 10));
    sunExposure += (hour - sunExposure) * (1 - Math.exp(-dt * 2.2));
    starExposure += (hour - starExposure) * (1 - Math.exp(-dt * 1.6));

    // Frames land at up to 24fps (a film cadence): the light and shadows repaint whole sheets.
    if (now - lastApply >= 40) apply(now);

    const settled =
      !tween &&
      !(shortPage && !reducedMotion) &&
      Math.abs(target - hour) < 0.002 &&
      Math.abs(velocity) < 0.01 &&
      Math.abs(hour - sunExposure) < 0.01 &&
      Math.abs(hour - starExposure) < 0.01 &&
      Math.abs(pointerTarget - pointerHours) < 0.002;
    if (settled) {
      velocity = 0;
      sunExposure = hour;
      starExposure = hour;
      apply(now);
      lastFrame = 0;
    } else {
      schedule();
    }
  };

  const schedule = () => {
    if (frame || document.hidden) return;
    frame = requestAnimationFrame(tick);
  };

  const snap = () => {
    // Reduced motion: the frame simply follows scroll, with no inertia or streaks.
    frame = 0;
    hour = anchor + scrollHours;
    velocity = 0;
    sunExposure = hour;
    starExposure = hour;
    apply(performance.now());
  };
  const request = reducedMotion
    ? () => {
        if (!frame) frame = requestAnimationFrame(snap);
      }
    : schedule;

  const onScroll = (event: Event) => {
    measureScroll(event.target === document ? null : event.target);
    request();
  };
  const onResize = () => {
    measureScroll();
    request();
  };
  const onPointer = (event: PointerEvent) => {
    if (reducedMotion || event.pointerType === "touch") return;
    // The cursor is a jog wheel: a few hours either way, wider when scrolling can't scrub.
    pointerTarget = (event.clientX / window.innerWidth - 0.5) * (shortPage ? 9 : 5);
    schedule();
  };
  const onVisibility = () => {
    if (document.hidden) {
      cancelAnimationFrame(frame);
      frame = 0;
      lastFrame = 0;
    } else {
      request();
    }
  };

  measureScroll();
  hour = anchor + scrollHours;
  sunExposure = hour;
  starExposure = hour;
  apply(performance.now());
  request();

  window.addEventListener("scroll", onScroll, { capture: true, passive: true });
  window.addEventListener("resize", onResize);
  window.addEventListener("pointermove", onPointer, { passive: true });
  document.addEventListener("visibilitychange", onVisibility);

  return {
    setAnchor(next) {
      if (Math.abs(wrapHour(next) - wrapHour(anchor)) < 0.01) return;
      if (reducedMotion) {
        anchor = next;
        request();
        return;
      }
      // Time only runs forwards: switching phase fast-forwards the clock to the new hour.
      const now = performance.now();
      const from = baseHour(now);
      let to = next;
      while (to <= from) to += 24;
      tween = { from, to, start: now, duration: 1500 + (to - from) * 45 };
      anchor = to;
      driftStart = now;
      schedule();
    },
    setCloud(next) {
      cloud = next;
      request();
    },
    destroy() {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll, { capture: true });
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onPointer);
      document.removeEventListener("visibilitychange", onVisibility);
      for (const name of written.keys()) scene.style.removeProperty(name);
    },
  };
}
