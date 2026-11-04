import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { SITE_NAME } from "@/lib/site";
import { EXTRACTION_SYSTEM_PROMPT, extractedCvSchema } from "./cv-shape";

/**
 * AI providers for CV extraction. A provider is enabled only when its API key is set,
 * so nothing is ever called (or billed) unless the owner opts in via .env.local.
 * Model names are env-configurable because providers rename/retire models often.
 */
export type Provider = {
  id: "anthropic" | "groq" | "gemini" | "openrouter";
  label: string;
  enabled: boolean;
  /** Returns raw JSON-ish output; the caller validates it. */
  extract: (cvText: string) => Promise<unknown>;
};

const TIMEOUT_MS = 60_000;
const userMessage = (cvText: string) => `<cv>\n${cvText}\n</cv>`;

/** Parses a JSON object out of a model reply, tolerating ```json fences. */
function parseJsonReply(reply: string): unknown {
  const cleaned = reply.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  return JSON.parse(cleaned);
}

async function postJson(url: string, headers: Record<string, string>, body: unknown) {
  const send = () =>
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  let res = await send();
  // Free tiers are often briefly busy ("high demand", rate limits): one retry before falling back.
  if (res.status === 429 || res.status === 503) {
    await new Promise((r) => setTimeout(r, 2500));
    res = await send();
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

/** Groq and OpenRouter both speak the OpenAI chat-completions format. */
async function openAiCompatible(url: string, apiKey: string, model: string, cvText: string, extraHeaders = {}) {
  const data = await postJson(
    url,
    { Authorization: `Bearer ${apiKey}`, ...extraHeaders },
    {
      model,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: EXTRACTION_SYSTEM_PROMPT },
        { role: "user", content: userMessage(cvText) },
      ],
    },
  );
  const reply = data?.choices?.[0]?.message?.content;
  if (typeof reply !== "string") throw new Error("Empty response");
  return parseJsonReply(reply);
}

const anthropic: Provider = {
  id: "anthropic",
  label: "Claude",
  enabled: Boolean(process.env.ANTHROPIC_API_KEY),
  async extract(cvText) {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, timeout: TIMEOUT_MS, maxRetries: 1 });
    const response = await client.messages.parse({
      model: process.env.ANTHROPIC_MODEL || "claude-opus-5-5",
      max_tokens: 16000,
      system: EXTRACTION_SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage(cvText) }],
      // Extraction is simple: low effort keeps cost and latency down.
      output_config: { effort: "low", format: zodOutputFormat(extractedCvSchema) },
    });
    if (response.stop_reason === "refusal") throw new Error("Declined the request");
    if (response.stop_reason === "max_tokens") throw new Error("Response was cut off");
    if (!response.parsed_output) throw new Error("Returned no structured output");
    return response.parsed_output;
  },
};

const groq: Provider = {
  id: "groq",
  label: "Groq",
  enabled: Boolean(process.env.GROQ_API_KEY),
  extract: (cvText) =>
    openAiCompatible(
      "https://api.groq.com/openai/v1/chat/completions",
      process.env.GROQ_API_KEY!,
      process.env.GROQ_MODEL || "openai/gpt-oss-120b",
      cvText,
    ),
};

const openrouter: Provider = {
  id: "openrouter",
  label: "OpenRouter",
  enabled: Boolean(process.env.OPENROUTER_API_KEY),
  extract: (cvText) =>
    openAiCompatible(
      "https://openrouter.ai/api/v1/chat/completions",
      process.env.OPENROUTER_API_KEY!,
      process.env.OPENROUTER_MODEL || "openrouter/auto",
      cvText,
      { "X-Title": SITE_NAME },
    ),
};

const gemini: Provider = {
  id: "gemini",
  label: "Gemini",
  enabled: Boolean(process.env.GEMINI_API_KEY),
  async extract(cvText) {
    const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
    const data = await postJson(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      { "x-goog-api-key": process.env.GEMINI_API_KEY! },
      {
        systemInstruction: { parts: [{ text: EXTRACTION_SYSTEM_PROMPT }] },
        contents: [{ role: "user", parts: [{ text: userMessage(cvText) }] }],
        generationConfig: { temperature: 0, responseMimeType: "application/json" },
      },
    );
    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (typeof reply !== "string") throw new Error("Empty response");
    return parseJsonReply(reply);
  },
};

const ALL: Record<Provider["id"], Provider> = { anthropic, groq, gemini, openrouter };

/**
 * Providers to try, in order. AI_PROVIDERS (e.g. "groq,gemini") sets the order;
 * by default free-tier-friendly providers go first and Claude last.
 */
export function enabledProviders(): Provider[] {
  const order = (process.env.AI_PROVIDERS || "groq,gemini,openrouter,anthropic")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((s): s is Provider["id"] => s in ALL);
  return [...new Set(order)].map((id) => ALL[id]).filter((p) => p.enabled);
}
