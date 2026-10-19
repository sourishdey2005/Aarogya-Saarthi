/**
 * AI triage via NVIDIA NIM (OpenAI compatible endpoint).
 *
 * Safety rules baked into the prompt and enforced in code:
 *   - the model may NEVER produce a diagnosis, a drug name or a dosage;
 *   - the only allowed output is one of home_care / visit_phc /
 *     refer_immediately;
 *   - anything unexpected falls back to the conservative "visit_phc".
 */

import { TRIAGE_RESULTS, type TriageResult } from './validate.ts';

export interface TriageAdvice {
  headline_hi: string;
  headline_en: string;
  reasoning: string;
  source: string;
}

export interface TriageResponse {
  triage_result: TriageResult;
  triage_advice: TriageAdvice;
}

const NVIDIA_BASE_URL = 'https://integrate.api.nvidia.com/v1';
const NVIDIA_MODEL = 'meta/llama-3.1-8b-instruct';
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour, protects the 40 RPM limit

/** Guideline context (RAG-lite) used to ground the model. */
const GUIDELINE_CONTEXT = `
WHO IMCI / India NHM first-aid rules for community health workers:
- Home care (घर पर देखभाल): mild symptoms, no danger signs. The patient can
  drink, is alert, has no breathing difficulty and no persistent vomiting.
  Give ORS, paracetamol, rest, plenty of fluids and re-check in 24 hours.
- Visit PHC within 24 hours (PHC रेफरल): fever above 102F, a rash, persistent
  cough, diarrhoea with signs of dehydration, or symptoms that are not
  improving after 48 hours of home care. A blood test (CBC, malaria/dengue)
  is required for fever above 102F together with a rash.
- Refer immediately (तुरंत रेफर): any danger sign - difficulty breathing,
  convulsions, unconsciousness, inability to drink, severe bleeding, a very
  rapid pulse, or a rapidly worsening condition. Call 108 immediately.
Never give a diagnosis, never name a medicine, never give a dosage.
`.trim();

const SYSTEM_PROMPT = `You are a triage assistant for Accredited Social Health
Activists (ASHA workers) in rural India. You are NOT a doctor.

ABSOLUTE RULES:
1. You MUST NOT diagnose, name a disease, or prescribe any medicine or dosage.
2. You MUST answer with EXACTLY one of these three words and nothing else:
   home_care
   visit_phc
   refer_immediately
3. If the symptoms include any danger sign (breathing difficulty, convulsions,
   unconsciousness, unable to drink, severe bleeding, rapidly worsening), answer
   refer_immediately.
4. If the symptoms include fever above 102F together with a rash, or the
   patient is not improving, answer visit_phc.
5. Otherwise answer home_care.

${GUIDELINE_CONTEXT}`;

/** Conservative fallback used whenever the model is unavailable. */
export function fallbackTriage(reason = 'AI service unavailable. Conservative referral.'): TriageResponse {
  return {
    triage_result: 'visit_phc',
    triage_advice: {
      headline_hi: 'PHC जाएँ',
      headline_en: 'Visit the PHC',
      reasoning: reason,
      source: 'fallback',
    },
  };
}

const cache = new Map<string, { value: TriageResponse; expiresAt: number }>();

function cacheKey(symptoms: string[], transcript: string | null): string {
  const normalized = [...new Set(symptoms.map((s) => s.trim().toLowerCase()))].sort();
  const text = (transcript ?? '').trim().toLowerCase().slice(0, 400);
  return `${normalized.join(',')}|${text}`;
}

export function triageCacheStats(): { entries: number } {
  return { entries: cache.size };
}

export function clearTriageCache(): void {
  cache.clear();
}

/** Extracts the triage category out of a free-form model answer. */
export function parseTriageResult(raw: string): TriageResult {
  const text = raw.toLowerCase();
  // Prefer the most specific category that appears in the answer.
  if (/\brefer_immediately\b/.test(text)) return 'refer_immediately';
  if (/\bvisit_phc\b/.test(text)) return 'visit_phc';
  if (/\bhome_care\b/.test(text)) return 'home_care';
  return 'visit_phc'; // safety guard: never guess, always refer
}

function buildHeadlines(result: TriageResult): { hi: string; en: string } {
  switch (result) {
    case 'home_care':
      return { hi: 'घर पर आराम एवं तरल पदार्थ दें', en: 'Rest and fluids at home' };
    case 'refer_immediately':
      return { hi: 'तत्काल 108 एम्बुलेंस बुलाएं', en: 'Call the 108 ambulance now' };
    default:
      return { hi: '24 घंटे के अंदर PHC ले जाएँ', en: 'Visit the PHC within 24 hours' };
  }
}

export interface TriageInput {
  symptoms: string[];
  rawTranscript?: string | null;
}

/**
 * Runs the triage model. Never throws: on any failure the conservative
 * fallback is returned so the ASHA worker always gets actionable advice.
 */
export async function runTriage(input: TriageInput): Promise<TriageResponse> {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) {
    return fallbackTriage('AI service not configured. Conservative referral.');
  }

  const key = cacheKey(input.symptoms, input.rawTranscript ?? null);
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return { ...cached.value, triage_advice: { ...cached.value.triage_advice } };
  }

  const symptoms = input.symptoms.length ? input.symptoms.join(', ') : '(none listed)';
  const transcript = input.rawTranscript?.trim() || '(no transcript)';

  try {
    const response = await fetch(`${NVIDIA_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.NVIDIA_MODEL || NVIDIA_MODEL,
        temperature: 0,
        max_tokens: 32,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: `Symptoms: ${symptoms}\nPatient description: ${transcript}\n\nAnswer with exactly one word.`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      console.error('[triage] NVIDIA request failed', response.status, detail.slice(0, 300));
      return fallbackTriage(
        `AI service unavailable (HTTP ${response.status}). Conservative referral.`
      );
    }

    const payload = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const raw = payload.choices?.[0]?.message?.content ?? '';
    const result = parseTriageResult(raw);
    const headlines = buildHeadlines(result);

    const response_value: TriageResponse = {
      triage_result: result,
      triage_advice: {
        headline_hi: headlines.hi,
        headline_en: headlines.en,
        reasoning:
          'Guideline based triage from WHO IMCI / India NHM community rules. ' +
          'This is not a diagnosis.',
        source: 'nvidia-nim:' + (process.env.NVIDIA_MODEL || NVIDIA_MODEL),
      },
    };

    cache.set(key, { value: response_value, expiresAt: Date.now() + CACHE_TTL_MS });
    return response_value;
  } catch (error) {
    console.error(
      '[triage] NVIDIA request threw',
      error instanceof Error ? error.message : String(error)
    );
    return fallbackTriage('AI service unreachable. Conservative referral.');
  }
}

export const ALLOWED_TRIAGE_RESULTS = TRIAGE_RESULTS;
