import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  _req: VercelRequest,
  res: VercelResponse
) {
  const url = process.env.CONVEX_URL;
  if (!url) {
    return res.status(500).json({ error: 'CONVEX_URL not configured' });
  }
  res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400');
  res.json({ url });
}