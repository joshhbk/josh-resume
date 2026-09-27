import type { ReactNode } from "react";

import type { Portfolio } from "../portfolio-content/model";
import { PinnedSky } from "../pinned-sky/pinned-sky";
import { DepthLab } from "../toronto-scene/depth-lab";
import { MotionJig } from "../toronto-scene/motion/motion-jig";
import { SceneMotionProvider, useSceneMotion } from "../toronto-scene/motion/scene-motion-provider";
import { SceneBackdrop } from "../toronto-scene/scene-backdrop";
import { SceneProvider } from "../toronto-scene/scene-provider";
import styles from "./portfolio-page.module.css";

/** The page layout above the skyline. The Motion lab can hide it to show the scene alone. */
function LayoutStage({ children }: { children: ReactNode }) {
  const {
    state: { peek },
  } = useSceneMotion();

  return (
    <div className={styles.layout} data-peek={peek || undefined} inert={peek}>
      {children}
    </div>
  );
}

export function PortfolioPage({ content }: { content: Portfolio }) {
  return (
    <SceneProvider>
      <SceneMotionProvider>
        <div className={styles.page}>
          <a className="skip-link" href="#main-content">
            Skip to content
          </a>
          <SceneBackdrop />
          {import.meta.env.DEV && <DepthLab />}
          {import.meta.env.DEV && <MotionJig />}
          <LayoutStage>
            <PinnedSky content={content} />
          </LayoutStage>
        </div>
      </SceneMotionProvider>
    </SceneProvider>
  );
}
