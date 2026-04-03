import { fetchWithTimeout } from "@/lib/network/http";
import { isRetryableHttpStatus, RetryableError, withRetry } from "@/lib/network/retry";
import { getEnv } from "@/lib/env";
import { openRouterJson, openRouterChat } from "@/lib/ai/openrouter";
import { getInferenceRuntimeConfig } from "@/lib/inference/config";
import {
  TextInferenceProviderId,
  TEXT_INFERENCE_PROVIDER_OPTIONS,
} from "@/lib/inference/providers";

export interface TextInferenceMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

function resolveProviderModel(provider: TextInferenceProviderId, explicitModel?: string | null): string {
  const option = TEXT_INFERENCE_PROVIDER_OPTIONS.find((entry) => entry.id === provider);
  return explicitModel?.trim() || option?.defaultModel || "default";
}

function collectXaiOutputText(payload: unknown): string {
  if (!payload || typeof payload !== "object") {
    return "";
  }

  const response = payload as {
    output_text?: string;
    output?: Array<{
      type?: string;
      content?: Array<{ type?: string; text?: string }>;
    }>;
  };

  if (typeof response.output_text === "string" && response.output_text.trim()) {
    return response.output_text.trim();
  }

  const chunks = response.output
    ?.flatMap((item) => item.content ?? [])
    .filter((item) => item.type === "output_text" || item.type === "text")
    .map((item) => item.text?.trim() ?? "")
    .filter(Boolean);

  return chunks?.join("\n").trim() ?? "";
}

async function callOpenAICompatible(input: {
  providerLabel: string;
  baseUrl: string;
  apiKey: string;
  messages: TextInferenceMessage[];
  model: string;
  temperature: number;
  maxTokens: number;
}): Promise<string> {
  const response = await withRetry(
    async () => {
      const res = await fetchWithTimeout(
        `${input.baseUrl.replace(/\/+$/, "")}/chat/completions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${input.apiKey}`,
          },
          body: JSON.stringify({
            model: input.model,
            messages: input.messages,
            temperature: input.temperature,
            max_tokens: input.maxTokens,
          }),
        },
        18_000,
      );

      if (!res.ok) {
        const body = await res.text();
        if (isRetryableHttpStatus(res.status)) {
          throw new RetryableError(
            `${input.providerLabel} retryable request failed (${res.status}): ${body}`,
          );
        }
        throw new Error(`${input.providerLabel} request failed (${res.status}): ${body}`);
      }

      return res;
    },
    { attempts: 3, baseDelayMs: 700, maxDelayMs: 4_000 },
  );

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string | null } }>;
  };
  const content = payload.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error(`${input.providerLabel} returned an empty response.`);
  }
  return content;
}

async function callXaiResponses(messages: TextInferenceMessage[], model: string, temperature: number, maxTokens: number): Promise<string> {
  const env = getEnv();
  const apiKey = env.XAI_API_KEY;
  if (!apiKey) {
    throw new Error("XAI_API_KEY is required for the xAI provider.");
  }

  const runtime = await getInferenceRuntimeConfig();
  const baseUrl = runtime.text.baseUrl ?? env.XAI_BASE_URL;

  const response = await withRetry(
    async () => {
      const res = await fetchWithTimeout(
        `${baseUrl.replace(/\/+$/, "")}/responses`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            input: messages.map((message) => ({
              role: message.role,
              content: message.content,
            })),
            temperature,
            max_output_tokens: maxTokens,
          }),
        },
        30_000,
      );

      if (!res.ok) {
        const body = await res.text();
        if (isRetryableHttpStatus(res.status)) {
          throw new RetryableError(`xAI retryable request failed (${res.status}): ${body}`);
        }
        throw new Error(`xAI request failed (${res.status}): ${body}`);
      }

      return res;
    },
    { attempts: 3, baseDelayMs: 700, maxDelayMs: 4_000 },
  );

  const payload = (await response.json()) as unknown;
  const content = collectXaiOutputText(payload);
  if (!content) {
    throw new Error("xAI returned an empty response.");
  }
  return content;
}

