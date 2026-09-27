/**
 * The fly loft: hangs props on threads from pivots above the frame and swings them. Each rig
 * is a pendulum (wind, gusts, pokes) on a winch (lowered in with an elastic overshoot, hauled
 * out on a cue); spinning props twist on their string and show their cardboard backs.
 * The rig DOM is built here and only transforms are written per frame.
 */
import {
  cardboardSun,
  cottonBall,
  feltCloud,
  glassBead,
  paperStar,
  tinfoilMoon,
  type Palette,
  type Prop,
} from "./props";
import { seeded } from "./random";
import { pivotY, type RigSpec } from "./stage-plan";
import styles from "./strings-attached.module.css";

const svgNS = "http://www.w3.org/2000/svg";
const gravity = 1500;

type Face = { front: SVGGElement; back: SVGGElement; showing: "front" | "back" };
type Skin = { image: SVGImageElement; prop: (palette: Palette) => Prop | null };

type Rig = {
  spec: RigSpec;
  outer: SVGGElement;
  body: SVGGElement;
  shape: SVGGElement;
  skins: Skin[];
  face: Face | null;
  /** Length of the prop below its hook. */
  height: number;
  width: number;
  scale: number;
  sway: number;
  angle: number;
  spin: number;
  lift: number;
  liftVelocity: number;
  winch: number;
  winchVelocity: number;
  twist: number;
  twistVelocity: number;
  squash: number;
  state: "waiting" | "lowering" | "hanging" | "hauling";
  wait: number;
  phase: number;
};

function element<K extends keyof SVGElementTagNameMap>(
  name: K,
  attributes: Record<string, string | number>,
  className?: string,
): SVGElementTagNameMap[K] {
  const node = document.createElementNS(svgNS, name);
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, String(value));
  if (className) node.setAttribute("class", className);
  return node;
}

function skin(
  parent: SVGGElement,
  make: (palette: Palette) => Prop | null,
  palette: Palette,
  x: number,
  y: number,
  scale: number,
  skins: Skin[],
): Prop | null {
  const prop = make(palette);
  const width = (prop?.width ?? 0) * scale;
  const height = (prop?.height ?? 0) * scale;
  const hook = prop?.hooks[0] ?? [0, 0];
  const image = element("image", {
    href: prop?.url ?? "",
    width,
    height,
    x: x - hook[0] * scale,
    y: y - hook[1] * scale,
  });
  parent.append(image);
  skins.push({ image, prop: make });
  return prop;
}

const threadClass = (spec: RigSpec) =>
  spec.kind === "cotton"
    ? styles.fishingLine
    : spec.kind === "strand"
      ? styles.beadThread
      : styles.thread;

