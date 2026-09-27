import styles from "./toronto-scene.module.css";
import { TorontoScene } from "./toronto-scene";

/** The fixed, full-viewport Toronto skyline that sits behind every page layout. */
export function SceneBackdrop() {
  return (
    <figure className={styles.sceneBackdrop}>
      <TorontoScene />
    </figure>
  );
}

/** Attribution for the skyline artwork's source photograph and the live weather data. */
export function SceneCredit({ className }: { className?: string | undefined }) {
  return (
    <p className={className}>
      Photo:{" "}
      <a href="https://unsplash.com/photos/cn-tower-grayscale-photography-trq3hS53NYU">
        Osama Saeed
      </a>
      {" · "}
      <a href="https://open-meteo.com/">Weather</a>
    </p>
  );
}
