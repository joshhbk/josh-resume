import { useEffect, type RefObject } from "react";

const parallaxQuery =
  "(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)";

/**
 * Writes the cursor position, normalised to -1…1 from the viewport centre, into `--cursor-x`
 * and `--cursor-y` on the element. Cards read those at their own depth rate in CSS. Touch
 * devices and reduced-motion users never get the listener, so the variables stay at 0.
 */
export function useCursorParallax(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const element = ref.current;
    // Environments without matchMedia (such as jsdom) have no cursor to follow.
    if (!element || typeof window.matchMedia !== "function") return;
    const query = window.matchMedia(parallaxQuery);
    let frame = 0;
    let latest: PointerEvent | null = null;

    const apply = () => {
      frame = 0;
      if (!latest) return;
      const x = (latest.clientX / window.innerWidth) * 2 - 1;
      const y = (latest.clientY / window.innerHeight) * 2 - 1;
      element.style.setProperty("--cursor-x", x.toFixed(3));
      element.style.setProperty("--cursor-y", y.toFixed(3));
    };
    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      latest = event;
      if (!frame) frame = window.requestAnimationFrame(apply);
    };
    const reset = () => {
      element.style.setProperty("--cursor-x", "0");
      element.style.setProperty("--cursor-y", "0");
    };
    const sync = () => {
      window.removeEventListener("pointermove", onPointerMove);
      reset();
      if (query.matches) window.addEventListener("pointermove", onPointerMove, { passive: true });
    };

    sync();
    query.addEventListener("change", sync);
    return () => {
      query.removeEventListener("change", sync);
      window.removeEventListener("pointermove", onPointerMove);
      window.cancelAnimationFrame(frame);
    };
  }, [ref]);
}
