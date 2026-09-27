import { css } from "./palette";
import { columnCount, columnWidth } from "./skyline-field";
import { beams, mat, umbrellaRadius, type Cloud, type WeatherSim } from "./weather-sim";

export type Surface = {
  ctx: CanvasRenderingContext2D;
  /** Canvas backing size in device pixels. */
  width: number;
  height: number;
  /** Artwork units to device pixels, and the centred x offset in device pixels. */
  scale: number;
  offsetX: number;
  /** Everything above the skyline, for drawing clouds and far rain behind the city. */
  skyClip: Path2D;
  skylineVersion: number;
  glow: HTMLCanvasElement;
};

/** The region above the first roofline, traced column by column. */
export function skyRegion(sim: WeatherSim): Path2D {
  const path = new Path2D();
  path.moveTo(-200, -200);
  path.lineTo(1736, -200);
  const { roof } = sim.sky;
  path.lineTo(1736, roof[columnCount - 1] ?? 800);
  for (let column = columnCount - 1; column >= 0; column--) {
    const y = roof[column] ?? 800;
    path.lineTo((column + 1) * columnWidth, y);
    path.lineTo(column * columnWidth, y);
  }
  path.lineTo(-200, roof[0] ?? 800);
  path.closePath();
  return path;
}

/** A soft round glow, drawn once and stamped for every firefly. */
export function glowSprite(): HTMLCanvasElement | null {
  const sprite = document.createElement("canvas");
  sprite.width = 64;
  sprite.height = 64;
  const ctx = sprite.getContext("2d");
  if (!ctx) return null;
  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, "rgba(246,255,190,1)");
  gradient.addColorStop(0.18, "rgba(222,246,120,0.75)");
  gradient.addColorStop(0.5, "rgba(190,230,90,0.18)");
  gradient.addColorStop(1, "rgba(190,230,90,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);
  return sprite;
}

function drawClouds(ctx: CanvasRenderingContext2D, sim: WeatherSim, band: 0 | 1): void {
  const { palette } = sim;
  const paint = (cloud: Cloud, dy: number, grow: number, fill: string) => {
    ctx.beginPath();
    for (const puff of cloud.puffs) {
      const r = Math.max(1, puff.r * (0.5 + 0.5 * Math.min(1, cloud.presence * 1.4)) + grow);
      ctx.moveTo(puff.x + r, puff.y + dy);
      ctx.arc(puff.x, puff.y + dy, r, 0, Math.PI * 2);
    }
    ctx.fillStyle = fill;
    ctx.fill();
  };
  for (const cloud of sim.clouds) {
    if (cloud.band !== band || cloud.presence < 0.01) continue;
    ctx.globalAlpha = Math.min(1, cloud.presence * 1.2) * (band === 0 ? 0.86 : 0.95);
    // Cut paper: a soft shadow below, a lit edge along the top, then the sheet itself.
    paint(cloud, 10, 0, css(palette.cloudShadow));
    paint(cloud, -2.5, 0.5, css(palette.cloudRim));
    paint(cloud, 0, 0, css(palette.cloud));
  }
  ctx.globalAlpha = 1;
}

function drawBeams(ctx: CanvasRenderingContext2D, sim: WeatherSim): void {
  const beam = beams[sim.input.phase];
  const strength = sim.level.beams;
  if (strength < 0.01 || beam.angles.length === 0) return;
  for (const [index, center] of beam.angles.entries()) {
    const angle = center + Math.sin(sim.time * 0.13 + index * 1.7) * 0.015;
    const pulse = 0.75 + 0.25 * Math.sin(sim.time * 0.4 + index * 2.3);
    const far = 1700;
    const gradient = ctx.createLinearGradient(
      beam.x,
      beam.y,
      beam.x + Math.cos(angle) * far,
      beam.y + Math.sin(angle) * far,
    );
    gradient.addColorStop(0, css(sim.palette.beam, strength * pulse));
    gradient.addColorStop(0.55, css(sim.palette.beam, strength * pulse * 0.45));
    gradient.addColorStop(1, css(sim.palette.beam, 0));
    ctx.beginPath();
    ctx.moveTo(beam.x, beam.y);
    ctx.lineTo(
      beam.x + Math.cos(angle - beam.width) * far,
      beam.y + Math.sin(angle - beam.width) * far,
    );
    ctx.lineTo(
      beam.x + Math.cos(angle + beam.width) * far,
      beam.y + Math.sin(angle + beam.width) * far,
    );
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();
  }
}

