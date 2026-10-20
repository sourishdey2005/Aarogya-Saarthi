/**
 * Tiny router shared by the Neon Function entry points and the local
 * development server. One implementation, one set of handlers.
 */

import { authenticate, AuthError } from './auth.ts';
import {
  CORS_HEADERS,
  HttpError,
  errorResponse,
  json,
  preflight,
  readJson,
  withErrorHandling,
} from './http.ts';
import { getDatabase, type SqlClient } from '../db.ts';
import {
  createPatient,
  createPrescription,
  createSymptomLog,
  ensureWorker,
  getHealth,
  getPatientTimeline,
  getPrescriptionImage,
  getSyncPending,
  listPatients,
  login,
  me,
  postTriage,
  signup,
  type HandlerContext,
} from './handlers.ts';

export interface HandlerResult {
  status: number;
  body: unknown;
  headers?: Record<string, string>;
}

export interface RouteDefinition {
  method: string;
  pattern: RegExp;
  keys: string[];
  handler: (ctx: HandlerContext) => Promise<HandlerResult>;
  /** Endpoints that do not need an authenticated worker. */
  public?: boolean;
}

const route = (
  method: string,
  path: string,
  handler: RouteDefinition['handler'],
  options: { public?: boolean } = {}
): RouteDefinition => {
  const keys: string[] = [];
  const pattern = new RegExp(
    `^${path.replace(/:[A-Za-z_]+/g, (match) => {
      keys.push(match.slice(1));
      return '([^/]+)';
    })}$`
  );
  return { method, pattern, keys, handler, public: options.public };
};

export const ROUTES: RouteDefinition[] = [
  route('GET', '/api/health', getHealth, { public: true }),
  route('POST', '/api/auth/signup', signup, { public: true }),
  route('POST', '/api/auth/login', login, { public: true }),
  route('GET', '/api/auth/me', me),
  route('GET', '/api/patients', listPatients),
  route('POST', '/api/patients', createPatient),
  route('GET', '/api/patients/:id/timeline', getPatientTimeline),
  route('POST', '/api/symptom-logs', createSymptomLog),
  route('POST', '/api/prescriptions', createPrescription),
  route('GET', '/api/prescriptions/:id/image', getPrescriptionImage),
  route('GET', '/api/sync/pending', getSyncPending),
  route('POST', '/api/triage', postTriage),
];

/** Strips the mount path a function was deployed under. */
export function normalisePath(url: string, basePath = ''): string {
  const path = new URL(url).pathname.replace(/\/+$/, '') || '/';
  if (basePath && path.startsWith(basePath)) {
    const stripped = path.slice(basePath.length) || '/';
    return stripped.startsWith('/') ? stripped : `/${stripped}`;
  }
  return path;
}

/**
 * Finds the route for a request. The full path is tried first; if nothing
 * matches, progressively shorter suffixes are tried so the same function
 * works whether the platform strips the mount path or not.
 */
function matchRoute(method: string, path: string) {
  const candidates: string[] = [path];
  let index = path.indexOf('/', 1);
  while (index !== -1) {
    candidates.push(path.slice(index));
    index = path.indexOf('/', index + 1);
  }

  for (const candidate of candidates) {
    for (const definition of ROUTES) {
      if (definition.method !== method) continue;
      const match = definition.pattern.exec(candidate);
      if (match) return { definition, match, candidate };
    }
  }
  return null;
}

export interface RouterOptions {
  /** Optional SQL client override (local dev / tests). */
  sql?: SqlClient;
  /** Path prefix the function is mounted under, e.g. "/api". */
  basePath?: string;
}

/**
 * Handles a request end to end: routing, authentication, body parsing and
 * error mapping.
 */
export async function handleRequest(
  request: Request,
  options: RouterOptions = {}
): Promise<Response> {
  const basePath = options.basePath ?? '';
  const path = normalisePath(request.url, basePath);
  const method = request.method.toUpperCase();

  if (method === 'OPTIONS') return preflight();

  const matched = matchRoute(method, path);

  if (!matched) {
    // Distinguish "wrong method" from "unknown path".
    const pathExists = ROUTES.some((definition) => definition.pattern.test(path));
    if (pathExists) {
      return errorResponse(405, 'method_not_allowed', `${method} is not allowed on ${path}`);
    }
    return errorResponse(404, 'not_found', `No route for ${method} ${path}`);
  }

  const { definition, match } = matched;
  const params: Record<string, string> = {};
  definition.keys.forEach((key, index) => {
    params[key] = decodeURIComponent(match[index + 1]);
  });

  // Parse the body up front so that a malformed payload can be reported with
  // the right status code and so the client_record_id is available for logs.
  let body: Record<string, unknown> = {};
  if (method !== 'GET' && method !== 'HEAD') {
    try {
      body = await readJson(request);
    } catch (error) {
      return withErrorHandling(
        request,
        async () => {
          throw error;
        },
        {
          endpoint: `${method} ${path}`,
          clientRecordId: request.headers.get('x-client-record-id'),
        }
      );
    }
  }

  const clientRecordId =
    (typeof body.client_record_id === 'string' ? body.client_record_id : null) ??
    request.headers.get('x-client-record-id');

  return withErrorHandling(
    request,
    async (req) => {
      const sql = options.sql ?? getDatabase();

      let worker = null;
      if (!definition.public) {
        const user = await authenticate(req.headers.get('authorization'));
        worker = await ensureWorker(sql, user.id, {
          name: user.name,
          village: (req.headers.get('x-asha-village') ?? undefined) as string | undefined,
        });
      }

      const result = await definition.handler({
        sql,
        worker: worker as never,
        body,
        params,
        query: new URL(req.url).searchParams,
        request: req,
      });

      // Binary payloads (the stored prescription photo) are returned as-is.
      if (result.headers && (result.body instanceof Uint8Array || Buffer.isBuffer(result.body))) {
        return new Response(result.body as BodyInit, {
          status: result.status,
          headers: { ...CORS_HEADERS, ...result.headers },
        });
      }

      return json(result.body, result.status);
    },
    { endpoint: `${method} ${path}`, clientRecordId }
  );
}

export { AuthError, HttpError };
