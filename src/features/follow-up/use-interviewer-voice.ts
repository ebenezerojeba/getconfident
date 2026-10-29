"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useBrowserSupport, usePersistentFlag } from "@/hooks/use-persistent-flag";

const isSpeechSupported = () =>
  typeof window !== "undefined" &&
  "speechSynthesis" in window &&
  "SpeechSynthesisUtterance" in window;

/** Prefers natural-sounding English voices when the device has them. */
function pickVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  const english = voices.filter((v) => v.lang.toLowerCase().startsWith("en"));
  const preferred = [/natural/i, /google/i, /samantha|ava|allison|daniel|serena/i];
  for (const pattern of preferred) {
    const match = english.find((v) => pattern.test(v.name));
    if (match) return match;
  }
  return english.find((v) => v.default) ?? english[0] ?? null;
}

/**
 * Reads interview questions aloud with the browser's built-in voice (no AI
 * cost, nothing leaves the device). The on/off choice is remembered.
 */
export function useInterviewerVoice() {
  const supported = useBrowserSupport(isSpeechSupported);
  const [preferred, setEnabled] = usePersistentFlag("interviewer-voice");
  const [speaking, setSpeaking] = useState(false);
  const currentRef = useRef<SpeechSynthesisUtterance | null>(null);

  const stop = useCallback(() => {
    if (!isSpeechSupported()) return;
    currentRef.current = null;
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, []);

  /** Speaks the text; onDone runs only if it finished (not when stopped). */
  const speak = useCallback((text: string, onDone?: () => void) => {
    if (!isSpeechSupported()) {
      onDone?.();
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const voice = pickVoice();
    if (voice) utterance.voice = voice;
    utterance.rate = 1;
    utterance.pitch = 1;
    currentRef.current = utterance;
    utterance.onend = () => {
      if (currentRef.current !== utterance) return;
      currentRef.current = null;
      setSpeaking(false);
      onDone?.();
    };
    utterance.onerror = () => {
      if (currentRef.current !== utterance) return;
      currentRef.current = null;
      setSpeaking(false);
    };
    setSpeaking(true);
    window.speechSynthesis.speak(utterance);
  }, []);

  // Never keep talking after leaving the page.
  useEffect(() => stop, [stop]);

  return { supported, enabled: supported && preferred, setEnabled, speaking, speak, stop };
}
