import type { ScenePass } from "../../../motion-types";
import styles from "./origami.module.css";
import { OrigamiSky } from "./origami-sky";
import { PaperWeatherCanvas } from "./paper-weather-canvas";

/**
 * Origami weather: faceted paper clouds that fold as they drift, a pinwheel sun, a folded
 * crescent moon with punched-star pinholes, paper-strip rain that crumples on the lake and
 * hole-punch snow that flips as it falls and settles in drifts.
 */
export const pass: ScenePass = {
  className: styles.origami ?? "",
  replaces: ["clouds", "rain", "snow", "sun", "moon", "stars"],
  Sky: OrigamiSky,
  Screen: PaperWeatherCanvas,
};
