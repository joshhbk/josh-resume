import type { PassProps } from "../../../motion-types";
import { chimneys, heart, parts } from "./city-anatomy";
import styles from "./breathing-city.module.css";
import windowGlow from "./window-glow.webp";

/** The lit windows of the night artwork, pre-extracted to a warm alpha mask (half resolution). */
function WindowGlow() {
  return <image href={windowGlow} width={1536} height={1024} />;
}

/**
 * Glowing windows laid over each building cutout, clipped to the same silhouettes and scaled by
 * the driver in step with their sheets, so the windows swell and dim with each breath.
 */
function Windows() {
  return parts.flatMap(({ part, clip }) =>
    part === "tower"
      ? []
      : [
          <g className={styles.glow} data-bc-glow={part} clipPath={`url(#${clip})`} key={part}>
            <WindowGlow />
          </g>,
        ],
  );
}

/** The tower's pod is the heart; it sways and stretches with the tower. */
function Heart() {
  return (
    <g data-bc-glow="tower">
      <circle className={styles.heart} data-bc-heart="" cx={heart.x} cy={heart.y} r={46} />
    </g>
  );
}

/** Steam breath puffs, one pool reused by the driver on cold exhales. */
function Breath() {
  return chimneys.map(([x, y], index) => (
    <ellipse
      className={styles.puff}
      data-bc-puff={index}
      cx={x}
      cy={y - 14}
      rx={30}
      ry={17}
      fill="url(#bc-puff)"
      key={`${x}-${y}`}
    />
  ));
}

/**
 * The Mid slot: the trees' fur filter, the windows, the tower's heart and the rooftop breath.
 * Everything here is still until the driver moves it.
 */
export function BreathingLayers({ reducedMotion }: PassProps) {
  return (
    <g aria-hidden="true">
      <defs>
        {/* Fur: a fixed noise field slid sideways in steps, displacing the tree line like stroked fur. */}
        <filter
          id="bc-fur"
          filterUnits="userSpaceOnUse"
          x={-220}
          y={690}
          width={1976}
          height={334}
          colorInterpolationFilters="sRGB"
        >
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.05 0.014"
            numOctaves={2}
            seed={7}
            result="fur"
          />
          <feOffset in="fur" dx={0} dy={0} result="stroke" data-bc-fur="offset" />
          <feDisplacementMap
            in="SourceGraphic"
            in2="stroke"
            scale={reducedMotion ? 4 : 6}
            xChannelSelector="R"
            yChannelSelector="G"
            data-bc-fur="map"
          />
        </filter>
        <radialGradient id="bc-heart">
          <stop offset="0" stopColor="#ffe2a6" stopOpacity="0.95" />
          <stop offset="0.35" stopColor="#ffb86b" stopOpacity="0.45" />
          <stop offset="1" stopColor="#ff9a5c" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="bc-puff">
          <stop offset="0" stopColor="var(--bc-puff, #fbf4e6)" stopOpacity="0.9" />
          <stop offset="0.6" stopColor="var(--bc-puff, #fbf4e6)" stopOpacity="0.45" />
          <stop offset="1" stopColor="var(--bc-puff, #fbf4e6)" stopOpacity="0" />
        </radialGradient>
      </defs>
      <Windows />
      <Heart />
      <Breath />
    </g>
  );
}
