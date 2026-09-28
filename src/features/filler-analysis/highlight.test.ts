import { analyzeFillers } from "./analyze";
import { highlightTranscript } from "./highlight";

describe("highlightTranscript", () => {
  it("marks single and multi-word fillers and preserves the text exactly", () => {
    const text = "Um, I think it was, you know, kind of hard. I like it.";
    const parts = highlightTranscript(text, analyzeFillers(text).occurrences);
    expect(parts.map((p) => p.text).join("")).toBe(text);
    expect(parts.filter((p) => p.filler).map((p) => p.text)).toEqual(["Um", "you know", "kind of"]);
  });

  it("returns the whole text when there are no fillers", () => {
    expect(highlightTranscript("Clear and direct.", [])).toEqual([
      { text: "Clear and direct.", filler: null },
    ]);
  });

  it("handles an empty transcript", () => {
    expect(highlightTranscript("", [])).toEqual([]);
  });
});
