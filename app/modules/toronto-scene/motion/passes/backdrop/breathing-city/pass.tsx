import type { ScenePass } from "../../../motion-types";
import styles from "./breathing-city.module.css";
import { BreathingDriver } from "./breathing-driver";
import { BreathingLayers } from "./breathing-layers";

/**
 * Breathing city: the skyline is one sleeping animal. Its sheets inhale from their feet in a wave,
 * the tower sways like a reed, the trees ripple like fur, the lake swells, the windows glow with
 * each breath and the tower's pod beats like a heart that quickens when the cursor stirs.
 */
export const pass: ScenePass = {
  className: styles.root ?? "",
  Driver: BreathingDriver,
  Mid: BreathingLayers,
};
