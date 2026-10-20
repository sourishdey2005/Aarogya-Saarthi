import { action } from "./_generated/server";
import { v } from "convex/values";
import {
  extractJson,
  isNvidiaConfigured,
  nvidiaVisionChat,
  nvidiaVisionConfig,
} from "./ai";

interface RawMedicine {
  name?: unknown;
  strength?: unknown;
  frequency?: unknown;
  duration?: unknown;
  instructions?: unknown;
}

interface RawExtraction {
  medicines?: RawMedicine[];
  ocr_text?: unknown;
  ocr_confidence?: unknown;
}

export interface ExtractedMedicine {
  name: string;
  strength: string;
  frequency: string;
  duration: string;
  instructions: string;
}

const SYSTEM_PROMPT = `You read photographed prescriptions for ASHA workers in rural India.
Return ONLY a JSON object with this shape:
{
  "medicines": [
    {
      "name": "medicine name exactly as written",
      "strength": "e.g. 500 mg",
      "frequency": "e.g. twice a day / 1-0-1",
      "duration": "e.g. 3 days",
      "instructions": "e.g. after food, at night"
    }
  ],
  "ocr_text": "verbatim text from the slip, one line per item",
  "ocr_confidence": 0
}

RULES:
- Never invent, translate or substitute a medicine. Copy it as written.
- Use an empty string for any field that is not readable.
- Include every medicine line you can read (up to 20).
- If the photo is not a prescription or is unreadable, return
  {"medicines": [], "ocr_text": "", "ocr_confidence": 0}.
- No markdown, no explanation, JSON only.`;

function asText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asConfidence(value: unknown, fallback: number): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.min(100, Math.round(parsed)));
}

/**
 * Reads a prescription photo with an NVIDIA vision model. The image is sent as
 * a data URL; the caller must already have resized/compressed it.
 */
export const extractPrescription = action({
  args: {
    imageBase64: v.string(),
    mimeType: v.optional(v.string()),
  },
  handler: async (_ctx, args) => {
    if (!isNvidiaConfigured()) {
      throw new Error(
        "AI scanner is not configured. Add NVIDIA_API_KEY to the Convex deployment."
      );
    }

    const image = args.imageBase64.replace(/^data:[^;]+;base64,/, "").trim();
    if (!image) throw new Error("Prescription image is required");
    if (image.length > 1_400_000) {
      throw new Error("Image is too large. Please retake the photo.");
    }

    const mimeType =
      args.mimeType && /^image\/(jpeg|png|webp)$/i.test(args.mimeType)
        ? args.mimeType
        : "image/jpeg";

    const config = nvidiaVisionConfig();
    const completion = await nvidiaVisionChat({
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            { type: "text", text: "Extract the prescription as JSON." },
            {
              type: "image_url",
              image_url: { url: `data:${mimeType};base64,${image}` },
            },
          ],
        },
      ],
    });

    const parsed =
      extractJson<RawExtraction>(completion.content) ??
      extractJson<RawExtraction>(completion.reasoning);

    if (!parsed) {
      throw new Error(
        "Could not read this prescription. Please retake the photo in good light."
      );
    }

    const medicines: ExtractedMedicine[] = (Array.isArray(parsed.medicines)
      ? parsed.medicines
      : []
    )
      .map((item) => ({
        name: asText(item?.name),
        strength: asText(item?.strength),
        frequency: asText(item?.frequency),
        duration: asText(item?.duration),
        instructions: asText(item?.instructions),
      }))
      .filter((item) => item.name.length > 0)
      .slice(0, 20);

    if (medicines.length === 0) {
      throw new Error(
        "No medicines were found. Please retake the photo so the slip fills the frame."
      );
    }

    return {
      medicines,
      ocr_text:
        asText(parsed.ocr_text) ||
        medicines
          .map((item) => [item.name, item.strength, item.frequency, item.duration].filter(Boolean).join(" - "))
          .join("\n"),
      ocr_confidence: asConfidence(parsed.ocr_confidence, 70),
      source: `nvidia-nim:${config.model}`,
    };
  },
});
