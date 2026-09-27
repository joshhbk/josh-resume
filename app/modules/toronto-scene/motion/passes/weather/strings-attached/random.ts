/** A small seeded generator, so a rig and its textures look the same every time they're hung. */
export function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Evenly spread positions in 0–1 that stay put when more are added (golden-ratio sequence). */
export const spread = (index: number, offset = 0.5) => (offset + index * 0.618_034) % 1;
