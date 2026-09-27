import styles from "./paper-springs.module.css";

const ringCount = 3;
const rippleCount = 18;

/**
 * Pools of SVG marks the spring driver animates in place: the crease a shockwave pushes through
 * the paper, the splash rings where it meets the lake, and the thread and pin of a pluck.
 */
export function ShockwaveLayer() {
  return (
    <g className={styles.fx} aria-hidden="true">
      {Array.from({ length: rippleCount }, (_, index) => (
        <ellipse className={styles.ripple} data-springs-ripple="" rx="0" ry="0" key={index} />
      ))}
      {Array.from({ length: ringCount }, (_, index) => (
        <g className={styles.ring} data-springs-ring="" key={index}>
          <circle className={styles.ringCrease} r="0" />
          <circle className={styles.ringShade} r="0" />
        </g>
      ))}
      <line className={styles.thread} data-springs-thread="" />
      <circle className={styles.pin} data-springs-pin="" r="5.5" />
    </g>
  );
}
