/**
 * End-to-end smoke test for the AI path.
 *
 * Runs the real Vercel forwarder (`server/lib/aiProxy.ts`) against the live
 * Convex deployment, so it proves the whole production chain works:
 *
 *   script -> forwardAiRequest (key injection) -> Convex -> NVIDIA NIM
 *
 * Usage:
 *   npm run test:ai        # uses NVIDIA_API_KEY from .env
 *
 * Makes real NVIDIA calls (~10-15s each).
 */
import "dotenv/config";
import { readFileSync } from "node:fs";

if (!process.env.NVIDIA_API_KEY) {
  console.error("NVIDIA_API_KEY is missing. Add it to .env first.");
  process.exit(1);
}

const { forwardAiRequest } = await import(
  new URL("../server/lib/aiProxy.ts", import.meta.url).href
);

function callForwarder(path, req) {
  return new Promise((resolve, reject) => {
    const res = {
      statusCode: 0,
      headers: {},
      setHeader(name, value) {
        this.headers[name] = value;
      },
      end(chunk) {
        this.body = chunk?.toString?.() ?? String(chunk ?? "");
        resolve({ status: this.statusCode, headers: this.headers, body: this.body });
      },
    };

    Promise.resolve(forwardAiRequest(path, req, res)).catch(reject);
    setTimeout(() => reject(new Error(`timeout calling ${path}`)), 60_000).unref();
  });
}

function show(label, result) {
  let printable = result.body;
  if (printable.length > 600) printable = `${printable.slice(0, 600)}...`;
  console.log(`\n${label}: ${result.status}`);
  console.log(printable);
}

console.log("Running the Vercel AI proxy against the live Convex deployment...");

const triage = await callForwarder("/api/triage", {
  method: "POST",
  headers: {},
  body: {
    symptoms: ["chest pain", "difficulty breathing"],
    raw_transcript: "Seene mein dard aur saans lene mein takleef.",
  },
});
show("TRIAGE", triage);

let ocr = null;
let imageBase64 = null;
try {
  imageBase64 = readFileSync(
    `${process.env.TEMP}/prescription-test.jpg`
  ).toString("base64");
} catch {
  console.log("\nOCR: skipped (no sample prescription image at %TEMP%)");
}

if (imageBase64) {
  ocr = await callForwarder("/api/ocr", {
    method: "POST",
    headers: { authorization: "Bearer test-token" },
    body: { image_base64: imageBase64, mime_type: "image/jpeg" },
  });
  show("OCR", ocr);
}

const triageOk = triage.status === 200 && triage.body.includes("nvidia-nim");
const ocrOk = !ocr || (ocr.status === 200 && ocr.body.includes("medicines"));

console.log(`\n${triageOk && ocrOk ? "OK" : "FAILED"}: AI proxy path`);
process.exit(triageOk && ocrOk ? 0 : 1);
