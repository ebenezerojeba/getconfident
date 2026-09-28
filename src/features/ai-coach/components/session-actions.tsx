"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { ApiError, apiFetch } from "@/lib/api-client";

/** Destructive session/recording actions, each behind a confirmation dialog. */
export function SessionActions({
  sessionId,
  hasRecording,
}: {
  sessionId: string;
  hasRecording: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const run = async (url: string, success: string, after: () => void) => {
    setBusy(true);
    try {
      await apiFetch(url, { method: "DELETE" });
      toast.success(success);
      after();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {hasRecording ? (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" disabled={busy}>
              <Trash2 /> Delete recording
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete the recording?</AlertDialogTitle>
              <AlertDialogDescription>
                The audio/video file is permanently deleted. Your transcript and feedback are kept.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() =>
                  run(`/api/sessions/${sessionId}/recording`, "Recording deleted.", () =>
                    router.refresh(),
                  )
                }
              >
                Delete recording
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="destructive" disabled={busy}>
            <Trash2 /> Delete session
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this session?</AlertDialogTitle>
            <AlertDialogDescription>
              The recording, transcript and AI report are permanently deleted. Your progress stats
              will no longer include it. This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                run(`/api/sessions/${sessionId}`, "Session deleted.", () => router.push("/history"))
              }
            >
              Delete session
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
