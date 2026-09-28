import "server-only";

import { z } from "zod";

import { AppError, type AppErrorCode } from "@/lib/errors";
import { logger } from "@/lib/logger";

/**
 * Minimal OpenAI(-compatible) REST client using fetch. Kept dependency-free on
 * purpose: we only need JSON-schema chat completions and audio transcription.
 * The API key never leaves the server.
 */

export type OpenAIConfig = {
  apiKey: string;
  baseUrl: string;
  model: string;
  transcriptionModel: string;
  maxOutputTokens: number;
};

export function getOpenAIConfig(): OpenAIConfig {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new AppError("EXTERNAL_SERVICE", "AI service is not configured.", {
      cause: new Error("OPENAI_API_KEY is missing"),
    });
  }
  return {
    apiKey,
    baseUrl: (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, ""),
    model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
    transcriptionModel: process.env.OPENAI_TRANSCRIPTION_MODEL || "whisper-1",
    // The coach report runs ~2k output tokens. Providers that cap completions
    // lower than that fail with truncated JSON, so ask for headroom explicitly.
    maxOutputTokens: Number(process.env.OPENAI_MAX_OUTPUT_TOKENS) || 4096,
  };
}

class RetryableError extends Error {
  constructor(
    message: string,
    readonly retryAfterMs: number | null = null,
  ) {
    super(message);
  }
}

type RequestOptions = {
  timeoutMs: number;
  retries: number;
  errorCode: AppErrorCode;
  userMessage: string;
  signal?: AbortSignal;
};

async function requestWithRetry(
  url: string,
  init: () => RequestInit,
  opts: RequestOptions,
): Promise<unknown> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= opts.retries; attempt++) {
    const timeout = AbortSignal.timeout(opts.timeoutMs);
    const signal = opts.signal ? AbortSignal.any([opts.signal, timeout]) : timeout;
    try {
      const res = await fetch(url, { ...init(), signal });
      if (res.ok) return await res.json();
      const body = await res.text().catch(() => "");
      const err = new Error(`OpenAI ${res.status}: ${body.slice(0, 500)}`);
      if (res.status === 429 || res.status >= 500) {
        // Rate-limited providers tell us how long to wait; honour it (capped).
        const retryAfter = Number(res.headers.get("retry-after"));
        throw new RetryableError(
          err.message,
          Number.isFinite(retryAfter) ? retryAfter * 1000 : null,
        );
      }
      throw err; // 4xx: not retryable
    } catch (error) {
      lastError = error;
      const aborted = opts.signal?.aborted;
      const retryable =
        !aborted &&
        (error instanceof RetryableError ||
          (error instanceof Error &&
            (error.name === "TimeoutError" || error.name === "TypeError")));
      if (!retryable || attempt === opts.retries) break;
      const suggested = error instanceof RetryableError ? error.retryAfterMs : null;
      const delay =
        suggested !== null
          ? Math.min(30_000, suggested)
          : Math.min(8000, 500 * 2 ** attempt) + Math.random() * 250;
      logger.warn("openai.retry", { attempt: attempt + 1, delay: Math.round(delay) });
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  const timedOut = lastError instanceof Error && lastError.name === "TimeoutError";
  throw new AppError(
    opts.errorCode,
    timedOut ? `${opts.userMessage} The request timed out.` : opts.userMessage,
    { cause: lastError },
  );
}

/** Makes a JSON schema acceptable to OpenAI strict structured outputs. */
export function toStrictJsonSchema(schema: z.ZodType): Record<string, unknown> {
  const json = z.toJSONSchema(schema, { target: "draft-7", io: "input" }) as Record<
    string,
    unknown
  >;
  delete json.$schema;
  const visit = (node: unknown): void => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) return node.forEach(visit);
    const obj = node as Record<string, unknown>;
    if (obj.type === "object" && obj.properties && typeof obj.properties === "object") {
      obj.additionalProperties = false;
      obj.required = Object.keys(obj.properties as object);
    }
    // Keywords not supported by strict mode; validation happens with Zod afterwards.
    for (const k of ["minLength", "maxLength", "minItems", "maxItems", "pattern", "format"]) {
      delete obj[k];
    }
    Object.values(obj).forEach(visit);
  };
  visit(json);
  return json;
}

