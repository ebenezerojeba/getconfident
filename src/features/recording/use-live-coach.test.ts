import { describe, expect, it } from "vitest";

import { PACE, paceLabel } from "./use-live-coach";

describe("paceLabel", () => {
  it("waits for enough speech before judging", () => {
    expect(paceLabel(null)).toBe("warming-up");
  });
  it("classifies slow, good and fast pace", () => {
    expect(paceLabel(PACE.slow - 1)).toBe("slow");
    expect(paceLabel(140)).toBe("good");
    expect(paceLabel(PACE.fast + 1)).toBe("fast");
  });
});
