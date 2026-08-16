import { describe, expect, it } from "vitest";
import { motionModes, resolveMotionMode } from "./motion";

describe("portfolio motion modes", () => {
  it("defines five distinct preview routes", () => {
    expect(motionModes).toHaveLength(5);
    expect(new Set(motionModes.map(({ href }) => href)).size).toBe(5);
  });

  it("falls back to the quiet mode for an unknown route", () => {
    expect(resolveMotionMode("kinetic")).toBe("kinetic");
    expect(resolveMotionMode("unknown")).toBe("quiet");
    expect(resolveMotionMode(undefined)).toBe("quiet");
  });
});
