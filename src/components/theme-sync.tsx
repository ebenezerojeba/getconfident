"use client";

import { useTheme } from "next-themes";
import { useEffect } from "react";

/**
 * Applies the signed-in user's saved theme preference, so the choice follows
 * them across devices. next-themes has already applied the locally stored
 * theme before paint, so this only corrects a mismatch.
 */
export function ThemeSync({ theme }: { theme: "SYSTEM" | "LIGHT" | "DARK" }) {
  const { theme: current, setTheme } = useTheme();
  useEffect(() => {
    const preferred = theme.toLowerCase();
    if (current && current !== preferred) setTheme(preferred);
    // Only run when the stored account preference changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]);
  return null;
}
