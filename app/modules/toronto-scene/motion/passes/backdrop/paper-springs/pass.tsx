import type { ScenePass } from "../../../motion-types";
import styles from "./paper-springs.module.css";
import { ShockwaveLayer } from "./shockwave-layer";
import { SpringsDriver } from "./springs-driver";

/**
 * Paper springs: every paper sheet is mounted on its own damped spring. The cursor shoves and
 * drags them, clicks send shockwaves through the layers, grabbing a sheet plucks it, scroll
 * kicks them and wind leans them.
 */
export const pass: ScenePass = {
  className: styles.root ?? "",
  Driver: SpringsDriver,
  Front: ShockwaveLayer,
};
