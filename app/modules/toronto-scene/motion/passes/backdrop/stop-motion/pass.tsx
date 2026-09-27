import type { PassProps, ScenePass } from "../../../motion-types";
import { CameraGate } from "./camera-gate";
import styles from "./stop-motion.module.css";
import { useStopMotionSet } from "./use-stop-motion-set";

function Animator({ sceneRef, depth, reducedMotion, phase, weather }: PassProps) {
  useStopMotionSet(sceneRef, { parallax: depth.parallax, reducedMotion, phase, weather });
  return null;
}

/**
 * Stop-motion boil: the paper diorama is shot on twelves. Every cut-out is re-posed by an
 * unsteady hand each exposure, its edges boil through three hand-cut drawings, the parallax snaps
 * to the frame grid, the light flickers between exposures, and now and then the animator's thumb,
 * a light leak or a hand that knocks the CN Tower off its mark gets caught on film.
 */
export const pass: ScenePass = {
  className: styles.root ?? "",
  Driver: Animator,
  Screen: CameraGate,
};
