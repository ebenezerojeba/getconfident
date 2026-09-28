"use client";

import { MotionConfig } from "framer-motion";
import { ThemeProvider } from "next-themes";

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

export function Providers({ children, nonce }: { children: React.ReactNode; nonce?: string }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      nonce={nonce}
    >
      {/* reducedMotion="user" makes every framer-motion animation honour prefers-reduced-motion. */}
      <MotionConfig reducedMotion="user">
        <TooltipProvider delayDuration={200}>
          {children}
          <Toaster richColors closeButton position="top-center" />
        </TooltipProvider>
      </MotionConfig>
    </ThemeProvider>
  );
}
