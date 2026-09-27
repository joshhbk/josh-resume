import { createContext, use, useState, type ReactNode } from "react";

import type { ScenePass } from "./motion-types";
import { originalBackdrop, originalWeather } from "./original-passes";

export type ActivePass = { id: string; pass: ScenePass };

export type SceneMotionContextValue = {
  state: {
    backdrop: ActivePass;
    weather: ActivePass;
    /** Development only: hide the page layout to look at the scene on its own. */
    peek: boolean;
  };
  actions: {
    setBackdrop: (active: ActivePass) => void;
    setWeather: (active: ActivePass) => void;
    setPeek: (peek: boolean) => void;
  };
};

export const originalBackdropPass: ActivePass = { id: "original", pass: originalBackdrop };
export const originalWeatherPass: ActivePass = { id: "original", pass: originalWeather };

const noop = () => {};

const SceneMotionContext = createContext<SceneMotionContextValue>({
  state: { backdrop: originalBackdropPass, weather: originalWeatherPass, peek: false },
  actions: { setBackdrop: noop, setWeather: noop, setPeek: noop },
});

/** Holds the scene's active backdrop motion and weather passes. Without it, the originals apply. */
export function SceneMotionProvider({ children }: { children: ReactNode }) {
  const [backdrop, setBackdrop] = useState(originalBackdropPass);
  const [weather, setWeather] = useState(originalWeatherPass);
  const [peek, setPeek] = useState(false);

  return (
    <SceneMotionContext
      value={{
        state: { backdrop, weather, peek },
        actions: { setBackdrop, setWeather, setPeek },
      }}
    >
      {children}
    </SceneMotionContext>
  );
}

export function useSceneMotion(): SceneMotionContextValue {
  return use(SceneMotionContext);
}
