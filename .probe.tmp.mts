/** Probes which structured-output mode the configured provider accepts. */
import "dotenv/config";

import { z } from "zod";

import { llmReportSchema } from "./src/features/ai-coach/schema";

/** Copy of src/lib/ai/openai.ts toStrictJsonSchema (that module is server-only). */
function toStrictJsonSchema(schema: z.ZodType): Record<string, unknown> {
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
    for (const k of ["minLength", "maxLength", "minItems", "maxItems", "pattern", "format"])
      delete obj[k];
    Object.values(obj).forEach(visit);
  };
  visit(json);
  return json;
}

const base = process.env.OPENAI_BASE_URL!;
const key = process.env.OPENAI_API_KEY!;

const small = z.object({ score: z.number(), tips: z.array(z.string()) });
const nullable = z.object({ score: z.number().nullable(), basis: z.enum(["a", "b"]) });

async function call(
  label: string,
  model: string,
  body: Record<string, unknown>,
  maxTokens?: number,
) {
  const t0 = Date.now();
  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      ...(maxTokens ? { max_completion_tokens: maxTokens } : {}),
      messages: [
        { role: "system", content: "Return only JSON matching the schema." },
        {
          role: "user",
          content:
            "Evaluate this 20-second answer: 'So, um, I told the client the launch slipped. I gave two options and we agreed on a phased release.'",
        },
      ],
      ...body,
    }),
  });
  const text = await res.text();
  const ms = Date.now() - t0;
  if (!res.ok) {
    let reason = text.slice(0, 200);
    try {
      const e = JSON.parse(text).error;
      reason = `${e.code ?? ""} ${e.message ?? ""}`.trim().slice(0, 180);
    } catch {}
    console.log(`  ${label.padEnd(44)} FAIL ${res.status} (${ms}ms) ${reason}`);
    return false;
  }
  const json = JSON.parse(text);
  const content = json.choices?.[0]?.message?.content ?? "";
  let parsed = false;
  try {
    JSON.parse(content);
    parsed = true;
  } catch {}
  console.log(
    `  ${label.padEnd(44)} OK   (${ms}ms, ${json.usage?.completion_tokens ?? "?"} out tokens, JSON parses: ${parsed})`,
  );
  return parsed;
}

const schemaOf = (schema: z.ZodType, name: string, strict: boolean) => ({
  response_format: {
    type: "json_schema",
    json_schema: { name, strict, schema: toStrictJsonSchema(schema) },
  },
});

console.log(`\nProvider: ${base}\n`);

for (const model of ["openai/gpt-oss-20b", "openai/gpt-oss-120b"]) {
  console.log(`${model}:`);
  await call("small schema, strict", model, schemaOf(small, "small", true));
  await call("nullable field, strict", model, schemaOf(nullable, "nullable", true));
  await call("full coach report, strict", model, schemaOf(llmReportSchema, "report", true));
  await call("full coach report, strict=false", model, schemaOf(llmReportSchema, "report", false));
  await call(
    "full report, strict + 8k max tokens",
    model,
    schemaOf(llmReportSchema, "report", true),
    8000,
  );
  await call("json_object mode", model, { response_format: { type: "json_object" } });
  console.log("");
}
