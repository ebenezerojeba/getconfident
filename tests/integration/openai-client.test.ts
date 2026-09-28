/* eslint-disable @typescript-eslint/no-explicit-any -- inspecting arbitrary generated JSON Schema */
import { z } from "zod";

import { normalizeOpenAITranscription } from "@/features/transcription/normalize";
import { chatJson, toStrictJsonSchema, transcribeAudio } from "@/lib/ai/openai";

const schema = z.object({ score: z.number(), tips: z.array(z.string()).min(1) });

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
const completion = (content: string) =>
  jsonResponse({ model: "gpt-test", choices: [{ message: { content } }] });

describe("OpenAI client (mocked fetch)", () => {
  const originalFetch = globalThis.fetch;
  beforeEach(() => {
    process.env.OPENAI_API_KEY = "sk-test";
    process.env.OPENAI_BASE_URL = "https://api.example.test/v1";
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
    delete process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_BASE_URL;
    vi.restoreAllMocks();
  });

  it("sends a strict JSON-schema request and validates the result", async () => {
    const fetchMock = vi.fn().mockResolvedValue(completion('{"score": 82, "tips": ["Pause"]}'));
    globalThis.fetch = fetchMock;
    const { data, model } = await chatJson({ schema, schemaName: "t", system: "s", user: "u" });
    expect(data).toEqual({ score: 82, tips: ["Pause"] });
    expect(model).toBe("gpt-test");
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.example.test/v1/chat/completions");
    expect(init.headers.Authorization).toBe("Bearer sk-test");
    const body = JSON.parse(init.body);
    expect(body.response_format.json_schema.strict).toBe(true);
    expect(body.response_format.json_schema.schema.additionalProperties).toBe(false);
  });

  it("retries 429/5xx then succeeds", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ error: "rate" }, 429))
      .mockResolvedValueOnce(jsonResponse({ error: "boom" }, 503))
      .mockResolvedValueOnce(completion('{"score": 1, "tips": ["x"]}'));
    globalThis.fetch = fetchMock;
    const { data } = await chatJson({
      schema,
      schemaName: "t",
      system: "s",
      user: "u",
      retries: 2,
    });
    expect(data.score).toBe(1);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  }, 20_000);

  it("does not retry 4xx client errors and never leaks provider details", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ error: "invalid key sk-..." }, 401));
    globalThis.fetch = fetchMock;
    const err = await chatJson({ schema, schemaName: "t", system: "s", user: "u" }).catch((e) => e);
    expect(err).toMatchObject({ code: "AI_ANALYSIS" });
    expect(err.message).not.toMatch(/sk-|401|invalid key/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("times out slow requests with a friendly error", async () => {
    globalThis.fetch = vi.fn(
      (_url: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () =>
            reject(Object.assign(new Error("timeout"), { name: "TimeoutError" })),
          );
        }),
    ) as typeof fetch;
    const err = await chatJson({
      schema,
      schemaName: "t",
      system: "s",
      user: "u",
      timeoutMs: 50,
      retries: 0,
    }).catch((e) => e);
    expect(err).toMatchObject({ code: "AI_ANALYSIS" });
    expect(err.message).toMatch(/timed out/);
  });

  it("rejects malformed and schema-violating output", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(completion("not json at all"));
    await expect(
      chatJson({ schema, schemaName: "t", system: "s", user: "u" }),
    ).rejects.toMatchObject({
      message: expect.stringMatching(/unreadable/),
    });
    globalThis.fetch = vi.fn().mockResolvedValue(completion('{"score": "high", "tips": []}'));
    await expect(
      chatJson({ schema, schemaName: "t", system: "s", user: "u" }),
    ).rejects.toMatchObject({
      message: expect.stringMatching(/unexpected/),
    });
  });

  it("surfaces model refusals", async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(
        jsonResponse({ choices: [{ message: { refusal: "no", content: null } }] }),
      );
    await expect(
      chatJson({ schema, schemaName: "t", system: "s", user: "u" }),
    ).rejects.toMatchObject({
      message: expect.stringMatching(/declined/),
    });
  });

  it("fails clearly when no API key is configured", async () => {
    delete process.env.OPENAI_API_KEY;
    await expect(
      chatJson({ schema, schemaName: "t", system: "s", user: "u" }),
    ).rejects.toMatchObject({
      code: "EXTERNAL_SERVICE",
    });
  });

  it("requests word+segment timestamps from whisper-1 and normalizes them", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        text: "  Hello   um world ",
        language: "english",
        duration: 3.2,
        segments: [
          { start: 0, end: 1.5, text: " Hello um " },
          { start: 1.6, end: 1.2, text: "bad" },
          { start: 1.6, end: 3.2, text: " world" },
        ],
        words: [
          { word: "Hello", start: 0, end: 0.4 },
          { word: "um", start: 0.6, end: 0.8 },
          { word: " ", start: 1, end: 1 },
          { word: "world", start: 1.6, end: 2 },
        ],
      }),
    );
    globalThis.fetch = fetchMock;
    const raw = await transcribeAudio({
      audio: new Uint8Array([1, 2, 3]),
      mimeType: "audio/webm",
      filename: "a.webm",
      prompt: "Topic",
    });
    const form = fetchMock.mock.calls[0][1].body as FormData;
    expect(form.get("model")).toBe("whisper-1");
    expect(form.get("response_format")).toBe("verbose_json");
    expect(form.getAll("timestamp_granularities[]")).toEqual(["segment", "word"]);

    const t = normalizeOpenAITranscription(raw);
    expect(t.text).toBe("Hello um world");
    expect(t.durationSec).toBe(3.2);
    expect(t.segments).toHaveLength(2); // invalid segment dropped
    expect(t.words?.map((w) => w.word)).toEqual(["Hello", "um", "world"]);
  });
});

