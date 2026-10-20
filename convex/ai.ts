/**
 * Shared NVIDIA NIM client (OpenAI-compatible chat completions).
 *
 * Used by every AI workflow in the app (triage today, and any future
 * OCR/summary helper). Configuration comes from the deployment environment so
 * the same code runs locally (`.env`) and on Convex Cloud (`npx convex env set`).
 */

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export const DEFAULT_NVIDIA_BASE_URL = "https://integrate.api.nvidia.com/v1";
export const DEFAULT_NVIDIA_MODEL = "nvidia/nemotron-3.5-lightning-30b-a3b";

function readEnv(name: string): string | undefined {
  const value = process.env[name];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function readNumber(name: string, fallback: number): number {
  const raw = readEnv(name);
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function readBoolean(name: string, fallback: boolean): boolean {
  const raw = readEnv(name)?.toLowerCase();
  if (!raw) return fallback;
  return raw === "1" || raw === "true" || raw === "yes" || raw === "on";
}

export interface NvidiaConfig {
  apiKey?: string;
  baseUrl: string;
  model: string;
  temperature: number;
  topP: number;
  maxTokens: number;
  reasoningBudget: number;
  enableThinking: boolean;
}

export function nvidiaConfig(): NvidiaConfig {
  const maxTokens = readNumber("NVIDIA_MAX_TOKENS", 16384);
  return {
    apiKey: readEnv("NVIDIA_API_KEY"),
    baseUrl: (readEnv("NVIDIA_BASE_URL") ?? DEFAULT_NVIDIA_BASE_URL).replace(/\/+$/, ""),
    model: readEnv("NVIDIA_MODEL") ?? DEFAULT_NVIDIA_MODEL,
    temperature: readNumber("NVIDIA_TEMPERATURE", 1),
    topP: readNumber("NVIDIA_TOP_P", 0.95),
    maxTokens,
    reasoningBudget: readNumber("NVIDIA_REASONING_BUDGET", Math.min(maxTokens, 16384)),
    enableThinking: readBoolean("NVIDIA_ENABLE_THINKING", true),
  };
}

export function isNvidiaConfigured(): boolean {
  return Boolean(nvidiaConfig().apiKey);
}

export interface NvidiaChatOptions {
  messages: ChatMessage[];
  temperature?: number;
  topP?: number;
  maxTokens?: number;
  reasoningBudget?: number;
  enableThinking?: boolean;
}

export interface NvidiaChatResult {
  content: string;
  reasoning: string;
  model: string;
}

interface ChatCompletionPayload {
  choices?: {
    message?: {
      content?: string | null;
      reasoning_content?: string | null;
      reasoning?: string | null;
    };
  }[];
  error?: { message?: string };
}

function buildRequestBody(config: NvidiaConfig, options: NvidiaChatOptions) {
  return {
    model: config.model,
    messages: options.messages,
    temperature: options.temperature ?? config.temperature,
    top_p: options.topP ?? config.topP,
    max_tokens: options.maxTokens ?? config.maxTokens,
    reasoning_budget: options.reasoningBudget ?? config.reasoningBudget,
    chat_template_kwargs: {
      enable_thinking: options.enableThinking ?? config.enableThinking,
    },
    stream: false,
  };
}

async function postCompletion(
  config: NvidiaConfig,
  body: ReturnType<typeof buildRequestBody>
): Promise<Response> {
  return fetch(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify(body),
  });
}

/**
 * Calls the model and returns both the answer (`content`) and the model's
 * private chain of thought (`reasoning`, when the model exposes it).
 */
export async function nvidiaChat(options: NvidiaChatOptions): Promise<NvidiaChatResult> {
  const config = nvidiaConfig();
  if (!config.apiKey) {
    throw new Error("NVIDIA_API_KEY is not configured");
  }

  const baseBody = buildRequestBody(config, options);
  let response = await postCompletion(config, baseBody);

  // Some models reject the reasoning/thinking extras. Retry once without them.
  if (response.status === 400) {
    const detail = await response.text().catch(() => "");
    console.warn("[ai] retrying without reasoning extras:", detail.slice(0, 200));
    const minimal = { ...baseBody } as Record<string, unknown>;
    delete minimal.reasoning_budget;
    delete minimal.chat_template_kwargs;
    response = await postCompletion(config, minimal as unknown as ReturnType<typeof buildRequestBody>);
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `NVIDIA NIM request failed (HTTP ${response.status}): ${detail.slice(0, 300)}`
    );
  }

  const payload = (await response.json()) as ChatCompletionPayload;
  const message = payload.choices?.[0]?.message;

  return {
    content: message?.content ?? "",
    reasoning: message?.reasoning_content ?? message?.reasoning ?? "",
    model: config.model,
  };
}

/** Pulls the first JSON object out of a model answer (handles code fences). */
export function extractJson<T>(text: string): T | null {
  if (!text) return null;

  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced ? fenced[1] : text).trim();

  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;

  try {
    return JSON.parse(candidate.slice(start, end + 1)) as T;
  } catch {
    return null;
  }
}
