/**
 * HTTP helpers shared by every Neon Function: JSON parsing, CORS, error
 * handling and consistent status codes.
 */

export const CORS_HEADERS: Record<string, string> = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET,POST,PATCH,DELETE,OPTIONS',
  'access-control-allow-headers': 'authorization,content-type,x-client-record-id',
  'access-control-max-age': '86400',
};

export class HttpError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function json(
  data: unknown,
  status = 200,
  headers: Record<string, string> = {}
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      ...CORS_HEADERS,
      ...headers,
    },
  });
}

export function errorResponse(
  status: number,
  code: string,
  message: string,
  details?: unknown
): Response {
  return json({ error: { code, message, details } }, status);
}

export async function readJson(request: Request): Promise<Record<string, unknown>> {
  let raw: string;
  try {
    raw = await request.text();
  } catch {
    throw new HttpError(400, 'invalid_body', 'Could not read the request body');
  }

  if (!raw.trim()) return {};

  try {
    const parsed = JSON.parse(raw);
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new HttpError(400, 'invalid_body', 'Request body must be a JSON object');
    }
    return parsed as Record<string, unknown>;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(400, 'invalid_json', 'Request body is not valid JSON');
  }
}

/** Runs a handler and converts thrown errors into proper HTTP responses. */
export async function withErrorHandling(
  request: Request,
  handler: (request: Request) => Promise<Response>,
  context: { endpoint: string; clientRecordId?: string | null }
): Promise<Response> {
  try {
    return await handler(request);
  } catch (error) {
    const status =
      error instanceof HttpError
        ? error.status
        : error instanceof Error && 'status' in error
        ? Number((error as { status: unknown }).status) || 500
        : 500;

    const code =
      error instanceof HttpError
        ? error.code
        : error instanceof Error && 'code' in error
        ? String((error as { code: unknown }).code)
        : 'internal_error';

    // Always log the client_record_id so a failed sync can be traced.
    const log = {
      client_record_id: context.clientRecordId ?? null,
      status,
      code,
      message: error instanceof Error ? error.message : String(error),
    };

    if (status >= 500) {
      console.error(
        `[api] ${context.endpoint} failed`,
        JSON.stringify({ ...log, stack: error instanceof Error ? error.stack : undefined })
      );
    } else {
      // Expected client errors (400/401/403/404) are not worth a stack trace.
      console.warn(`[api] ${context.endpoint} -> ${status} ${code}`);
    }

    if (status >= 500) {
      return errorResponse(status, code, 'Internal server error');
    }
    return errorResponse(
      status,
      code,
      error instanceof Error ? error.message : 'Request failed',
      error instanceof HttpError ? error.details : undefined
    );
  }
}

/** Handles the CORS preflight. */
export function preflight(): Response {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}
