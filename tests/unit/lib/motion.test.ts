import { describe, it, expect } from "vitest";
import { motionDuration, motionTransition } from "@/lib/motion/reduced-motion";

describe("motion reduced-motion helpers", () => {
  it("motionDuration returns full duration when reduced motion is off", () => {
    expect(motionDuration(0.25)).toBe(0.25);
  });

  it("motionTransition returns fallback when reduced motion is off", () => {
    expect(motionTransition({ duration: 0.2 })).toEqual({ duration: 0.2 });
  });
});
