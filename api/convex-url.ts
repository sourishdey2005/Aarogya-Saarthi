import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  _req: VercelRequest,
  res: VercelResponse
) {
  const url = process.env.CONVEX_URL;
  if (!url) {
    console.error('[convex-url] CONVEX_URL environment variable not set');
    return res.status(500).json({ error: 'CONVEX_URL not configured on server' });
  }
  res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400');
  res.setHeader('Content-Type', 'application/json');
  res.status(200).send(JSON.stringify({ url }));
}