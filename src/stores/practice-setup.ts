"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { Difficulty, PracticeMode, TopicCategory } from "@/generated/prisma/enums";

export type SetupTopic = {
  id: string;
  text: string;
  category: TopicCategory;
  difficulty: Difficulty;
};

type PracticeSetupState = {
  mode: PracticeMode;
  difficulty: Difficulty;
  category: TopicCategory | null;
  durationSec: number;
  withVideo: boolean;
  topic: SetupTopic | null;
  /** Server-provided defaults were applied (first visit this browser session). */
  initialized: boolean;
  set: (patch: Partial<Omit<PracticeSetupState, "set" | "initFrom">>) => void;
  initFrom: (defaults: { mode: PracticeMode; difficulty: Difficulty; durationSec: number }) => void;
};

/**
 * Temporary UI state for the practice setup screen (Zustand, per the
 * architecture). Persisted to sessionStorage only so a refresh keeps the
 * chosen settings; permanent preferences live in the database.
 */
export const usePracticeSetup = create<PracticeSetupState>()(
  persist(
    (set, get) => ({
      mode: "IMPROMPTU",
      difficulty: "MEDIUM",
      category: null,
      durationSec: 120,
      withVideo: true,
      topic: null,
      initialized: false,
      set: (patch) => set(patch),
      initFrom: (d) => {
        if (get().initialized) return;
        set({ ...d, initialized: true });
      },
    }),
    {
      name: "practice-setup",
      storage: createJSONStorage(() => sessionStorage),
      partialize: ({ set: _s, initFrom: _i, ...rest }) => rest,
    },
  ),
);
