import { canTransition, isFailed, isProcessing, isTerminal, retryFrom } from "./state-machine";

describe("session state machine", () => {
  it("allows the happy path", () => {
    const path = [
      "DRAFT",
      "COUNTDOWN",
      "RECORDING",
      "PROCESSING",
      "TRANSCRIBING",
      "ANALYZING",
      "COMPLETED",
    ] as const;
    for (let i = 1; i < path.length; i++) {
      expect(canTransition(path[i - 1], path[i])).toBe(true);
    }
  });

  it("rejects skipping or reversing steps", () => {
    expect(canTransition("DRAFT", "COMPLETED")).toBe(false);
    expect(canTransition("RECORDING", "ANALYZING")).toBe(false);
    expect(canTransition("COMPLETED", "ANALYZING")).toBe(false);
    expect(canTransition("CANCELLED", "RECORDING")).toBe(false);
    expect(canTransition("TRANSCRIBING", "CANCELLED")).toBe(false);
  });

  it("supports restart from recording back to ready", () => {
    expect(canTransition("RECORDING", "READY")).toBe(true);
  });

  it("maps failures to their retry point", () => {
    expect(retryFrom("TRANSCRIPTION_FAILED")).toBe("TRANSCRIBING");
    expect(retryFrom("PROCESSING_FAILED")).toBe("TRANSCRIBING");
    expect(retryFrom("ANALYSIS_FAILED")).toBe("ANALYZING");
    expect(retryFrom("COMPLETED")).toBeNull();
    expect(canTransition("ANALYSIS_FAILED", "ANALYZING")).toBe(true);
    expect(canTransition("TRANSCRIPTION_FAILED", "TRANSCRIBING")).toBe(true);
  });

  it("classifies statuses", () => {
    expect(isFailed("ANALYSIS_FAILED")).toBe(true);
    expect(isProcessing("TRANSCRIBING")).toBe(true);
    expect(isTerminal("COMPLETED")).toBe(true);
    expect(isTerminal("RECORDING")).toBe(false);
  });
});