/** Builds a rig's DOM. The body's origin is the hook; everything hangs below it. */
function build(spec: RigSpec, palette: Palette): Rig {
  const scale = 0.7 + spec.depth * 0.36;
  const outer = element("g", { "data-rig": spec.kind }, styles.rig);
  const body = element("g", {});
  const shape = element("g", {});
  const skins: Skin[] = [];
  let face: Face | null = null;
  let height = 0;
  let width = 20;
  let sway = 0.22;

  body.append(element("line", { x1: 0, y1: -2600, x2: 0, y2: 0 }, threadClass(spec)));
  body.append(shape);
  outer.append(body);
  outer.style.setProperty("--depth", spec.depth.toFixed(2));

  switch (spec.kind) {
    case "cloud": {
      const make = (p: Palette) => feltCloud(spec.tone, p, spec.variant);
      const prop = make(palette);
      const bridle = 26 * scale;
      if (prop) {
        const [left, right] = prop.hooks;
        const image = element("image", {
          href: prop.url,
          width: prop.width * scale,
          height: prop.height * scale,
          x: (-prop.width / 2) * scale,
          y: bridle - Math.min(left?.[1] ?? 0, right?.[1] ?? 0) * scale,
        });
        const imageY = Number(image.getAttribute("y"));
        const ends = [left, right].map((hook) =>
          hook ? `M0 0L${(hook[0] - prop.width / 2) * scale} ${imageY + hook[1] * scale}` : "",
        );
        shape.append(element("path", { d: ends.join("") }, styles.thread));
        shape.append(element("circle", { cx: 0, cy: 0, r: 2.2 * scale }, styles.ring));
        shape.append(image);
        skins.push({ image, prop: make });
        height = imageY + prop.height * scale;
        width = prop.width * scale * 0.86;
      }
      sway = 0.12;
      break;
    }
    case "strand": {
      const spacing = 13.5 * scale;
      for (let index = 0; index < spec.beads; index++) {
        skin(shape, (p) => glassBead(p), palette, 0, index * spacing, scale, skins);
      }
      skin(shape, (p) => glassBead(p, true), palette, 0, spec.beads * spacing, scale, skins);
      shape.append(
        element("line", { x1: 0, y1: 0, x2: 0, y2: spec.beads * spacing }, styles.beadThread),
      );
      // A couple of beads catch the light.
      const random = seeded(spec.seed);
      for (let index = 0; index < 2; index++) {
        const y = Math.floor(random() * spec.beads) * spacing + 3 * scale;
        const glint = element("path", { d: `M-2 ${y - 4.5}v6M-5 ${y - 1.5}h6` }, styles.glint);
        glint.style.animationDelay = `${(-random() * 6).toFixed(2)}s`;
        glint.style.animationDuration = `${(3.5 + random() * 4).toFixed(2)}s`;
        shape.append(glint);
      }
      height = (spec.beads + 1.6) * spacing;
      sway = 0.26;
      break;
    }
    case "cotton": {
      const random = seeded(spec.seed);
      for (let index = 0; index < spec.balls; index++) {
        const variant = Math.floor(random() * 4);
        skin(
          shape,
          (p) => cottonBall(p, variant),
          palette,
          0,
          index * spec.spacing * scale,
          scale,
          skins,
        );
      }
      height = (spec.balls - 1) * spec.spacing * scale + 12;
      sway = 0.3;
      break;
    }
    case "sun":
    case "moon":
    case "star": {
      const front = element("g", {});
      const back = element("g", { display: "none" });
      const makeFront =
        spec.kind === "sun"
          ? (p: Palette) => cardboardSun(p, false)
          : spec.kind === "moon"
            ? () => tinfoilMoon(false)
            : () => paperStar(false);
      const makeBack =
        spec.kind === "sun"
          ? (p: Palette) => cardboardSun(p, true)
          : spec.kind === "moon"
            ? () => tinfoilMoon(true)
            : () => paperStar(true);
      const size = spec.kind === "star" ? scale : spec.kind === "sun" ? 1.2 : 1.05;
      const prop = skin(front, makeFront, palette, 0, 0, size, skins);
      skin(back, makeBack, palette, 0, 0, size, skins);
      shape.append(front, back);
      face = { front, back, showing: "front" };
      height = (prop?.height ?? 30) * size;
      sway = spec.kind === "star" ? 0.2 : 0.07;
      break;
    }
  }

  const random = seeded(spec.seed * 7 + 1);
  return {
    spec,
    outer,
    body,
    shape,
    skins,
    face,
    height,
    width,
    scale,
    sway,
    angle: 0,
    spin: 0,
    lift: 0,
    liftVelocity: 0,
    winch: 0,
    winchVelocity: 0,
    twist: spec.kind === "star" ? random() * Math.PI * 2 : 0,
    twistVelocity: spec.kind === "star" ? (random() - 0.5) * 2.4 : 0,
    squash: 0,
    state: "hanging",
    wait: 0,
    phase: random() * Math.PI * 2,
  };
}

/** How far a rig must be raised to be completely out of sight above the frame. */
const offstage = (rig: Rig) => -(pivotY + rig.spec.length + rig.height + 60);

export type Weathering = {
  /** -1 (blowing left) to 1 (blowing right). */
  wind: number;
  reducedMotion: boolean;
};

export class FlyLoft {
  private readonly rigs = new Map<string, Rig>();
  private readonly leaving = new Set<Rig>();
  private palette: Palette;
  private weathering: Weathering;
  private frame = 0;
  private last = 0;
  private time = 0;
  private pointer: { x: number; y: number; t: number } | null = null;

  constructor(
    private readonly container: SVGGElement,
    palette: Palette,
    weathering: Weathering,
  ) {
    this.palette = palette;
    this.weathering = weathering;
    window.addEventListener("pointermove", this.onPointerMove, { passive: true });
    window.addEventListener("scroll", this.onScroll, { passive: true });
    document.addEventListener("visibilitychange", this.onVisibility);
  }

  destroy(): void {
    cancelAnimationFrame(this.frame);
    this.frame = 0;
    window.removeEventListener("pointermove", this.onPointerMove);
    window.removeEventListener("scroll", this.onScroll);
    document.removeEventListener("visibilitychange", this.onVisibility);
    this.container.replaceChildren();
    this.rigs.clear();
    this.leaving.clear();
  }