function drawDrops(ctx: CanvasRenderingContext2D, sim: WeatherSim, layer: 0 | 1 | 2): void {
  const stretch = [0.018, 0.024, 0.03][layer] ?? 0.024;
  ctx.beginPath();
  let any = false;
  for (const drop of sim.drops) {
    if (drop.layer !== layer) continue;
    any = true;
    ctx.moveTo(drop.x, drop.y);
    ctx.lineTo(drop.x - drop.vx * stretch, drop.y - Math.min(drop.vy, 1400) * stretch);
  }
  if (!any) return;
  ctx.lineWidth = [1.1, 1.5, 2.1][layer] ?? 1.5;
  ctx.strokeStyle = css(
    layer === 2 ? sim.palette.rainNear : sim.palette.rain,
    layer === 0 ? 0.75 : 1,
  );
  ctx.stroke();
}

function drawFlakes(ctx: CanvasRenderingContext2D, sim: WeatherSim, layer: 0 | 1 | 2): void {
  ctx.beginPath();
  let any = false;
  for (const flake of sim.flakes) {
    if (flake.layer !== layer) continue;
    any = true;
    ctx.moveTo(flake.x + flake.r, flake.y);
    ctx.arc(flake.x, flake.y, flake.r, 0, Math.PI * 2);
  }
  if (!any) return;
  ctx.fillStyle = css(sim.palette.snow, layer === 0 ? 0.7 : layer === 1 ? 0.85 : 0.95);
  ctx.fill();
}

function drawPiles(ctx: CanvasRenderingContext2D, sim: WeatherSim): void {
  const fields = [sim.sky.ledge, sim.sky.trees, sim.sky.shore] as const;
  const { land } = sim;
  sim.piles.forEach((pile, surface) => {
    const field = fields[surface as 0 | 1 | 2];
    const path = new Path2D();
    let open = false;
    let runStart = 0;
    for (let column = 0; column <= columnCount; column++) {
      const depth = column < columnCount ? (pile[column] ?? 0) : 0;
      const holds = column < columnCount && depth > 0.35;
      if (holds && !open) {
        open = true;
        runStart = column;
        path.moveTo(column * columnWidth + land.x, (field[column] ?? 0) + land.y);
      }
      if (holds) {
        const x = column * columnWidth + land.x;
        const base = (field[column] ?? 0) + land.y;
        path.lineTo(x + columnWidth * 0.5, base - depth);
      }
      if (!holds && open) {
        open = false;
        // Back along the surface the snow sits on.
        for (let back = column - 1; back >= runStart; back--) {
          path.lineTo((back + 1) * columnWidth + land.x, (field[back] ?? 0) + land.y + 0.5);
          path.lineTo(back * columnWidth + land.x, (field[back] ?? 0) + land.y + 0.5);
        }
        path.closePath();
      }
    }
    ctx.save();
    ctx.translate(0, 2.2);
    ctx.fillStyle = css(sim.palette.snowShadow);
    ctx.fill(path);
    ctx.restore();
    ctx.fillStyle = css(sim.palette.snow);
    ctx.fill(path);
  });
}

