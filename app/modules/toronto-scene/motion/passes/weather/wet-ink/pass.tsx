import type { ScenePass } from "../../../motion-types";
import { GroundSnow, RoofSnow } from "./gouache-snow";
import { InkPaper } from "./ink-paper";
import { InkSky } from "./ink-sky";
import styles from "./wet-ink.module.css";

/**
 * Wet ink: the weather happens to the paper. Rain blooms into blots that bleed, run and dry to
 * tide lines; snow settles as gouache on the ledges and melts off in drips; clouds are
 * wet-in-wet washes; the sun is lifted paper and the moon a masking-fluid resist among salt stars.
 */
export const pass: ScenePass = {
  className: styles.root ?? "",
  replaces: ["clouds", "rain", "snow", "sun", "moon", "stars"],
  Sky: InkSky,
  Mid: RoofSnow,
  Front: GroundSnow,
  Screen: InkPaper,
};