async function callClaude(messages: TextInferenceMessage[], model: string, temperature: number, maxTokens: number): Promise<string> {
  const env = getEnv();
  const runtime = await getInferenceRuntimeConfig();
  const apiKey = env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is required for the Claude provider.");
  }
  const baseUrl = runtime.text.baseUrl ?? env.ANTHROPIC_BASE_URL;

  const system = messages
    .filter((message) => message.role === "system")
    .map((message) => message.content)
    .join("\n\n");
  const userMessages = messages
    .filter((message) => message.role !== "system")
    .map((message) => ({
      role: message.role === "assistant" ? "assistant" : "user",
      content: message.content,
    }));

  const response = await withRetry(
    async () => {
      const res = await fetchWithTimeout(
        `${baseUrl.replace(/\/+$/, "")}/messages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model,
            max_tokens: maxTokens,
            temperature,
            system,
            messages: userMessages,
          }),
        },
        18_000,
      );

      if (!res.ok) {
        const body = await res.text();
        if (isRetryableHttpStatus(res.status)) {
          throw new RetryableError(`Claude retryable request failed (${res.status}): ${body}`);
        }
        throw new Error(`Claude request failed (${res.status}): ${body}`);
      }

      return res;
    },
    { attempts: 3, baseDelayMs: 700, maxDelayMs: 4_000 },
  );

  const payload = (await response.json()) as {
    content?: Array<{ text?: string }>;
  };
  const content = payload.content?.map((chunk) => chunk.text ?? "").join("").trim();
  if (!content) {
    throw new Error("Claude returned an empty response.");
  }
  return content;
}

async function callOllama(messages: TextInferenceMessage[], model: string, temperature: number, maxTokens: number): Promise<string> {
  const env = getEnv();
  const runtime = await getInferenceRuntimeConfig();
  const baseUrl = runtime.text.baseUrl ?? env.OLLAMA_BASE_URL;
  const response = await fetchWithTimeout(
    `${baseUrl.replace(/\/+$/, "")}/api/chat`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        stream: false,
        options: {
          temperature,
          num_predict: maxTokens,
        },
      }),
    },
    18_000,
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Ollama request failed (${response.status}): ${body}`);
  }

  const payload = (await response.json()) as {
    message?: { content?: string | null };
  };
  const content = payload.message?.content?.trim();
  if (!content) {
    throw new Error("Ollama returned an empty response.");
  }
  return content;
}

