import { action, query } from "./_generated/server";
import { v } from "convex/values";
import {
  extractJson,
  isNvidiaConfigured,
  nvidiaChat,
  nvidiaConfig,
  nvidiaConfigWithKey,
  nvidiaVisionConfig,
} from "./ai";

type TriageResult = "home_care" | "visit_phc" | "refer_immediately";

interface TriageAdvice {
  headline_hi: string;
  headline_en: string;
  reasoning: string;
  source: string;
}

interface TriageResponse {
  triage_result: TriageResult;
  triage_advice: TriageAdvice;
}

const ALLOWED: TriageResult[] = ["home_care", "visit_phc", "refer_immediately"];

/** Guideline context (RAG-lite) used to ground the model. */
const GUIDELINE_CONTEXT = `
WHO IMCI / India NHM first-aid rules for community health workers:
- home_care: mild symptoms, no danger signs. The patient can drink, is alert,
  has no breathing difficulty and no persistent vomiting. ORS, rest, fluids,
  re-check in 24 hours.
- visit_phc: fever above 102F, a rash, persistent cough, diarrhoea with signs of
  dehydration, or symptoms not improving after 48 hours of home care.
- refer_immediately: any danger sign - chest pain, difficulty breathing,
  convulsions, unconsciousness, inability to drink, severe bleeding, very rapid
  pulse, or a rapidly worsening condition. Call 108 immediately.
Never diagnose, never name a medicine, never give a dosage.
`.trim();

const SYSTEM_PROMPT = `You are a triage assistant for Accredited Social Health
Activists (ASHA workers) in rural India. You are NOT a doctor.

ABSOLUTE RULES:
1. Never diagnose, name a disease, prescribe a medicine or a dosage.
2. Answer ONLY with a JSON object, no prose, no markdown, using this shape:
{
  "triage_result": "home_care" | "visit_phc" | "refer_immediately",
  "triage_advice": {
    "headline_hi": "short Hindi instruction",
    "headline_en": "short English instruction",
    "reasoning": "one sentence, guideline based, not a diagnosis",
    "source": "nvidia-nim"
  }
}
   headline_hi must be written only in Devanagari Hindi script (no Latin
   letters). headline_en must be written in English only.
3. If any danger sign is present -> refer_immediately.
4. Fever above 102F with a rash, or no improvement -> visit_phc.
5. Otherwise -> home_care.

${GUIDELINE_CONTEXT}`;

function headlinesFor(result: TriageResult): { hi: string; en: string } {
  switch (result) {
    case "home_care":
      return { hi: "घर पर आराम एवं तरल पदार्थ दें", en: "Rest and fluids at home" };
    case "refer_immediately":
      return { hi: "तत्काल 108 एम्बुलेंस बुलाएं", en: "Call the 108 ambulance now" };
    default:
      return { hi: "24 घंटे के अंदर PHC ले जाएँ", en: "Visit the PHC within 24 hours" };
  }
}

/** Danger signs that must always escalate to an immediate referral. */
const DANGER_KEYWORDS = [
  "chest pain", "छाती में दर्द", "सांस नहीं", "shortness of breath",
  "difficulty breathing", "unconscious", "बेहोश", "severe bleeding", "तेज खून",
  "high fever", "तेज बुखार", "103", "104", "105",
  "seizure", "दौरा", "convulsion", "अकड़न",
];

/** Warning signs that need a PHC visit within 24 hours. */
const WARNING_KEYWORDS = [
  "fever", "बुखार", "cough", "खांसी", "rash", "चकत्ते",
  "pain", "दर्द", "headache", "सिरदर्द", "vomiting", "उल्टी",
  "diarrhea", "दस्त", "weakness", "कमजोरी",
];

function matchesAny(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase();
  return keywords.some((keyword) => lower.includes(keyword.toLowerCase()));
}

/**
 * Safety net: a danger sign in the report forces `refer_immediately` whatever
 * the model answered. The model runs at temperature 1, so this keeps the
 * dangerous case deterministic.
 */
function applyDangerSignGuard(
  response: TriageResponse,
  inputText: string
): TriageResponse {
  if (response.triage_result === "refer_immediately") return response;
  if (!matchesAny(inputText, DANGER_KEYWORDS)) return response;

  console.warn(
    `[triage] danger sign escalated from ${response.triage_result} to refer_immediately`
  );
  const headlines = headlinesFor("refer_immediately");
  return {
    triage_result: "refer_immediately",
    triage_advice: {
      headline_hi: headlines.hi,
      headline_en: headlines.en,
      reasoning:
        "A danger sign is described in the report. Immediate referral is required " +
        "regardless of other findings.",
      source: response.triage_advice.source,
    },
  };
}

