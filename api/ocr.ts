/**
 * POST /api/ocr - prescription photo reading.
 *
 * Injects the NVIDIA API key configured in Vercel and forwards the request to
 * Convex, where the vision prompt and validation live. Change the key any time:
 * Vercel dashboard -> Settings -> Environment Variables.
 */
import { forwardAiRequest } from "../server/lib/aiProxy.ts";

export const config = { runtime: "nodejs" };

export default async function handler(req: any, res: any) {
  await forwardAiRequest("/api/ocr", req, res);
}