describe("toStrictJsonSchema", () => {
  it("makes every object strict with all keys required and strips unsupported keywords", () => {
    const s = toStrictJsonSchema(
      z.object({
        a: z.string().min(2),
        b: z.object({ c: z.number().nullable() }),
        d: z.array(z.string()).max(3),
      }),
    ) as Record<string, any>;
    expect(s.additionalProperties).toBe(false);
    expect(s.required).toEqual(["a", "b", "d"]);
    expect(s.properties.b.additionalProperties).toBe(false);
    expect(s.properties.b.required).toEqual(["c"]);
    expect(s.properties.a.minLength).toBeUndefined();
    expect(s.properties.d.maxItems).toBeUndefined();
    expect(s.$schema).toBeUndefined();
  });
});

describe("coach report JSON schema", () => {
  it("converts the full LLM report schema to a strict schema", async () => {
    const { llmReportSchema } = await import("@/features/ai-coach/schema");
    const s = toStrictJsonSchema(llmReportSchema) as Record<string, any>;
    expect(s.required).toContain("dimensions");
    expect(s.properties.dimensions.required).toHaveLength(16);
    const clarity = s.properties.dimensions.properties.clarity;
    expect(clarity.additionalProperties).toBe(false);
    // nullable score is expressed as a union including null
    expect(JSON.stringify(clarity.properties.score)).toContain("null");
    expect(JSON.stringify(s)).not.toMatch(/"(minLength|maxItems|minItems|format)"/);
  });
});

describe("OpenAI-compatible providers", () => {
  const originalFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = originalFetch;
    delete process.env.OPENAI_TRANSCRIPTION_MODEL;
    delete process.env.OPENAI_BASE_URL;
    delete process.env.OPENAI_API_KEY;
    vi.restoreAllMocks();
  });

  it("requests timestamps from any whisper model and honours a custom base URL", async () => {
    process.env.OPENAI_API_KEY = "gsk_test";
    process.env.OPENAI_BASE_URL = "https://api.groq.com/openai/v1";
    process.env.OPENAI_TRANSCRIPTION_MODEL = "whisper-large-v3";
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ text: "hello", duration: 1, segments: [], words: [] }));
    globalThis.fetch = fetchMock;

    await transcribeAudio({
      audio: new Uint8Array([1, 2, 3]),
      mimeType: "audio/webm",
      filename: "a.webm",
    });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.groq.com/openai/v1/audio/transcriptions");
    const form = init.body as FormData;
    expect(form.get("model")).toBe("whisper-large-v3");
    expect(form.get("response_format")).toBe("verbose_json");
    expect(form.getAll("timestamp_granularities[]")).toEqual(["segment", "word"]);
  });

  it("falls back to plain JSON for non-whisper speech models", async () => {
    process.env.OPENAI_API_KEY = "sk-test";
    process.env.OPENAI_TRANSCRIPTION_MODEL = "gpt-4o-transcribe";
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ text: "hello" }));
    globalThis.fetch = fetchMock;

    await transcribeAudio({
      audio: new Uint8Array([1, 2, 3]),
      mimeType: "audio/webm",
      filename: "a.webm",
    });

    const form = fetchMock.mock.calls[0][1].body as FormData;
    expect(form.get("response_format")).toBe("json");
    expect(form.getAll("timestamp_granularities[]")).toEqual([]);
  });
});
