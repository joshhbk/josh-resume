import { useEffect, useRef, type CSSProperties, type RefObject } from "react";

import type { DayPhase, Weather } from "../../../../scene-provider";
import type { PassProps } from "../../../motion-types";
import {
  baseStrip,
  cloudShapes,
  crescentFacets,
  facetTone,
  pinwheelBlades,
  pointsAttr,
  puffFacets,
  starPoints,
  type CloudShape,
  type Puff,
} from "./facets";
import styles from "./origami.module.css";

const toneClass = [styles.tone0, styles.tone1, styles.tone2, styles.tone3] as const;
const moonClass = [styles.moon0, styles.moon1, styles.moon2, styles.moon3] as const;

type Vars = CSSProperties & Record<`--${string}`, string | number>;

function cloudCount(weather: Weather, cover: number): number {
  const count = Math.round(cover * cloudShapes.length);
  if (weather === "clear") return count;
  if (weather === "cloudy") return Math.max(4, count);
  if (weather === "rain") return Math.max(5, count);
  return Math.max(4, Math.min(6, count));
}

function PuffShape({ puff, phase }: { puff: Puff; phase: DayPhase }) {
  return puffFacets(puff.cx, puff.r, puff.segments, puff.lift).map((facet, index) => (
    <polygon
      className={toneClass[facetTone(facet, phase, index % 2 === 0 ? 0.18 : -0.18)]}
      points={pointsAttr(facet.points)}
      key={index}
    />
  ));
}

function CloudShadow({ puffs }: { puffs: readonly Puff[] }) {
  return (
    <g className={styles.cloudShadow} transform="translate(7 10)">
      {puffs.map((puff, index) => (
        <polygon
          points={pointsAttr(
            puffFacets(puff.cx, puff.r, puff.segments, puff.lift).flatMap((facet) =>
              facet.points.slice(1),
            ),
          )}
          key={index}
        />
      ))}
      <polygon points={pointsAttr(baseStrip(puffs))} />
    </g>
  );
}

/** A faceted paper cloud drifting with the wind; its last puff periodically folds flat and back. */
function OrigamiCloud({
  shape,
  index,
  shown,
  phase,
  wind,
}: {
  shape: CloudShape;
  index: number;
  shown: boolean;
  phase: DayPhase;
  wind: number;
}) {
  const cross = shape.cross / (0.55 + Math.abs(wind) * 1.6);
  const flap = shape.puffs.at(-1);
  const body = shape.puffs.slice(0, -1);
  const style: Vars = {
    "--cross": `${cross.toFixed(1)}s`,
    "--cross-start": `${(-shape.offset * cross).toFixed(1)}s`,
    "--cross-direction": wind < 0 ? "reverse" : "normal",
    "--fold-every": `${shape.foldEvery}s`,
    "--i": index,
    "--rest-x": `${Math.round(shape.offset * 1700 - 90)}px`,
  };
  return (
    <g transform={`translate(0 ${shape.y})`}>
      <g className={styles.cloudDrift} style={style}>
        <g className={styles.cloudFold} data-shown={shown}>
          <g transform={`scale(${shape.scale})`}>
            <CloudShadow puffs={shape.puffs} />
            <polygon className={styles.tone3} points={pointsAttr(baseStrip(shape.puffs))} />
            {body.map((puff, puffIndex) => (
              <PuffShape puff={puff} phase={phase} key={puffIndex} />
            ))}
            {flap ? (
              <g className={styles.flap} style={{ transformOrigin: `${flap.cx}px 0px` }}>
                <PuffShape puff={flap} phase={phase} />
              </g>
            ) : null}
          </g>
        </g>
      </g>
    </g>
  );
}

function useSpin(ref: RefObject<SVGGElement | null>, rate: number, reducedMotion: boolean) {
  const spin = useRef<Animation | null>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element || reducedMotion || typeof element.animate !== "function") return;
    const animation = element.animate([{ rotate: "0deg" }, { rotate: "360deg" }], {
      duration: 6000,
      iterations: Infinity,
    });
    spin.current = animation;
    return () => {
      animation.cancel();
      spin.current = null;
    };
  }, [ref, reducedMotion]);

  useEffect(() => {
    spin.current?.updatePlaybackRate(rate);
  }, [rate, reducedMotion]);
}

