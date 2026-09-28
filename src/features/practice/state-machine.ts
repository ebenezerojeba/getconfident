import type { SessionStatus } from "@/generated/prisma/enums";

/**
 * Practice session lifecycle:
 *   DRAFT → READY → COUNTDOWN → RECORDING → PROCESSING → TRANSCRIBING → ANALYZING → COMPLETED
 * with explicit, retryable failure states. Any pre-processing state can be CANCELLED.
 */
const TRANSITIONS: Record<SessionStatus, readonly SessionStatus[]> = {
  DRAFT: ["READY", "COUNTDOWN", "RECORDING", "CANCELLED"],
  READY: ["COUNTDOWN", "RECORDING", "CANCELLED"],
  COUNTDOWN: ["RECORDING", "READY", "CANCELLED"],
  RECORDING: ["PROCESSING", "READY", "CANCELLED"],
  PROCESSING: ["TRANSCRIBING", "PROCESSING_FAILED"],
  TRANSCRIBING: ["ANALYZING", "TRANSCRIPTION_FAILED"],
  ANALYZING: ["COMPLETED", "ANALYSIS_FAILED"],
  COMPLETED: [],
  PROCESSING_FAILED: ["PROCESSING", "TRANSCRIBING"],
  TRANSCRIPTION_FAILED: ["TRANSCRIBING"],
  ANALYSIS_FAILED: ["ANALYZING"],
  CANCELLED: [],
};

export function canTransition(from: SessionStatus, to: SessionStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export const FAILED_STATUSES: readonly SessionStatus[] = [
  "PROCESSING_FAILED",
  "TRANSCRIPTION_FAILED",
  "ANALYSIS_FAILED",
];
export const IN_PROGRESS_STATUSES: readonly SessionStatus[] = [
  "PROCESSING",
  "TRANSCRIBING",
  "ANALYZING",
];
/** States in which a recording may be uploaded. */
export const UPLOADABLE_STATUSES: readonly SessionStatus[] = [
  "DRAFT",
  "READY",
  "COUNTDOWN",
  "RECORDING",
];

export const isFailed = (s: SessionStatus) => FAILED_STATUSES.includes(s);
export const isProcessing = (s: SessionStatus) => IN_PROGRESS_STATUSES.includes(s);
export const isTerminal = (s: SessionStatus) => s === "COMPLETED" || s === "CANCELLED";

/** The status a failed session resumes from when retried. */
export function retryFrom(status: SessionStatus): SessionStatus | null {
  switch (status) {
    case "PROCESSING_FAILED":
    case "TRANSCRIPTION_FAILED":
      return "TRANSCRIBING";
    case "ANALYSIS_FAILED":
      return "ANALYZING";
    default:
      return null;
  }
}

export const STATUS_LABEL: Record<SessionStatus, string> = {
  DRAFT: "Draft",
  READY: "Ready",
  COUNTDOWN: "Starting",
  RECORDING: "Recording",
  PROCESSING: "Uploading",
  TRANSCRIBING: "Transcribing",
  ANALYZING: "Analyzing",
  COMPLETED: "Completed",
  PROCESSING_FAILED: "Processing failed",
  TRANSCRIPTION_FAILED: "Transcription failed",
  ANALYSIS_FAILED: "Analysis failed",
  CANCELLED: "Cancelled",
};
