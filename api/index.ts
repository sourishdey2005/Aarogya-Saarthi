/**
 * Vercel serverless function - the whole API in one file.
 *
 *   https://<your-app>.vercel.app/api/patients
 *
 * It reuses exactly the same handlers as the local server (server/api.ts),
 * so the behaviour is identical in both places.
 *
 * NOTE about SQLite on Vercel: the function filesystem is read only except for
 * /tmp, and instances are recycled, so the database file lives in /tmp and is
 * EPHEMERAL. That is fine for a demo, but for real use keep the API on a host
 * with a persistent disk (Railway, Render, Fly.io, a VPS) and point the
 * frontend at it, or move the SQL layer to a hosted database.
 */
import { handleRequest } from '../server/lib/router.ts';
import { getDatabase } from '../server/db.ts';

export const config = { runtime: 'nodejs' };

/* eslint-disable @typescript-eslint/no-explicit-any */
export default async function handler(req: any, res: any) {
  try {
    const host = req.headers.host ?? 'localhost';
    const url = `https://${host}${req.url ?? '/'}`;

    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(chunk as Buffer);
    const body = Buffer.concat(chunks);

    const request = new Request(url, {
      method: req.method ?? 'GET',
      headers: (req.headers ?? {}) as Record<string, string>,
      body: ['GET', 'HEAD'].includes((req.method ?? 'GET').toUpperCase())
        ? undefined
        : body,
    });

    const response = await handleRequest(request, { sql: getDatabase() });

    res.statusCode = response.status;
    response.headers.forEach((value, key) => res.setHeader(key, value));
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch (error) {
    console.error('[api] unhandled error', error);
    res.statusCode = 500;
    res.setHeader('content-type', 'application/json');
    res.end(
      JSON.stringify({ error: { code: 'internal_error', message: 'Internal server error' } })
    );
  }
}