/** A paper pinwheel on a straw poking up from behind the city, spun by the wind. */
function PinwheelSun({
  shown,
  wind,
  reducedMotion,
}: {
  shown: boolean;
  wind: number;
  reducedMotion: boolean;
}) {
  const wheel = useRef<SVGGElement>(null);
  useSpin(wheel, (wind < 0 ? -1 : 1) * (0.3 + Math.abs(wind) * 2.4), reducedMotion);
  return (
    <g transform="translate(1030 236)">
      <g className={styles.stick} data-shown={shown}>
        <rect x="-3.5" y="0" width="7" height="600" rx="3" />
      </g>
      <g className={styles.sunFold} data-shown={shown}>
        <g ref={wheel}>
          {pinwheelBlades(74).map(({ face, curl }, index) => (
            <g key={index}>
              <polygon
                className={index % 2 === 0 ? styles.bladeA : styles.bladeB}
                points={pointsAttr(face)}
              />
              <polygon className={styles.bladeCurl} points={pointsAttr(curl)} />
            </g>
          ))}
        </g>
        <circle className={styles.pin} r="6" />
      </g>
    </g>
  );
}

/** A folded paper crescent that rocks on the wind, lit from behind. */
function CreaseMoon({ shown, wind }: { shown: boolean; wind: number }) {
  const style: Vars = { "--rock": `${(4 + Math.abs(wind) * 9).toFixed(1)}deg` };
  return (
    <g transform="translate(965 240)">
      <g className={styles.moonFold} data-shown={shown}>
        <defs>
          <radialGradient id="origami-moon-glow">
            <stop offset="0.35" stopColor="#fff2cf" stopOpacity="0.22" />
            <stop offset="1" stopColor="#fff2cf" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle r="110" fill="url(#origami-moon-glow)" />
        <g className={styles.moonRock} style={style}>
          {crescentFacets(50).map((facet, index) => (
            <polygon
              className={moonClass[facetTone(facet, "day", index % 2 === 0 ? 0.3 : -0.3)]}
              points={pointsAttr(facet.points)}
              key={index}
            />
          ))}
        </g>
      </g>
    </g>
  );
}

const stars = [
  [118, 96, 6],
  [262, 150, 4],
  [402, 70, 5],
  [540, 188, 3.5],
  [640, 104, 6.5],
  [760, 58, 4],
  [860, 150, 3.5],
  [1080, 92, 5.5],
  [1180, 190, 4],
  [1300, 70, 4.5],
  [1410, 140, 6],
  [1480, 272, 3.5],
  [196, 262, 3.5],
  [470, 300, 4],
  [700, 250, 3],
  [1110, 300, 3.5],
  [1360, 360, 3],
  [60, 360, 3],
] as const;

/** Star-shaped holes punched in the night sky, with light glowing through from behind. */
function PinholeStars({ count }: { count: number }) {
  return stars.map(([x, y, r], index) => {
    const outline = pointsAttr(starPoints(r));
    const style: Vars = { "--twinkle": `${2.4 + (index % 5) * 0.7}s`, "--i": index };
    return (
      <g transform={`translate(${x} ${y})`} key={index}>
        <g className={styles.pinhole} data-shown={index < count} style={style}>
          <circle className={styles.pinholeGlow} r={r * 2.6} />
          <polygon className={styles.pinholeEdge} points={outline} transform="translate(1 1.4)" />
          <polygon className={styles.pinholeLight} points={outline} />
        </g>
      </g>
    );
  });
}

/** The folded-paper sky: clouds, the pinwheel sun, the crescent moon and punched stars. */
export function OrigamiSky({ phase, weather, intensity, reducedMotion }: PassProps) {
  const open = weather === "clear" || weather === "cloudy";
  const clouds = cloudCount(weather, intensity.cloud);
  const starCount =
    phase === "night" ? (weather === "clear" ? stars.length : weather === "cloudy" ? 7 : 0) : 0;
  return (
    <g className={styles.sky} aria-hidden="true">
      <PinholeStars count={starCount} />
      <CreaseMoon shown={phase === "night" && open} wind={intensity.wind} />
      <PinwheelSun
        shown={phase !== "night" && open}
        wind={intensity.wind}
        reducedMotion={reducedMotion}
      />
      {cloudShapes.map((shape, index) => (
        <OrigamiCloud
          shape={shape}
          index={index}
          shown={index < clouds}
          phase={phase}
          wind={intensity.wind}
          key={index}
        />
      ))}
    </g>
  );
}
