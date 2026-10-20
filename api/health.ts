/**
 * GET /api/health - lightweight app health, including which NVIDIA key the
 * deployment is configured to use.
 */
import { nvidiaKeyFromEnv } from "../server/lib/aiProxy.ts";

export const config = { runtime: "nodejs" };

export default async function handler(_req: any, res: any) {
  const hasVercelKey = Boolean(nvidiaKeyFromEnv());
  res.statusCode = 200;
  res.setHeader("content-type", "application/json");
  res.end(
    JSON.stringify({
      status: "ok",
      service: "aarogya-saarthi-api",
      database: "ok",
      nvidia_configured: hasVercelKey,
      ai_key_source: hasVercelKey ? "vercel" : "convex-fallback",
      time: new Date().toISOString(),
    })
  );
}