/** Keyword triage used when the AI is unavailable. */
function simpleTriage(symptoms: string[], transcript?: string | null): TriageResponse {
  const allText = [...symptoms, transcript ?? ""].join(" ").toLowerCase();

  let result: TriageResult = "home_care";
  let reasoning = "No danger or warning signs detected.";
  const source = "keyword";

  if (matchesAny(allText, DANGER_KEYWORDS)) {
    result = "refer_immediately";
    reasoning = "A danger sign was detected in the description.";
  } else if (matchesAny(allText, WARNING_KEYWORDS)) {
    result = "visit_phc";
    reasoning = "Warning signs require a PHC check within 24 hours.";
  }

  const headlines = headlinesFor(result);
  return {
    triage_result: result,
    triage_advice: {
      headline_hi: headlines.hi,
      headline_en: headlines.en,
      reasoning,
      source,
    },
  };
}

function normalizeResult(value: unknown): TriageResult | null {
  return typeof value === "string" && (ALLOWED as string[]).includes(value)
    ? (value as TriageResult)
    : null;
}

/** Finds a category anywhere in free-form text (safety net for non-JSON replies). */
function classifyText(text: string): TriageResult | null {
  const lower = text.toLowerCase();
  if (/\brefer_immediately\b/.test(lower)) return "refer_immediately";
  if (/\bvisit_phc\b/.test(lower)) return "visit_phc";
  if (/\bhome_care\b/.test(lower)) return "home_care";
  return null;
}

/**
 * The model sometimes returns mixed-script headlines ("Fौरंत 108 karein").
 * A headline only counts as Hindi when Devanagari outnumbers Latin letters.
 */
function looksLikeHindi(text: string): boolean {
  const devanagari = (text.match(/[\u0900-\u097F]/g) ?? []).length;
  const latin = (text.match(/[A-Za-z]/g) ?? []).length;
  return devanagari > 0 && latin <= devanagari;
}

function looksLikeEnglish(text: string): boolean {
  return /[A-Za-z]{2}/.test(text);
}

function buildResponse(
  result: TriageResult,
  advice: Partial<TriageAdvice> | undefined,
  source: string,
  fallbackReasoning: string
): TriageResponse {
  const headlines = headlinesFor(result);
  const modelHi = advice?.headline_hi?.trim() ?? "";
  const modelEn = advice?.headline_en?.trim() ?? "";
  return {
    triage_result: result,
    triage_advice: {
      headline_hi: looksLikeHindi(modelHi) ? modelHi : headlines.hi,
      headline_en: looksLikeEnglish(modelEn) ? modelEn : headlines.en,
      reasoning: advice?.reasoning?.trim() || fallbackReasoning,
      source,
    },
  };
}

export const postTriage = action({
  args: {
    symptoms: v.optional(v.array(v.string())),
    rawTranscript: v.optional(v.string()),
    apiKey: v.optional(v.string()),
  },
  handler: async (_ctx, args): Promise<TriageResponse> => {
    const { symptoms, rawTranscript } = args;
    // Key injected by the Vercel proxy wins over the deployment env.
    const config = nvidiaConfigWithKey(args.apiKey);

    if ((!symptoms || symptoms.length === 0) && !rawTranscript) {
      throw new Error("Either symptoms or raw_transcript is required");
    }

    if (!isNvidiaConfigured(config)) {
      return simpleTriage(symptoms ?? [], rawTranscript ?? null);
    }

    const symptomText = symptoms?.length ? symptoms.join(", ") : "(none listed)";
    const transcript = rawTranscript?.trim() || "(no transcript)";

    try {
      const completion = await nvidiaChat(
        {
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            {
              role: "user",
              content: `Symptoms: ${symptomText}\nPatient description: ${transcript}\n\nReturn the JSON object only.`,
            },
          ],
        },
        config
      );

      const source = `nvidia-nim:${completion.model}`;
      const parsed =
        extractJson<{ triage_result?: unknown; triage_advice?: Partial<TriageAdvice> }>(
          completion.content
        ) ??
        extractJson<{ triage_result?: unknown; triage_advice?: Partial<TriageAdvice> }>(
          completion.reasoning
        );

      const result =
        normalizeResult(parsed?.triage_result) ??
        classifyText(completion.content) ??
        classifyText(completion.reasoning);

      if (result) {
        const inputText = [...(symptoms ?? []), rawTranscript ?? ""].join(" ");
        return applyDangerSignGuard(
          buildResponse(
            result,
            parsed?.triage_advice,
            source,
            "Guideline based triage from WHO IMCI / India NHM community rules. This is not a diagnosis."
          ),
          inputText
        );
      }

      return simpleTriage(symptoms ?? [], rawTranscript ?? null);
    } catch (error) {
      console.error(
        "[triage] NVIDIA request failed",
        error instanceof Error ? error.message : String(error)
      );
      return simpleTriage(symptoms ?? [], rawTranscript ?? null);
    }
  },
});

export const getHealth = query({
  args: {},
  handler: async () => {
    const config = nvidiaConfig();
    return {
      status: "ok",
      service: "aarogya-saarthi-api",
      database: "ok",
      database_engine: "convex",
      tables: 6,
      nvidia_configured: isNvidiaConfigured(),
      ai_provider: "nvidia-nim",
      ai_model: config.model,
      ai_vision_model: nvidiaVisionConfig().model,
      time: new Date().toISOString(),
    };
  },
});
