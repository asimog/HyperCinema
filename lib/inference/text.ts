// Text inference — xAI primary, OpenRouter fallback
// KISS: two providers, nothing else.

import { fetchWithTimeout } from "@/lib/network/http";
import {
  isRetryableHttpStatus,
  RetryableError,
  withRetry,
} from "@/lib/network/retry";
import { getEnv } from "@/lib/env";
import { openRouterJson, openRouterChat } from "@/lib/ai/openrouter";

export interface TextInferenceMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

function collectXaiOutput(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";
  const r = payload as {
    output_text?: string;
    output?: Array<{
      type?: string;
      content?: Array<{ type?: string; text?: string }>;
    }>;
  };
  if (typeof r.output_text === "string" && r.output_text.trim())
    return r.output_text.trim();
  const chunks = r.output
    ?.flatMap((o) => o.content ?? [])
    .filter((c) => c.type === "output_text" || c.type === "text")
    .map((c) => c.text?.trim() ?? "")
    .filter(Boolean);
  return chunks?.join("\n").trim() ?? "";
}

async function callXai(
  messages: TextInferenceMessage[],
  model: string,
  temperature: number,
  maxTokens: number,
): Promise<string> {
  const env = getEnv();
  const key = env.XAI_TEXT_API_KEY ?? env.XAI_API_KEY;
  const base = (env.XAI_BASE_URL ?? "https://api.x.ai/v1").replace(/\/+$/, "");
  if (!key) throw new Error("XAI_API_KEY is required for text inference.");

  const res = await withRetry(
    async () => {
      const r = await fetchWithTimeout(
        `${base}/responses`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${key}`,
          },
          body: JSON.stringify({
            model,
            input: messages.map((m) => ({ role: m.role, content: m.content })),
            temperature,
            max_output_tokens: maxTokens,
          }),
        },
        30_000,
      );
      if (!r.ok) {
        const body = await r.text();
        if (isRetryableHttpStatus(r.status))
          throw new RetryableError(`xAI failed (${r.status}): ${body}`);
        throw new Error(`xAI failed (${r.status}): ${body}`);
      }
      return r;
    },
    { attempts: 3, baseDelayMs: 700, maxDelayMs: 4_000 },
  );

  const content = collectXaiOutput(await res.json());
  if (!content) throw new Error("xAI returned an empty response.");
  return content;
}

export async function generateTextInference(params: {
  provider?: string;
  model?: string | null;
  messages: TextInferenceMessage[];
  temperature?: number;
  maxTokens?: number;
}): Promise<string> {
  const env = getEnv();
  const model = params.model?.trim() || env.XAI_TEXT_MODEL || "grok-3";
  const temperature = params.temperature ?? 0.2;
  const maxTokens = params.maxTokens ?? 1200;

  // Primary: xAI
  try {
    return await callXai(params.messages, model, temperature, maxTokens);
  } catch (xAIError) {
    // Fallback: OpenRouter
    if (!env.OPENROUTER_API_KEY) throw xAIError;
    try {
      return openRouterChat({
        messages: params.messages
          .filter((m) => m.role === "system" || m.role === "user")
          .map((m) => ({
            role: m.role as "system" | "user",
            content: m.content,
          })),
        temperature,
        maxTokens,
        baseUrl: env.OPENROUTER_BASE_URL,
        model,
      });
    } catch {
      throw xAIError;
    }
  }
}

export async function generateTextInferenceJson<T>(params: {
  provider?: string;
  model?: string | null;
  messages: TextInferenceMessage[];
  temperature?: number;
  maxTokens?: number;
}): Promise<T> {
  const env = getEnv();
  const model = params.model?.trim() || env.XAI_TEXT_MODEL || "grok-3";

  // Primary: xAI
  try {
    const content = await callXai(
      params.messages,
      model,
      params.temperature ?? 0.2,
      params.maxTokens ?? 1200,
    );
    const codeBlockMatch = content.match(/```json\s*([\s\S]*?)```/i);
    const jsonText = codeBlockMatch?.[1]?.trim() ?? content;
    const start = jsonText.indexOf("{");
    const end = jsonText.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start)
      throw new Error("No JSON object found in model response");
    return JSON.parse(jsonText.slice(start, end + 1)) as T;
  } catch {
    // Fallback: OpenRouter
    if (!env.OPENROUTER_API_KEY)
      throw new Error(
        "No JSON response — xAI failed and OPENROUTER_API_KEY not set.",
      );
    return openRouterJson<T>({
      messages: params.messages
        .filter((m) => m.role === "system" || m.role === "user")
        .map((m) => ({
          role: m.role as "system" | "user",
          content: m.content,
        })),
      temperature: params.temperature,
      maxTokens: params.maxTokens,
      baseUrl: env.OPENROUTER_BASE_URL,
      model,
    });
  }
}