  setWeathering(weathering: Weathering): void {
    const wasReduced = this.weathering.reducedMotion;
    this.weathering = weathering;
    if (weathering.reducedMotion !== wasReduced) {
      for (const rig of this.leaving) rig.outer.remove();
      this.leaving.clear();
      for (const rig of this.rigs.values()) this.rest(rig);
    }
    if (weathering.reducedMotion) this.pose();
    else this.run();
  }

  /** Re-lights the props for a new time of day; hanging rigs get a jolt as the lights change. */
  setPalette(palette: Palette): void {
    if (palette === this.palette) return;
    this.palette = palette;
    for (const rig of [...this.rigs.values(), ...this.leaving]) {
      for (const { image, prop } of rig.skins) image.setAttribute("href", prop(palette)?.url ?? "");
      rig.spin += (Math.random() - 0.5) * 0.25;
    }
    if (this.weathering.reducedMotion) this.pose();
  }

  /**
   * The stagehand's cue: rigs no longer in the plot are hauled up out of the frame, new ones are
   * lowered in once the old ones have started up, back rows first. `cut` skips the show.
   */
  cue(specs: readonly RigSpec[], cut = false): void {
    const next = new Map(specs.map((spec) => [spec.key, spec]));
    const instant = cut || this.weathering.reducedMotion;
    let hauled = 0;
    for (const [key, rig] of this.rigs) {
      if (next.has(key)) continue;
      this.rigs.delete(key);
      if (instant) {
        rig.outer.remove();
        continue;
      }
      hauled++;
      rig.state = "waiting";
      rig.wait = rig.spec.order * 0.35 + Math.random() * 0.2;
      rig.winchVelocity = 0;
      this.leaving.add(rig);
    }
    const entrance = hauled > 0 ? 0.55 : 0.1;
    for (const spec of specs) {
      const existing = this.rigs.get(spec.key);
      if (existing) {
        // Same prop, new mark (a resize): it simply hangs from the new pivot.
        existing.spec = spec;
        continue;
      }
      const rig = build(spec, this.palette);
      this.rigs.set(spec.key, rig);
      this.insert(rig);
      if (instant) this.rest(rig);
      else {
        rig.state = "waiting";
        rig.wait = entrance + spec.order * 1.1;
        rig.lift = rig.winch = offstage(rig);
      }
      this.draw(rig);
    }
    if (this.weathering.reducedMotion) this.pose();
    else this.run();
  }

  private insert(rig: Rig) {
    const after = [...this.container.children].find(
      (child) => Number((child as SVGElement).style.getPropertyValue("--depth")) > rig.spec.depth,
    );
    this.container.insertBefore(rig.outer, after ?? null);
  }

  private lean(rig: Rig, time: number): number {
    const { wind } = this.weathering;
    // Gusts roll across the stage from one side, so neighbours swing out of step and collide.
    const travel = time * 0.45 - (rig.spec.x / 620) * Math.sign(wind || 1);
    const gust =
      Math.sin(travel + rig.phase * 0.2) * 0.6 +
      Math.sin(travel * 2.3 + 1.7) * 0.3 +
      Math.sin(time * 1.3 + rig.phase) * 0.1;
    const force = wind * 0.85 + gust * (0.14 + Math.abs(wind) * 0.55);
    return Math.atan(force * rig.sway * 3) * 0.9;
  }

  private rest(rig: Rig) {
    rig.state = "hanging";
    rig.lift = rig.winch = 0;
    rig.liftVelocity = rig.winchVelocity = 0;
    rig.angle = this.lean(rig, 0);
    rig.spin = 0;
    rig.squash = 0;
    if (rig.spec.kind !== "star") {
      rig.twist = 0;
      rig.twistVelocity = 0;
    }
  }

  private readonly onVisibility = () => {
    if (document.hidden) {
      cancelAnimationFrame(this.frame);
      this.frame = 0;
    } else this.run();
  };

  private readonly onPointerMove = (event: PointerEvent) => {
    const view = this.view();
    if (!view) return;
    const x = (event.clientX - view.left) / view.scale;
    const y = (event.clientY - view.top) / view.scale;
    const now = performance.now();
    const previous = this.pointer;
    this.pointer = { x, y, t: now };
    if (!previous || this.weathering.reducedMotion) return;
    const dt = Math.max(8, now - previous.t) / 1000;
    const velocity = Math.max(-2400, Math.min(2400, (x - previous.x) / dt));
    // The cursor is a draught: props it passes close to are pushed along with it.
    for (const rig of this.rigs.values()) {
      if (rig.state !== "hanging") continue;
      const reach = rig.spec.length + rig.lift;
      const bodyX = rig.spec.x + reach * Math.sin(rig.angle);
      const bodyY = pivotY + reach * Math.cos(rig.angle) + rig.height / 2;
      const distance = Math.hypot(bodyX - x, bodyY - y);
      const radius = 110 + rig.height * 0.5;
      if (distance > radius) continue;
      const push = (1 - distance / radius) * velocity * 0.00024;
      rig.spin += Math.max(-0.35, Math.min(0.35, push)) * (300 / Math.max(160, reach));
      if (rig.face) rig.twistVelocity += push * 6;
    }
  };

