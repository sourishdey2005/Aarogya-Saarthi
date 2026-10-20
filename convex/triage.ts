import { mutation, action } from "./_generated/server";
import { v } from "convex/values";

interface TriageInput {
  symptoms?: string[];
  rawTranscript?: string | null;
}

interface TriageResponse {
  triage_result: "home_care" | "visit_phc" | "refer_immediately";
  triage_advice: {
    headline_hi: string;
    headline_en: string;
    reasoning: string;
    source: string;
  };
}

// Local fallback triage (used when AI unavailable)
function fallbackTriage(): TriageResponse {
  return {
    triage_result: "visit_phc",
    triage_advice: {
      headline_hi: "24 घंटे के अंदर PHC ले जाएँ",
      headline_en: "Visit the PHC within 24 hours",
      reasoning: "AI service unavailable. Conservative referral.",
      source: "fallback",
    },
  };
}

// Keywords for simple keyword-based triage
const DANGER_KEYWORDS = [
  "chest pain", "छाती में दर्द", "सांस नहीं", "shortness of breath",
  "unconscious", "बेहोश", "severe bleeding", "तेज खून",
  "high fever", "तेज बुखार", "103", "104", "105",
  "seizure", "दौरा", "convulsion", "अकड़न",
];

const WARNING_KEYWORDS = [
  "fever", "बुखार", "cough", "खांसी", "rash", "चकत्ते",
  "pain", "दर्द", "headache", "सिरदर्द", "vomiting", "उल्टी",
  "diarrhea", "दस्त", "weakness", "कमजोरी",
];

function simpleTriage(symptoms: string[], transcript?: string | null): TriageResponse {
  const allText = [...symptoms, transcript ?? ""].join(" ").toLowerCase();

  // Check for danger signs
  for (const keyword of DANGER_KEYWORDS) {
    if (allText.includes(keyword.toLowerCase())) {
      return {
        triage_result: "refer_immediately",
        triage_advice: {
          headline_hi: "तुरंत अस्पताल ले जाएँ",
          headline_en: "Go to hospital immediately",
          reasoning: `Danger sign detected: ${keyword}`,
          source: "keyword",
        },
      };
    }
  }

  // Check for warning signs
  for (const keyword of WARNING_KEYWORDS) {
    if (allText.includes(keyword.toLowerCase())) {
      return {
        triage_result: "visit_phc",
        triage_advice: {
          headline_hi: "24 घंटे के अंदर PHC ले जाएँ",
          headline_en: "Visit the PHC within 24 hours",
          reasoning: `Warning sign detected: ${keyword}`,
          source: "keyword",
        },
      };
    }
  }

  return {
    triage_result: "home_care",
    triage_advice: {
      headline_hi: "घर पर देखभाल करें",
      headline_en: "Care at home",
      reasoning: "No danger or warning signs detected",
      source: "keyword",
    },
  };
}

export const postTriage = action({
  args: { symptoms: v.optional(v.array(v.string())), rawTranscript: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const { symptoms, rawTranscript } = args;

    if ((!symptoms || symptoms.length === 0) && !rawTranscript) {
      throw new Error("Either symptoms or raw_transcript is required");
    }

    // Try NVIDIA NIM if configured
    const nvidiaApiKey = process.env.NVIDIA_API_KEY;
    if (nvidiaApiKey) {
      try {
        const response = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${nvidiaApiKey}`,
          },
          body: JSON.stringify({
            model: "meta/llama-3.1-8b-instruct",
            messages: [
              {
                role: "system",
                content: `You are a medical triage assistant for rural India. Output ONLY valid JSON with:
{
  "triage_result": "home_care" | "visit_phc" | "refer_immediately",
  "triage_advice": {
    "headline_hi": "Hindi headline",
    "headline_en": "English headline",
    "reasoning": "Clinical reasoning",
    "source": "nvidia-nim"
  }
}
Never diagnose. Only triage. Be conservative - when in doubt, refer_up.`,
              },
              {
                role: "user",
                content: `Symptoms: ${symptoms?.join(", ") || "none"}\nTranscript: ${rawTranscript || "none"}`,
              },
            ],
            temperature: 0.1,
            max_tokens: 500,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const content = data.choices?.[0]?.message?.content?.trim();
          if (content) {
            try {
              const parsed = JSON.parse(content);
              if (parsed.triage_result && parsed.triage_advice) {
                return parsed;
              }
            } catch {
              // Fall through to fallback
            }
          }
        }
      } catch {
        // Fall through to fallback
      }
    }

    // Use simple keyword-based triage
    return simpleTriage(symptoms ?? [], rawTranscript ?? null);
  },
});

export const getHealth = query({
  args: {},
  handler: async (ctx) => {
    return {
      status: "ok",
      service: "aarogya-saarthi-api",
      database: "ok",
      database_engine: "convex",
      tables: 6,
      nvidia_configured: Boolean(process.env.NVIDIA_API_KEY),
      time: new Date().toISOString(),
    };
  },
});