function drawSplashes(ctx: CanvasRenderingContext2D, sim: WeatherSim): void {
  if (sim.bits.length > 0) {
    ctx.beginPath();
    for (const bit of sim.bits) {
      const r = bit.size * (1 - bit.age / bit.life) + 0.3;
      ctx.moveTo(bit.x + r, bit.y);
      ctx.arc(bit.x, bit.y, r, 0, Math.PI * 2);
    }
    ctx.fillStyle = css(sim.palette.rainNear, 0.9);
    ctx.fill();
  }
  ctx.lineWidth = 1.4;
  for (const ring of sim.rings) {
    const age = ring.age / ring.life;
    const rx = (3 + 18 * (1 - (1 - age) ** 2)) * ring.size;
    ctx.beginPath();
    ctx.ellipse(ring.x, ring.y, rx, rx * 0.22, 0, 0, Math.PI * 2);
    ctx.strokeStyle = css(sim.palette.ripple, (1 - age) ** 1.4 * 0.9);
    ctx.stroke();
  }
}

/** The cursor's umbrella is invisible; it shows only where the rain wets its canopy. */
function drawCanopy(ctx: CanvasRenderingContext2D, sim: WeatherSim): void {
  const { umbrella, palette } = sim;
  const rain = sim.level.rain;
  if (umbrella.open > 0.05 && rain > 0.02) {
    const r = umbrellaRadius * umbrella.open;
    ctx.lineCap = "round";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(umbrella.x, umbrella.y, r, Math.PI, Math.PI * 2);
    ctx.strokeStyle = css(palette.canopy, 0.12 * rain);
    ctx.stroke();
    ctx.lineWidth = 2.4;
    const slices = sim.wet.length;
    for (let index = 0; index < slices; index++) {
      const wet = sim.wet[index] ?? 0;
      if (wet < 0.03) continue;
      const start = Math.PI + (index / slices) * Math.PI;
      ctx.beginPath();
      ctx.arc(umbrella.x, umbrella.y, r, start, start + Math.PI / slices + 0.01);
      ctx.strokeStyle = css(palette.canopy, Math.min(1, wet) * 0.8);
      ctx.stroke();
    }
    ctx.lineCap = "butt";
  }
  if (sim.slides.length > 0) {
    ctx.beginPath();
    for (const slide of sim.slides) {
      const canopy = sim.canopyCenter(slide.host);
      const x = canopy.x + (canopy.r + 1) * Math.sin(slide.theta);
      const y = canopy.y - (canopy.r + 1) * Math.cos(slide.theta);
      ctx.moveTo(x + 1.7, y);
      ctx.arc(x, y, 1.7, 0, Math.PI * 2);
    }
    ctx.fillStyle = css(palette.canopy, 0.9);
    ctx.fill();
  }
}

/** A paper-cut passer-by with a red umbrella, strolling the shore whenever the cursor is away. */
function drawWalker(ctx: CanvasRenderingContext2D, sim: WeatherSim): void {
  const { walker } = sim;
  if (walker.presence < 0.02) return;
  const feet = sim.walkerY();
  const x = walker.x;
  const night = sim.input.phase === "night";
  ctx.globalAlpha = walker.presence;
  const stride = Math.sin(walker.stride) * 4;
  ctx.strokeStyle = night ? "#0b1626" : "#23323d";
  ctx.lineWidth = 2.2;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x - 1, feet - 13);
  ctx.lineTo(x - 1 + stride, feet);
  ctx.moveTo(x + 1, feet - 13);
  ctx.lineTo(x + 1 - stride, feet);
  ctx.stroke();
  ctx.fillStyle = night ? "#0f1d31" : "#2b3c4a";
  ctx.beginPath();
  ctx.roundRect(x - 4.5, feet - 30, 9, 18, 3);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x, feet - 33, 3.6, 0, Math.PI * 2);
  ctx.fill();
  // Handle and canopy.
  const cy = feet - 38;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(x + 3 * walker.dir, feet - 22);
  ctx.lineTo(x + 3 * walker.dir, cy);
  ctx.stroke();
  const r = 25;
  ctx.fillStyle = "rgba(20,24,30,0.28)";
  ctx.beginPath();
  ctx.arc(x, cy + 2.5, r, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = night ? "#8e3b35" : "#bf4a3b";
  ctx.beginPath();
  ctx.arc(x, cy, r, Math.PI, 0);
  // Scalloped hem between the ribs.
  for (let rib = 0; rib < 4; rib++) {
    const x1 = x + r - (rib * 2 * r) / 4;
    const x0 = x1 - (2 * r) / 4;
    ctx.quadraticCurveTo((x0 + x1) / 2, cy - 5, x0, cy);
  }
  ctx.fill();
  ctx.strokeStyle = night ? "#c9776b" : "#f0a893";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(x, cy, r - 1, Math.PI * 1.1, Math.PI * 1.45);
  ctx.stroke();
  ctx.lineCap = "butt";
  ctx.globalAlpha = 1;
}