export async function chatJson<T extends z.ZodType>(params: {
  schema: T;
  schemaName: string;
  system: string;
  user: string;
  temperature?: number;
  maxOutputTokens?: number;
  timeoutMs?: number;
  retries?: number;
  signal?: AbortSignal;
}): Promise<{ data: z.infer<T>; model: string }> {
  const cfg = getOpenAIConfig();
  const body = JSON.stringify({
    model: cfg.model,
    temperature: params.temperature ?? 0.3,
    max_completion_tokens: params.maxOutputTokens ?? cfg.maxOutputTokens,
    messages: [
      { role: "system", content: params.system },
      { role: "user", content: params.user },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: params.schemaName,
        strict: true,
        schema: toStrictJsonSchema(params.schema),
      },
    },
  });

  const json = (await requestWithRetry(
    `${cfg.baseUrl}/chat/completions`,
    () => ({
      method: "POST",
      headers: { Authorization: `Bearer ${cfg.apiKey}`, "Content-Type": "application/json" },
      body,
    }),
    {
      timeoutMs: params.timeoutMs ?? 60_000,
      retries: params.retries ?? 2,
      errorCode: "AI_ANALYSIS",
      userMessage: "The AI coach couldn't analyze your speech right now.",
      signal: params.signal,
    },
  )) as {
    model?: string;
    choices?: { finish_reason?: string; message?: { content?: string; refusal?: string } }[];
  };

  // A truncated completion produces invalid JSON; say so precisely.
  if (json.choices?.[0]?.finish_reason === "length") {
    throw new AppError("AI_ANALYSIS", "The AI coach's response was cut off. Please try again.", {
      cause: new Error(
        `finish_reason=length (max_completion_tokens=${params.maxOutputTokens ?? cfg.maxOutputTokens}). Raise OPENAI_MAX_OUTPUT_TOKENS or use a larger model.`,
      ),
    });
  }
  const message = json.choices?.[0]?.message;
  if (message?.refusal) {
    throw new AppError("AI_ANALYSIS", "The AI coach declined to analyze this content.", {
      cause: new Error(message.refusal),
    });
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(message?.content ?? "");
  } catch (cause) {
    throw new AppError("AI_ANALYSIS", "The AI coach returned an unreadable response.", { cause });
  }
  const result = params.schema.safeParse(parsed);
  if (!result.success) {
    throw new AppError("AI_ANALYSIS", "The AI coach returned an unexpected response.", {
      cause: result.error,
    });
  }
  return { data: result.data, model: json.model ?? cfg.model };
}

export type OpenAIVerboseTranscription = {
  text: string;
  language?: string;
  duration?: number;
  segments?: { start: number; end: number; text: string }[];
  words?: { word: string; start: number; end: number }[];
};

export async function transcribeAudio(params: {
  audio: Uint8Array;
  mimeType: string;
  filename: string;
  prompt?: string;
  language?: string;
  timeoutMs?: number;
  signal?: AbortSignal;
}): Promise<OpenAIVerboseTranscription & { model: string }> {
  const cfg = getOpenAIConfig();
  // Whisper models return verbose_json with segment/word timestamps (OpenAI's
  // whisper-1 and Groq's whisper-large-v3*). Other speech models return plain
  // text, and the pipeline degrades gracefully: no filler timeline, no
  // long-pause detection, and pace falls back to the session timer.
  const supportsTimestamps = /whisper/i.test(cfg.transcriptionModel);
  const json = (await requestWithRetry(
    `${cfg.baseUrl}/audio/transcriptions`,
    () => {
      const form = new FormData();
      form.set(
        "file",
        new Blob([params.audio as Uint8Array<ArrayBuffer>], { type: params.mimeType }),
        params.filename,
      );
      form.set("model", cfg.transcriptionModel);
      form.set("response_format", supportsTimestamps ? "verbose_json" : "json");
      if (supportsTimestamps) {
        form.append("timestamp_granularities[]", "segment");
        form.append("timestamp_granularities[]", "word");
      }
      if (params.prompt) form.set("prompt", params.prompt.slice(0, 800));
      if (params.language) form.set("language", params.language);
      return { method: "POST", headers: { Authorization: `Bearer ${cfg.apiKey}` }, body: form };
    },
    {
      timeoutMs: params.timeoutMs ?? 120_000,
      retries: 2,
      errorCode: "TRANSCRIPTION",
      userMessage: "We couldn't transcribe your recording right now.",
      signal: params.signal,
    },
  )) as OpenAIVerboseTranscription;
  return { ...json, model: cfg.transcriptionModel };
}
