/**
 * Aarogya Saarthi API server.
 *
 * One Node process, one SQLite file, no other services:
 *
 *   npm run api:dev        # http://localhost:8787
 *   npm run api:start      # same, but binds 0.0.0.0 for a phone on the LAN
 *
 * The database (data/aarogya.sqlite) is created and migrated automatically
 * on start-up, so a fresh clone works with a single command.
 */
import http from 'node:http';
import { pathToFileURL } from 'node:url';
import { databaseFile, openDatabase, type SqlClient } from './db.ts';
import { handleRequest } from './lib/router.ts';

const DEV_USER_ID = process.env.DEV_USER_ID ?? '00000000-0000-0000-0000-000000000001';

export interface ApiServerOptions {
  sql: SqlClient;
  port?: number;
  host?: string;
  devUserId?: string;
}

export interface ApiServer {
  url: string;
  port: number;
  close: () => Promise<void>;
}

/** Creates the HTTP server (the database is opened by the caller). */
export function createApiServer(options: ApiServerOptions): http.Server {
  const devUserId = options.devUserId ?? DEV_USER_ID;

  // The local server accepts a plain UUID as the bearer token instead of a
  // signed Neon Auth JWT. This is a development-only shortcut.
  process.env.ALLOW_DEV_AUTH = process.env.ALLOW_DEV_AUTH ?? 'true';

  return http.createServer(async (req, res) => {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(chunk as Buffer);
    const body = Buffer.concat(chunks);

    const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);

    // Local auth: the bearer token may be a plain worker UUID.
    const authorization = req.headers.authorization;
    const rawToken = authorization?.replace(/^Bearer\s+/i, '').trim();
    const userId =
      rawToken && /^[0-9a-f-]{36}$/i.test(rawToken) ? rawToken : devUserId;

    const request = new Request(url.toString(), {
      method: req.method,
      headers: req.headers as Record<string, string>,
      body: ['GET', 'HEAD'].includes(req.method ?? 'GET') ? undefined : body,
    });

    try {
      const response = await handleRequest(request, { sql: options.sql });
      res.writeHead(response.status, Object.fromEntries(response.headers.entries()));
      res.end(Buffer.from(await response.arrayBuffer()));
      if (process.env.API_LOG !== 'false') {
        console.log(`[api] ${req.method} ${url.pathname} -> ${response.status}`);
      }
    } catch (error) {
      console.error('[api] unhandled error', error);
      res.writeHead(500, { 'content-type': 'application/json' });
      res.end(
        JSON.stringify({ error: { code: 'internal_error', message: 'Internal server error' } })
      );
    }
  });
}

/** Starts the server on an ephemeral port and resolves with its URL. */
export async function startApiServer(options: ApiServerOptions): Promise<ApiServer> {
  const server = createApiServer(options);
  await new Promise<void>((resolve) =>
    server.listen(options.port ?? 0, options.host ?? '127.0.0.1', resolve)
  );
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : Number(options.port);
  return {
    url: `http://127.0.0.1:${port}`,
    port,
    close: () =>
      new Promise<void>((resolve) => {
        server.close(() => resolve());
      }),
  };
}

/* ------------------------------------------------------------------ CLI --- */
const isDirectRun =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  const port = Number(process.env.API_PORT ?? 8787);
  const host = process.env.API_HOST ?? '0.0.0.0';
  const file = databaseFile();

  const sql = openDatabase(file);
  console.log(`[api] SQLite database: ${file}`);

  const server = createApiServer({ sql, port, host });
  server.listen(port, host, () => {
    console.log(`[api] Aarogya Saarthi API listening on http://localhost:${port}`);
    console.log('[api] routes: POST /api/patients, GET /api/patients,');
    console.log('[api]         POST /api/symptom-logs, POST /api/prescriptions,');
    console.log('[api]         GET /api/patients/:id/timeline, GET /api/prescriptions/:id/image,');
    console.log('[api]         GET /api/sync/pending, POST /api/triage');
  });
}
