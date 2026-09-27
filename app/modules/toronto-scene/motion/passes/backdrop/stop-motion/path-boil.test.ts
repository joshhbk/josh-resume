import { describe, expect, it } from "vitest";

import { boilFrames, parsePath } from "./path-boil";

describe("stop-motion boil", () => {
  it("reads the skyline's relative, implicit and quadratic path commands", () => {
    expect(parsePath("M0 448h70v143l2 4 3 5q10-4 20 0Z")).toEqual([
      { kind: "M", x: 0, y: 448 },
      { kind: "L", x: 70, y: 448 },
      { kind: "L", x: 70, y: 591 },
      { kind: "L", x: 72, y: 595 },
      { kind: "L", x: 75, y: 600 },
      { kind: "Q", cx: 85, cy: 596, x: 95, y: 600 },
      { kind: "Z" },
    ]);
    expect(parsePath("M0 0C1 1 2 2 3 3")).toBeNull();
  });

  it("redraws a path three different ways, keeping points on the artwork edge pinned", () => {
    const frames = boilFrames("M0 0H1536V1024H0Z", 2, 3) ?? [];

    expect(new Set(frames).size).toBe(1);
    const inner = boilFrames("M10 100h500v50H10Z", 2, 3) ?? [];
    expect(new Set(inner).size).toBe(3);
    expect(boilFrames("M10 100h500v50H10Z", 2, 3)).toEqual(inner);
  });
});