function drawMotes(ctx: CanvasRenderingContext2D, sim: WeatherSim): void {
  const level = sim.level.motes;
  if (level < 0.01) return;
  const t = sim.time;
  sim.motes.forEach((mote, index) => {
    const appear = Math.min(1, Math.max(0, (level - (index / sim.motes.length) * 0.7) * 3));
    if (appear <= 0) return;
    const light = sim.beamLight(mote.x, mote.y);
    const twinkle = 0.6 + 0.4 * Math.sin(t * 2.2 + mote.seed * 3);
    const alpha = appear * (0.22 + 0.78 * light) * twinkle;
    ctx.beginPath();
    ctx.arc(mote.x, mote.y, mote.size * (1 + light * 0.4), 0, Math.PI * 2);
    ctx.fillStyle = css(sim.palette.mote, alpha);
    ctx.fill();
  });
}

function drawFlies(ctx: CanvasRenderingContext2D, sim: WeatherSim, glow: HTMLCanvasElement): void {
  const level = sim.level.flies;
  if (level < 0.01 || sim.flies.length === 0) return;
  ctx.globalCompositeOperation = "lighter";
  sim.flies.forEach((fly, index) => {
    // They wake one by one as night falls.
    const appear = Math.min(1, Math.max(0, (level - (index / sim.flies.length) * 0.8) * 4));
    if (appear <= 0) return;
    const blink = sim.still ? 0.55 : Math.max(0, Math.sin(fly.phase)) ** 5;
    const size = 16 + 46 * blink;
    ctx.globalAlpha = appear * (0.18 + 0.82 * blink);
    ctx.drawImage(glow, fly.x - size / 2, fly.y - size / 2, size, size);
    // A second, tighter stamp gives each one a hot little core.
    ctx.drawImage(glow, fly.x - 5, fly.y - 5, 10, 10);
  });
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
}

/** Renders one frame of the simulation. */
export function drawWeather(surface: Surface, sim: WeatherSim): void {
  if (surface.skylineVersion !== sim.skylineVersion) {
    surface.skyClip = skyRegion(sim);
    surface.skylineVersion = sim.skylineVersion;
  }
  const { ctx, width, height, scale, offsetX, skyClip, glow } = surface;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, width, height);
  ctx.setTransform(scale, 0, 0, scale, offsetX, 0);
  ctx.save();
  ctx.beginPath();
  ctx.rect(mat.x0, mat.y0, mat.x1 - mat.x0, mat.y1 - mat.y0);
  ctx.clip();

  // Behind the city: sunbeams, clouds and far rain.
  ctx.save();
  ctx.translate(sim.land.x, sim.land.y);
  ctx.clip(skyClip);
  ctx.translate(-sim.land.x, -sim.land.y);
  drawBeams(ctx, sim);
  drawClouds(ctx, sim, 0);
  drawDrops(ctx, sim, 0);
  drawFlakes(ctx, sim, 0);
  drawClouds(ctx, sim, 1);
  ctx.restore();

  drawPiles(ctx, sim);
  drawDrops(ctx, sim, 1);
  drawFlakes(ctx, sim, 1);
  drawDrops(ctx, sim, 2);
  drawFlakes(ctx, sim, 2);
  drawSplashes(ctx, sim);
  drawWalker(ctx, sim);
  drawCanopy(ctx, sim);
  drawMotes(ctx, sim);
  drawFlies(ctx, sim, glow);
  ctx.restore();
}
