# Deploy everything to Vercel (one project, one URL)

Everything lives in the same repository now: the React frontend in `src/`, the
API in `api/index.ts` + `server/` (shared with the local dev server) and the
SQLite schema in `db/migrations/001_init.sql`. `vercel.json` already wires
up the build, the function and the SPA routing — no manual configuration is
needed.

## 1. Import the project

1. Open **https://vercel.com/new**
2. Click **Import Git Repository** and select
   `sourishdey2005/Aarogya-Saarthi` (authorise Vercel for GitHub if asked).
3. Vercel auto-detects Vite from `package.json`. **Leave the defaults**:
   - Framework Preset: **Vite**
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install --legacy-peer-deps`
4. Click **Deploy**.

The first build takes ~1 minute. You get a URL like
`https://aarogya-saarthi-xxxx.vercel.app`.

## 2. What is deployed

| URL | Served by |
|---|---|
| `/` and every screen (`/patients`, `/scan`, `/referral`, `/sync`, `/registration`) | `dist/index.html` (SPA fallback via `vercel.json` rewrites) |
| `/api/health`, `/api/patients`, … | `api/index.ts` (Node 24 serverless function, max 30 s) |
| `/favicon.svg` | static asset |

The frontend calls the API on **the same origin** automatically when it runs
on Vercel (see `src/lib/api.ts`), so no `VITE_API_URL` is required.

## 3. Make the AI triage work (optional)

In the Vercel dashboard: **Project → Settings → Environment Variables**:

| Name | Value | Where to get it |
|---|---|---|
| `NVIDIA_API_KEY` | `nvapi-…` | https://build.nvidia.com → API Keys |
| `NEON_AUTH_SECRET` | a long random string | `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `ALLOW_DEV_AUTH` | `true` | only while there is no sign-in screen — **remove it later** |

Redeploy after adding them (Deployments → ⋯ → Redeploy).

## 4. ⚠️ Important — SQLite on Vercel is ephemeral

Vercel functions have a read-only filesystem except `/tmp`, and instances are
recycled. The SQLite file lives in `/tmp`, so **data is lost when the
instance is cold**. This is fine for a demo, but not for real ASHA workers.

### Option A — keep everything on Vercel (demo / preview)

Just deploy. The app works, the API works, the camera works. Data resets
occasionally; that is acceptable for a preview deployment.

### Option B — real persistence: host the API on a service with a disk

The API is a plain Node process, so it runs anywhere that runs Node. Move only
the API and keep the frontend on Vercel:

1. **Railway / Render / Fly.io / any VPS** — create a service from the same
   repo, set the start command to:
   ```
   npm run api:start
   ```
   and give it a persistent volume mounted at `/data`.

2. Set the environment variables on that service:
   ```
   SQLITE_PATH=/data/aarogya.sqlite
   NEON_AUTH_SECRET=<same value>
   NVIDIA_API_KEY=<same value>
   ALLOW_DEV_AUTH=false
   ```

3. On **Vercel**, set the build-time variable so the frontend points at the
   API:
   ```
   VITE_API_URL=https://your-api.example.com
   ```
   Then redeploy the frontend.

The two halves talk to each other over HTTPS and CORS is already enabled in
`server/lib/http.ts`.

### Option C — move the data layer to a hosted database

The SQL layer is isolated in `server/db.ts` + `server/lib/handlers.ts`. If you
want a fully managed database, swap `openDatabase()` for a Postgres client —
nothing else in the codebase changes (the handlers only call
`sql.query(text, params)`).

## 5. Verify the deployment

After the deploy finishes, open:

```
https://<your-app>.vercel.app/api/health
```

Expected:

```json
{
  "status": "ok",
  "service": "aarogya-saarthi-api",
  "database": "ok",
  "database_engine": "sqlite",
  "tables": 6,
  "nvidia_configured": false
}
```

Then open `https://<your-app>.vercel.app/scan` on a phone over HTTPS and
press the shutter — the camera test (`node scripts/camera-test.mjs`) already
proved this works end to end.

## 6. Run it locally (unchanged)

```bash
npm install --legacy-peer-deps
cp .env.example .env
npm run api:dev          # terminal 1 — http://localhost:8787
npm run dev              # terminal 2 — http://localhost:5173
```

```bash
npm run test:api          # 28 API tests
npm run test:sql          # raw SQL → curl the timeline
npm run test:integration # frontend <-> backend in a real browser
npm run db:inspect        # shows the schema, proves the constraints
npm run lint && npm run build
```