async function callHuggingFace(messages: TextInferenceMessage[], model: string, temperature: number, maxTokens: number): Promise<string> {
  const env = getEnv();
  const runtime = await getInferenceRuntimeConfig();
  const apiKey = env.HUGGINGFACE_API_TOKEN;
  if (!apiKey) {
    throw new Error("HUGGINGFACE_API_TOKEN is required for the Hugging Face provider.");
  }
  const baseUrl = runtime.text.baseUrl ?? env.HUGGINGFACE_TEXT_BASE_URL;

  const prompt = messages.map((message) => `${message.role.toUpperCase()}: ${message.content}`).join("\n\n");
  const response = await withRetry(
    async () => {
      const res = await fetchWithTimeout(
        `${baseUrl.replace(/\/+$/, "")}/${encodeURIComponent(model)}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            inputs: prompt,
            parameters: {
              temperature,
              max_new_tokens: maxTokens,
            },
          }),
        },
        25_000,
      );

      if (!res.ok) {
        const body = await res.text();
        if (isRetryableHttpStatus(res.status)) {
          throw new RetryableError(`Hugging Face retryable request failed (${res.status}): ${body}`);
        }
        throw new Error(`Hugging Face request failed (${res.status}): ${body}`);
      }

      return res;
    },
    { attempts: 3, baseDelayMs: 900, maxDelayMs: 5_000 },
  );

  const payload = (await response.json()) as Array<{ generated_text?: string } | { text?: string }>;
  const first = payload[0] as { generated_text?: string; text?: string } | undefined;
  const content = first?.generated_text?.trim() ?? first?.text?.trim() ?? "";
  if (!content) {
    throw new Error("Hugging Face returned an empty response.");
  }
  return content;
}

export async function generateTextInference(params: {
  provider?: TextInferenceProviderId;
  model?: string | null;
  messages: TextInferenceMessage[];
  temperature?: number;
  maxTokens?: number;
}): Promise<string> {
  const env = getEnv();
  const runtime = await getInferenceRuntimeConfig();
  const provider = params.provider ?? (runtime.text.provider as TextInferenceProviderId) ?? env.TEXT_INFERENCE_PROVIDER;
  const model = resolveProviderModel(provider, params.model ?? runtime.text.model ?? env.TEXT_INFERENCE_MODEL);
  const temperature = params.temperature ?? 0.2;
  const maxTokens = params.maxTokens ?? 1200;

  if (provider === "xai") {
    return callXaiResponses(params.messages, model, temperature, maxTokens);
  }

  if (provider === "openrouter") {
    const openRouterMessages = params.messages
      .filter((message) => message.role === "system" || message.role === "user")
      .map((message) => ({
        role: message.role as "system" | "user",
        content: message.content,
      }));

    if (!env.OPENROUTER_API_KEY) {
      throw new Error("OPENROUTER_API_KEY is required for the OpenRouter provider.");
    }

    return openRouterChat({
      messages: openRouterMessages,
      temperature,
      maxTokens,
      baseUrl: runtime.text.baseUrl ?? env.OPENROUTER_BASE_URL,
      model,
    });
  }

  if (provider === "openai") {
    const apiKey = env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is required for the OpenAI provider.");
    }

    return callOpenAICompatible({
      providerLabel: "OpenAI",
      baseUrl: runtime.text.baseUrl ?? env.OPENAI_BASE_URL,
      apiKey,
      messages: params.messages,
      model,
      temperature,
      maxTokens,
    });
  }

  if (provider === "claude") {
    return callClaude(params.messages, model, temperature, maxTokens);
  }

  if (provider === "ollama") {
    return callOllama(params.messages, model, temperature, maxTokens);
  }

  if (provider === "huggingface") {
    return callHuggingFace(params.messages, model, temperature, maxTokens);
  }

  if (provider === "replicate" || provider === "others") {
    if (provider === "others") {
      const baseUrl = runtime.text.baseUrl ?? env.TEXT_INFERENCE_BASE_URL;
      const apiKey = env.TEXT_INFERENCE_API_KEY;
      if (!baseUrl || !apiKey) {
        throw new Error(
          "TEXT_INFERENCE_BASE_URL and TEXT_INFERENCE_API_KEY are required for the Others provider.",
        );
      }

      return callOpenAICompatible({
        providerLabel: "Custom text API",
        baseUrl,
        apiKey,
        messages: params.messages,
        model,
        temperature,
        maxTokens,
      });
    }

    throw new Error(
      "The Replicate text provider is exposed as an option, but a direct text adapter is not wired yet.",
    );
  }

  throw new Error(`Unsupported text inference provider: ${provider}`);
}

export async function generateTextInferenceJson<T>(params: {
  provider?: TextInferenceProviderId;
  model?: string | null;
  messages: TextInferenceMessage[];
  temperature?: number;
  maxTokens?: number;
}): Promise<T> {
  const env = getEnv();
  const runtime = await getInferenceRuntimeConfig();
  const provider = params.provider ?? (runtime.text.provider as TextInferenceProviderId) ?? env.TEXT_INFERENCE_PROVIDER;
  if (provider === "openrouter") {
    const openRouterMessages = params.messages
      .filter((message) => message.role === "system" || message.role === "user")
      .map((message) => ({
        role: message.role as "system" | "user",
        content: message.content,
      }));

    return openRouterJson<T>({
      messages: openRouterMessages,
      temperature: params.temperature,
      maxTokens: params.maxTokens,
      baseUrl: runtime.text.baseUrl ?? env.OPENROUTER_BASE_URL,
      model: resolveProviderModel(provider, params.model ?? runtime.text.model ?? env.TEXT_INFERENCE_MODEL),
    });
  }

  const content = await generateTextInference(params);
  const codeBlockMatch = content.match(/```json\s*([\s\S]*?)```/i);
  const jsonText = codeBlockMatch?.[1]?.trim() ?? content;
  const start = jsonText.indexOf("{");
  const end = jsonText.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("No JSON object found in model response");
  }
  return JSON.parse(jsonText.slice(start, end + 1)) as T;
}