  private lastScroll = typeof window === "undefined" ? 0 : window.scrollY;
  private readonly onScroll = () => {
    const delta = window.scrollY - this.lastScroll;
    this.lastScroll = window.scrollY;
    if (this.weathering.reducedMotion) return;
    // Scrolling jostles the batten: everything bobs and swings a little.
    const jolt = Math.max(-1, Math.min(1, delta / 60));
    for (const rig of this.rigs.values()) {
      if (rig.state !== "hanging") continue;
      rig.liftVelocity += jolt * 90;
      rig.spin += jolt * 0.05 * (Math.random() + 0.5);
    }
  };

  private view(): { left: number; top: number; scale: number } | null {
    const svg = this.container.ownerSVGElement;
    if (!svg) return null;
    const bounds = svg.getBoundingClientRect();
    const scale = Math.max(bounds.width / 1536, bounds.height / 1024);
    if (!scale) return null;
    return { left: bounds.left + (bounds.width - 1536 * scale) / 2, top: bounds.top, scale };
  }

  private run() {
    if (this.frame || this.weathering.reducedMotion || typeof requestAnimationFrame !== "function")
      return;
    if (typeof document !== "undefined" && document.hidden) return;
    this.last = performance.now();
    this.frame = requestAnimationFrame(this.step);
  }

  private readonly step = (now: number) => {
    this.frame = requestAnimationFrame(this.step);
    const dt = Math.min(1 / 30, (now - this.last) / 1000);
    this.last = now;
    this.time += dt;
    for (const rig of this.rigs.values()) this.simulate(rig, dt);
    for (const rig of this.leaving) {
      this.simulate(rig, dt);
      if (rig.lift <= offstage(rig) - 40) {
        rig.outer.remove();
        this.leaving.delete(rig);
      }
    }
    this.collide();
    for (const rig of this.rigs.values()) this.draw(rig);
    for (const rig of this.leaving) this.draw(rig);
  };

  private simulate(rig: Rig, dt: number) {
    const leaving = this.leaving.has(rig);
    if (rig.state === "waiting") {
      rig.wait -= dt;
      if (rig.wait <= 0) {
        rig.state = leaving ? "hauling" : "lowering";
        // Taking up the slack sets it swinging.
        rig.spin += (Math.random() - 0.5) * (leaving ? 0.5 : 0.2);
      }
    }

    // The winch: lowered briskly and stopped dead, or hauled up hand over hand.
    if (rig.state === "lowering") {
      const distance = -rig.winch;
      const speed = Math.min(620, Math.sqrt(2 * 5200 * Math.max(0, distance)));
      rig.winch = Math.min(0, rig.winch + speed * dt);
      if (rig.winch >= 0) {
        rig.state = "hanging";
        rig.spin += (Math.random() - 0.5) * 0.6;
        if (rig.face)
          rig.twistVelocity +=
            (Math.random() < 0.5 ? -1 : 1) *
            (rig.spec.kind === "sun" ? 4.2 : rig.spec.kind === "moon" ? 2.2 : 3);
      }
    } else if (rig.state === "hauling") {
      rig.winchVelocity = Math.min(1100, rig.winchVelocity + 1400 * dt);
      rig.winch -= rig.winchVelocity * dt;
    } else if (rig.state === "hanging" && rig.spec.kind === "strand") {
      // Rain: the puppeteer dips each strand up and down, out of step with its neighbours.
      rig.winch = Math.sin(this.time * 1.6 + rig.phase) * rig.spec.bob * 0.5 + rig.spec.bob * 0.5;
    } else if (rig.state === "hanging") {
      rig.winch = Math.sin(this.time * 0.7 + rig.phase) * 3;
    }

    // Thread stretch: the prop follows the winch on a slightly elastic line.
    const stiffness = rig.spec.kind === "cloud" ? 60 : 110;
    const damping = rig.spec.kind === "cloud" ? 3.2 : 4.2;
    rig.liftVelocity += (stiffness * (rig.winch - rig.lift) - damping * rig.liftVelocity) * dt;
    rig.lift += rig.liftVelocity * dt;

    // The pendulum.
    const reach = Math.max(60, rig.spec.length + rig.lift + rig.height * 0.5);
    const omega2 = gravity / reach;
    const target = this.lean(rig, this.time);
    const drag = rig.spec.kind === "cloud" ? 0.7 : 0.38;
    rig.spin += (-omega2 * (rig.angle - target) - drag * rig.spin) * dt;
    rig.angle += rig.spin * dt;
    rig.angle = Math.max(-0.7, Math.min(0.7, rig.angle));

    // Twist on the string.
    if (rig.face) {
      const restoring = rig.spec.kind === "star" ? 0 : rig.spec.kind === "sun" ? 1.1 : 1.6;
      const torque =
        Math.sin(this.time * 0.9 + rig.phase * 3) * (rig.spec.kind === "star" ? 0.9 : 0.18);
      const friction = rig.spec.kind === "star" ? 0.28 : 0.55;
      rig.twistVelocity += (-restoring * rig.twist - friction * rig.twistVelocity + torque) * dt;
      if (rig.spec.kind === "star")
        rig.twistVelocity = Math.max(-2.6, Math.min(2.6, rig.twistVelocity));
      rig.twist += rig.twistVelocity * dt;
    }
    rig.squash *= Math.exp(-dt * 7);
  }

