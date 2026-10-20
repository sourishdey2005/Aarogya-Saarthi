/**
 * POST /api/triage - AI symptom triage.
 *
 * Injects the NVIDIA API key configured in Vercel and forwards the request to
 * Convex, where the prompt, parsing and safety fallbacks live. Change the key
 * any time: Vercel dashboard -> Settings -> Environment Variables.
 */
import { forwardAiRequest } from "../server/lib/aiProxy.ts";

export const config = { runtime: "nodejs" };

export default async function handler(req: any, res: any) {
  await forwardAiRequest("/api/triage", req, res);
}
