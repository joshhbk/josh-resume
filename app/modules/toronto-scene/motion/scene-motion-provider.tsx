import { createContext, use, useState, type ReactNode } from "react";

import type { ScenePass } from "./motion-types";
import { originalBackdrop } from "./original-passes";

export type ActivePass = { id: string; pass: ScenePass };

export type SceneMotionContextValue = {
  state: {
    backdrop: ActivePass;
    /** Development only: hide the page layout to look at the scene on its own. */
    peek: boolean;
  };
  actions: {
    setBackdrop: (active: ActivePass) => void;
    setPeek: (peek: boolean) => void;
  };
};

export const originalBackdropPass: ActivePass = { id: "original", pass: originalBackdrop };

const noop = () => {};

const SceneMotionContext = createContext<SceneMotionContextValue>({
  state: { backdrop: originalBackdropPass, peek: false },
  actions: { setBackdrop: noop, setPeek: noop },
});

/** Holds the scene's active backdrop motion pass. Without it, the original applies. */
export function SceneMotionProvider({ children }: { children: ReactNode }) {
  const [backdrop, setBackdrop] = useState(originalBackdropPass);
  const [peek, setPeek] = useState(false);

  return (
    <SceneMotionContext value={{ state: { backdrop, peek }, actions: { setBackdrop, setPeek } }}>
      {children}
    </SceneMotionContext>
  );
}

export function useSceneMotion(): SceneMotionContextValue {
  return use(SceneMotionContext);
}
