"use client";

import { Share2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Spinner } from "@/components/shared/states";
import { Button } from "@/components/ui/button";

/**
 * Shares a results image (score, key stats, topic; never the transcript or
 * recording). Uses the phone's share sheet when available, otherwise downloads.
 */
export function ShareResultButton({
  sessionId,
  score,
  appName,
  appUrl,
}: {
  sessionId: string;
  score: number;
  appName: string;
  appUrl: string;
}) {
  const [busy, setBusy] = useState(false);

  const share = async () => {
    setBusy(true);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/share-card`, { cache: "no-store" });
      if (!res.ok) throw new Error(`share-card ${res.status}`);
      const blob = await res.blob();
      const file = new File([blob], "my-speaking-score.png", { type: "image/png" });
      const text = `I scored ${score}/100 on my impromptu speaking practice with ${appName}. Try it: ${appUrl}`;

      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], text, title: "My speaking score" });
        } catch (e) {
          if ((e as Error).name !== "AbortError") throw e;
        }
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      a.click();
      URL.revokeObjectURL(url);
      await navigator.clipboard?.writeText(text).catch(() => {});
      toast.success("Image downloaded. A caption was copied to your clipboard.");
    } catch {
      toast.error("Couldn't create your results image. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button variant="outline" onClick={share} disabled={busy}>
      {busy ? <Spinner label="Preparing" /> : <Share2 />}
      Share result
    </Button>
  );
}