  /** Felt clouds hang close enough to bump; neighbours in a row trade their swing. */
  private collide() {
    const rows = new Map<number, Rig[]>();
    for (const rig of this.rigs.values()) {
      if (rig.spec.kind !== "cloud" || rig.state === "waiting") continue;
      const row = rows.get(rig.spec.depth) ?? [];
      row.push(rig);
      rows.set(rig.spec.depth, row);
    }
    for (const row of rows.values()) {
      row.sort((a, b) => a.spec.x - b.spec.x);
      for (let index = 1; index < row.length; index++) {
        const a = row[index - 1];
        const b = row[index];
        if (!a || !b) continue;
        const reachA = a.spec.length + a.lift;
        const reachB = b.spec.length + b.lift;
        const ax = a.spec.x + reachA * Math.sin(a.angle);
        const bx = b.spec.x + reachB * Math.sin(b.angle);
        const gap = bx - ax - (a.width + b.width) / 2;
        if (gap >= 0) continue;
        a.angle += gap / 2 / reachA;
        b.angle -= gap / 2 / reachB;
        const va = a.spin * reachA;
        const vb = b.spin * reachB;
        if (va > vb) {
          const shared = (va + vb) / 2;
          const bounce = (va - vb) * 0.45;
          a.spin = (shared - bounce) / reachA;
          b.spin = (shared + bounce) / reachB;
          const thud = Math.min(1, (va - vb) / 160);
          a.squash = Math.max(a.squash, thud);
          b.squash = Math.max(b.squash, thud);
        }
      }
    }
  }

  private draw(rig: Rig) {
    const degrees = (rig.angle * 180) / Math.PI;
    rig.outer.setAttribute(
      "transform",
      `translate(${rig.spec.x.toFixed(1)} ${pivotY}) rotate(${degrees.toFixed(3)})`,
    );
    rig.body.setAttribute("transform", `translate(0 ${(rig.spec.length + rig.lift).toFixed(2)})`);
    let shape = "";
    if (rig.spec.kind === "cloud") {
      const squash = rig.squash * 0.07;
      shape = `rotate(${(-degrees * 0.8).toFixed(3)}) scale(${(1 - squash).toFixed(3)} ${(1 + squash * 0.6).toFixed(3)})`;
    } else if (rig.face) {
      const turn = Math.cos(rig.twist);
      const showing = turn >= 0 ? "front" : "back";
      if (showing !== rig.face.showing) {
        rig.face.showing = showing;
        rig.face.front.setAttribute("display", showing === "front" ? "inline" : "none");
        rig.face.back.setAttribute("display", showing === "back" ? "inline" : "none");
      }
      shape = `rotate(${(-degrees * 0.6).toFixed(3)}) scale(${Math.max(0.04, Math.abs(turn)).toFixed(3)} 1)`;
    } else {
      shape = `rotate(${(-rig.spin * 4).toFixed(3)})`;
    }
    rig.shape.setAttribute("transform", shape);
  }

  /** Reduced motion: one still tableau, every prop at rest with the wind's lean. */
  private pose() {
    cancelAnimationFrame(this.frame);
    this.frame = 0;
    for (const rig of this.rigs.values()) {
      this.rest(rig);
      this.draw(rig);
    }
  }
}
