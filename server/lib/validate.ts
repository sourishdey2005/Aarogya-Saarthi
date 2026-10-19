/** Input validation helpers used by the request handlers. */
import { HttpError } from './http.ts';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const TRIAGE_RESULTS = [
  'home_care',
  'visit_phc',
  'refer_immediately',
] as const;

export type TriageResult = (typeof TRIAGE_RESULTS)[number];

export function requireString(
  body: Record<string, unknown>,
  field: string,
  options: { max?: number; min?: number } = {}
): string {
  const value = body[field];
  if (typeof value !== 'string' || !value.trim()) {
    throw new HttpError(400, 'validation_error', `"${field}" is required`, {
      field,
    });
  }
  const trimmed = value.trim();
  if (options.min && trimmed.length < options.min) {
    throw new HttpError(
      400,
      'validation_error',
      `"${field}" must be at least ${options.min} characters`,
      { field }
    );
  }
  if (options.max && trimmed.length > options.max) {
    throw new HttpError(
      400,
      'validation_error',
      `"${field}" must be at most ${options.max} characters`,
      { field }
    );
  }
  return trimmed;
}

export function optionalString(
  body: Record<string, unknown>,
  field: string,
  options: { max?: number } = {}
): string | null {
  const value = body[field];
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string') {
    throw new HttpError(400, 'validation_error', `"${field}" must be a string`, {
      field,
    });
  }
  const trimmed = value.trim();
  if (options.max && trimmed.length > options.max) {
    throw new HttpError(
      400,
      'validation_error',
      `"${field}" must be at most ${options.max} characters`,
      { field }
    );
  }
  return trimmed;
}

export function optionalInteger(
  body: Record<string, unknown>,
  field: string,
  options: { min?: number; max?: number } = {}
): number | null {
  const value = body[field];
  if (value === undefined || value === null || value === '') return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) {
    throw new HttpError(400, 'validation_error', `"${field}" must be an integer`, {
      field,
    });
  }
  if (options.min !== undefined && parsed < options.min) {
    throw new HttpError(400, 'validation_error', `"${field}" must be >= ${options.min}`, {
      field,
    });
  }
  if (options.max !== undefined && parsed > options.max) {
    throw new HttpError(400, 'validation_error', `"${field}" must be <= ${options.max}`, {
      field,
    });
  }
  return parsed;
}

export function optionalEnum<T extends string>(
  body: Record<string, unknown>,
  field: string,
  allowed: readonly T[]
): T | null {
  const value = body[field];
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string' || !allowed.includes(value as T)) {
    throw new HttpError(
      400,
      'validation_error',
      `"${field}" must be one of: ${allowed.join(', ')}`,
      { field }
    );
  }
  return value as T;
}

export function optionalStringArray(
  body: Record<string, unknown>,
  field: string,
  options: { maxItems?: number; maxLength?: number } = {}
): string[] {
  const value = body[field];
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) {
    throw new HttpError(400, 'validation_error', `"${field}" must be an array`, {
      field,
    });
  }
  if (options.maxItems && value.length > options.maxItems) {
    throw new HttpError(
      400,
      'validation_error',
      `"${field}" must contain at most ${options.maxItems} items`,
      { field }
    );
  }
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) =>
      options.maxLength && item.length > options.maxLength
        ? item.slice(0, options.maxLength)
        : item
    );
}

/** The idempotency key every write endpoint must carry. */
export function requireClientRecordId(body: Record<string, unknown>): string {
  const value = body.client_record_id;
  if (typeof value !== 'string' || !UUID_RE.test(value)) {
    throw new HttpError(
      400,
      'validation_error',
      '"client_record_id" must be a UUID (idempotency key)',
      { field: 'client_record_id' }
    );
  }
  return value.toLowerCase();
}

export function requireUuid(body: Record<string, unknown>, field: string): string {
  const value = body[field];
  if (typeof value !== 'string' || !UUID_RE.test(value)) {
    throw new HttpError(400, 'validation_error', `"${field}" must be a UUID`, {
      field,
    });
  }
  return value.toLowerCase();
}

export function optionalUuid(
  body: Record<string, unknown>,
  field: string
): string | null {
  const value = body[field];
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string' || !UUID_RE.test(value)) {
    throw new HttpError(400, 'validation_error', `"${field}" must be a UUID`, {
      field,
    });
  }
  return value.toLowerCase();
}

/** ISO-8601 timestamp, required on offline-first write endpoints. */
export function requireTimestamp(body: Record<string, unknown>, field: string): string {
  const value = body[field];
  if (typeof value !== 'string' || !value.trim()) {
    throw new HttpError(400, 'validation_error', `"${field}" is required`, { field });
  }
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    throw new HttpError(
      400,
      'validation_error',
      `"${field}" must be an ISO-8601 timestamp`,
      { field }
    );
  }
  return new Date(parsed).toISOString();
}
