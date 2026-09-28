import { Difficulty, PracticeMode, TopicCategory } from "@/generated/prisma/enums";
import { TOPIC_CATEGORIES } from "@/config/practice";

import { getMode, MODE_BY_ID, PRACTICE_MODES } from "./practice-modes";

describe("practice modes configuration", () => {
  it("covers every PracticeMode exactly once", () => {
    const ids = PRACTICE_MODES.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.sort()).toEqual(Object.values(PracticeMode).sort());
  });

  it("gives every mode a name, description and evaluation criteria", () => {
    for (const m of PRACTICE_MODES) {
      expect(m.name.length).toBeGreaterThan(2);
      expect(m.tagline.length).toBeGreaterThan(2);
      expect(m.description.length).toBeGreaterThan(10);
      expect(m.evaluationCriteria.length).toBeGreaterThanOrEqual(1);
      expect(m.followUpStyle.length).toBeGreaterThan(5);
      for (const c of m.evaluationCriteria) {
        expect(c.name).toBeTruthy();
        expect(c.description.length).toBeGreaterThan(10);
      }
    }
  });

  it("references only valid categories and difficulties", () => {
    const categories = new Set(TOPIC_CATEGORIES.map((c) => c.id));
    for (const m of PRACTICE_MODES) {
      for (const c of m.promptCategories) {
        expect(categories.has(c)).toBe(true);
        expect(Object.values(TopicCategory)).toContain(c);
      }
      expect(m.difficultyOptions.length).toBeGreaterThan(0);
      for (const d of m.difficultyOptions) expect(Object.values(Difficulty)).toContain(d);
      expect(m.defaultDurationSec).toBeGreaterThanOrEqual(30);
    }
  });

  it("has unique evaluation criteria per mode and distinct prompts across modes", () => {
    for (const m of PRACTICE_MODES) {
      const names = m.evaluationCriteria.map((c) => c.name);
      expect(new Set(names).size).toBe(names.length);
    }
    // Modes are configuration-driven: no duplicated descriptions.
    const descriptions = PRACTICE_MODES.map((m) => m.description);
    expect(new Set(descriptions).size).toBe(descriptions.length);
  });

  it("getMode resolves by id", () => {
    expect(getMode("INTERVIEW").name).toBe("Interview");
    expect(MODE_BY_ID.DAILY_CHALLENGE.difficultyOptions).toEqual(["MEDIUM"]);
  });
});
