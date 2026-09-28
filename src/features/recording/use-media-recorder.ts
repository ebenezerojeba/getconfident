"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  checkRecordingSupport,
  classifyMediaError,
  type MediaErrorKind,
  pickMimeType,
} from "./media";

export type RecorderStatus =
  "idle" | "requesting" | "ready" | "recording" | "paused" | "stopped" | "error";

export type RecordingResult = {
  media: Blob;
  /** Separate audio-only track (video sessions only), used for transcription. */
  audio: Blob | null;
  durationMs: number;
};

const AUDIO_BITRATE = 64_000;
const VIDEO_BITRATE = 1_000_000;

/**
 * Wraps getUserMedia + MediaRecorder. For video it runs a second, audio-only
 * recorder in parallel so transcription uploads stay small. Knows nothing about
 * practice sessions (business logic lives elsewhere).
 */
export function useMediaRecorder(withVideo: boolean) {
  const [status, setStatus] = useState<RecorderStatus>("idle");
  const [error, setError] = useState<MediaErrorKind | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const recordersRef = useRef<{ main: MediaRecorder; audio: MediaRecorder | null } | null>(null);
  const chunksRef = useRef<{ main: Blob[]; audio: Blob[] }>({ main: [], audio: [] });
  const timingRef = useRef({ startedAt: 0, pausedAt: 0, pausedTotal: 0 });

  const stopTracks = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setStream(null);
  }, []);

  const requestAccess = useCallback(async () => {
    const support = checkRecordingSupport({
      isSecureContext: window.isSecureContext,
      hasGetUserMedia: Boolean(navigator.mediaDevices?.getUserMedia),
      hasMediaRecorder: typeof window.MediaRecorder !== "undefined",
    });
    if (!support.ok) {
      setError(support.reason);
      setStatus("error");
      return false;
    }
    if (!pickMimeType(withVideo ? "video" : "audio", (t) => MediaRecorder.isTypeSupported(t))) {
      setError("unsupported");
      setStatus("error");
      return false;
    }
    setStatus("requesting");
    setError(null);
    try {
      stopTracks();
      const media = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: withVideo
          ? {
              width: { ideal: 640 },
              height: { ideal: 480 },
              facingMode: "user",
              frameRate: { ideal: 24 },
            }
          : false,
      });
      if (!media.getAudioTracks().length)
        throw Object.assign(new Error("No microphone"), { name: "NotFoundError" });
      streamRef.current = media;
      setStream(media);
      setStatus("ready");
      return true;
    } catch (e) {
      setError(classifyMediaError(e));
      setStatus("error");
      return false;
    }
  }, [withVideo, stopTracks]);

  const start = useCallback(() => {
    const media = streamRef.current;
    if (!media) return false;
    const isSupported = (t: string) => MediaRecorder.isTypeSupported(t);
    try {
      const mainType = pickMimeType(withVideo ? "video" : "audio", isSupported)!;
      const main = new MediaRecorder(media, {
        mimeType: mainType,
        audioBitsPerSecond: AUDIO_BITRATE,
        ...(withVideo ? { videoBitsPerSecond: VIDEO_BITRATE } : {}),
      });
      let audio: MediaRecorder | null = null;
      if (withVideo) {
        const audioType = pickMimeType("audio", isSupported);
        if (audioType) {
          audio = new MediaRecorder(new MediaStream(media.getAudioTracks()), {
            mimeType: audioType,
            audioBitsPerSecond: AUDIO_BITRATE,
          });
        }
      }
      chunksRef.current = { main: [], audio: [] };
      main.ondataavailable = (e) => e.data.size && chunksRef.current.main.push(e.data);
      if (audio) audio.ondataavailable = (e) => e.data.size && chunksRef.current.audio.push(e.data);
      main.start(1000);
      audio?.start(1000);
      recordersRef.current = { main, audio };
      timingRef.current = { startedAt: performance.now(), pausedAt: 0, pausedTotal: 0 };
      setStatus("recording");
      return true;
    } catch (e) {
      setError(classifyMediaError(e));
      setStatus("error");
      return false;
    }
  }, [withVideo]);

  const pause = useCallback(() => {
    const r = recordersRef.current;
    if (!r || r.main.state !== "recording") return;
    r.main.pause();
    if (r.audio?.state === "recording") r.audio.pause();
    timingRef.current.pausedAt = performance.now();
    setStatus("paused");
  }, []);

  const resume = useCallback(() => {
    const r = recordersRef.current;
    if (!r || r.main.state !== "paused") return;
    r.main.resume();
    if (r.audio?.state === "paused") r.audio.resume();
    timingRef.current.pausedTotal += performance.now() - timingRef.current.pausedAt;
    timingRef.current.pausedAt = 0;
    setStatus("recording");
  }, []);

  const stop = useCallback(async (): Promise<RecordingResult | null> => {
    const r = recordersRef.current;
    if (!r) return null;
    const stopOne = (rec: MediaRecorder) =>
      new Promise<void>((resolve) => {
        if (rec.state === "inactive") return resolve();
        rec.addEventListener("stop", () => resolve(), { once: true });
        rec.stop();
      });
    const t = timingRef.current;
    const end = t.pausedAt || performance.now();
    const durationMs = Math.max(0, Math.round(end - t.startedAt - t.pausedTotal));
    await Promise.all([stopOne(r.main), r.audio ? stopOne(r.audio) : Promise.resolve()]);
    recordersRef.current = null;
    const media = new Blob(chunksRef.current.main, { type: r.main.mimeType });
    const audio = r.audio ? new Blob(chunksRef.current.audio, { type: r.audio.mimeType }) : null;
    setStatus("stopped");
    return { media, audio, durationMs };
  }, []);

  /** Throws away the current recording but keeps camera/mic open for a retake. */
  const discard = useCallback(() => {
    const r = recordersRef.current;
    if (r) {
      r.main.ondataavailable = null;
      if (r.main.state !== "inactive") r.main.stop();
      if (r.audio && r.audio.state !== "inactive") r.audio.stop();
    }
    recordersRef.current = null;
    chunksRef.current = { main: [], audio: [] };
    setStatus(streamRef.current ? "ready" : "idle");
  }, []);

  const release = useCallback(() => {
    discard();
    stopTracks();
    setStatus("idle");
  }, [discard, stopTracks]);

  // Always release devices when the component unmounts (recording cleanup).
  useEffect(
    () => () => {
      const r = recordersRef.current;
      if (r?.main.state !== "inactive") r?.main.stop();
      if (r?.audio && r.audio.state !== "inactive") r.audio.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
    },
    [],
  );

  return { status, error, stream, requestAccess, start, pause, resume, stop, discard, release };
}
