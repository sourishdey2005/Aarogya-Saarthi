/**
 * Vercel -> Convex forwarder for AI requests (triage and prescription OCR).
 *
 * The NVIDIA key lives in Vercel (dashboard -> Settings -> Environment
 * Variables) so it can be rotated without touching code or running a sync
 * command. The AI logic itself stays in Convex; this function only injects the
 * key and forwards the request.
 *
 * If Vercel has no key configured the request is forwarded unchanged and
 * Convex falls back to the key stored in its own environment, so the app keeps
 * working either way.
 */

/** Convex HTTP actions host (override with CONVEX_HTTP_URL in Vercel). */
const DEFAULT_CONVEX_URL = "https://fabulous-magpie-388.convex.site";

/** Stay just under the function maxDuration so we return a clean JSON error. */
const UPSTREAM_TIMEOUT_MS = 55_000;

type ServerResponse = {
  statusCode: number;
  setHeader(name: string, value: string): void;
  end(chunk?: string | Buffer): void;
};

function sendJson(res: ServerResponse, status: number, payload: unknown): void {
  res.statusCode = status;
  res.setHeader("content-type", "application/json");
  res.end(JSON.stringify(payload));
}

/** Reads the JSON body whether Vercel parsed it or left it on the stream. */
async function readBody(req: { body?: unknown }): Promise<unknown> {
  if (req.body !== undefined && req.body !== null) return req.body;

  const chunks: Buffer[] = [];
  for await (const chunk of req as unknown as AsyncIterable<Buffer>) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

export function nvidiaKeyFromEnv(): string | undefined {
  const key = (process.env.NVIDIA_API_KEY ?? "").trim();
  return key || undefined;
}

export async function forwardAiRequest(
  path: string,
  req: { method?: string; headers?: Record<string, string | undefined>; body?: unknown },
  res: ServerResponse
): Promise<void> {
  if (req.method !== "POST") {
    sendJson(res, 405, {
      error: { code: "method_not_allowed", message: "Use POST for AI requests." },
    });
    return;
  }

  const apiKey = nvidiaKeyFromEnv();
  const convexUrl = (process.env.CONVEX_HTTP_URL || DEFAULT_CONVEX_URL).replace(/\/+$/, "");

  try {
    const body = await readBody(req);
    const upstream = await fetch(`${convexUrl}${path}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        // Only inject when Vercel owns a key; otherwise Convex uses its own.
        ...(apiKey ? { "x-nvidia-api-key": apiKey } : {}),
        ...(req.headers?.authorization
          ? { authorization: String(req.headers.authorization) }
          : {}),
      },
      body: typeof body === "string" ? body : JSON.stringify(body ?? {}),
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });

    const text = await upstream.text();
    const contentType = upstream.headers.get("content-type") ?? "";
    res.statusCode = upstream.status;
    res.setHeader(
      "content-type",
      contentType.includes("json") ? contentType : "application/json"
    );
    res.end(text || "{}");
  } catch (error) {
    console.error(
      "[ai-proxy] forward failed:",
      error instanceof Error ? error.message : String(error)
    );
    sendJson(res, 502, {
      error: {
        code: "ai_unreachable",
        message: "The AI service could not be reached. Please try again.",
      },
    });
  }
}
