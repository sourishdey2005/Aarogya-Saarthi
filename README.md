# Aarogya Saarthi — ASHA Health Companion

Offline-first rural health co-pilot for Accredited Social Health Activists (ASHA
workers) in rural India.

* **Frontend** — Vite + React 19 + TypeScript + Tailwind CSS v4, bilingual
  (हिन्दी / English), responsive from a 360 px phone to a laptop.
* **Backend** — a single Node process with a **SQLite** database (the SQLite
  build that ships with Node), JWT auth and NVIDIA NIM for triage. No database
  server, no cloud account, no paid service.

---

## The database

**SQLite** — one file on disk (`data/aarogya.sqlite`), accessed through the
SQLite engine that is built into Node 24 (`node:sqlite`). There is nothing to
install, nothing to host and no connection string to configure.

```
data/aarogya.sqlite        # the database (created on first start)
data/aarogya.sqlite-wal    # write ahead log
data/aarogya.sqlite-shm    # shared memory index
```

| | |
| --- | --- |
| Engine | SQLite 3.53 (embedded, `node:sqlite`, no native build) |
| Files | `asha_workers`, `patients`, `symptom_logs`, `prescriptions`, `sync_queue` |
| Migrations | `db/migrations/001_init.sql`, applied automatically on start-up and tracked in the `_migrations` table |
| Concurrency | WAL journal mode, `foreign_keys = ON`, 5 s busy timeout |
| Isolation | SQLite has no row level security, so **every query is scoped by `asha_worker_id`** in the application layer, and the ids are checked against the authenticated worker. The `UNIQUE` / `CHECK` constraints are the second line of defence. |
| Images | The captured prescription photo is stored as a `BLOB` in the same file and served back by `GET /api/prescriptions/:id/image` |
| Backup | Copy the single file (`cp data/aarogya.sqlite backup/`) |

```bash
npm run db:inspect   # prints the tables, indexes and proves the constraints
```

### Using a different file

```bash
SQLITE_PATH=/var/lib/aarogya/aarogya.sqlite npm run api:dev
```

---

## Run it locally

```bash
npm install --legacy-peer-deps
cp .env.example .env

# 1. terminal 1 - the API (creates and migrates the SQLite file)
npm run api:dev                       # http://localhost:8787

# 2. terminal 2 - the frontend, pointed at the API
set "VITE_API_URL=http://localhost:8787" && npm run dev
#   (macOS / Linux: VITE_API_URL=http://localhost:8787 npm run dev)
```

Open **http://localhost:5173**. The language switch (हिन्दी / English) is in
the header on phones and in the sidebar on laptops; the choice is stored in
`localStorage`.

### Tests

```bash
npm run test:api          # 28 API tests over real HTTP against a real SQLite file
npm run test:sql          # raw SQL inserts -> curl the timeline endpoint
npm run test:integration  # frontend <-> backend in a real browser
npm run db:inspect        # shows the schema and proves the constraints
npm run lint              # type-checks frontend and backend
npm run build             # production build of the frontend
```

---

## API reference

All endpoints expect `Authorization: Bearer <JWT>`.

| Method | Path | Purpose | Success |
| --- | --- | --- | --- |
| `GET` | `/api/health` | Liveness + configuration report (public) | 200 |
| `GET` | `/api/patients` | The worker's patient list | 200 |
| `POST` | `/api/patients` | Create a patient (client generated `client_id` allowed) | 201 |
| `GET` | `/api/patients/:id/timeline` | Symptom logs + prescriptions, newest first | 200 |
| `POST` | `/api/symptom-logs` | Store a voice note, symptoms and the triage result | 201 |
| `POST` | `/api/prescriptions` | Store a scanned prescription + OCR result (photo included) | 201 |
| `GET` | `/api/prescriptions/:id/image` | The stored prescription photo | 200 |
| `GET` | `/api/sync/pending` | Pending counters for the Sync screen | 200 |
| `POST` | `/api/triage` | AI triage (never a diagnosis) | 200 |

### Idempotency (offline safety)

Every write endpoint accepts a `client_record_id` (a UUID generated on the
device). The row id **is** the client record id and the insert uses
`ON CONFLICT (id) DO NOTHING`, so a device that retries after a flaky
connection can never create a duplicate. A replay returns `200` with
`"created": false`, the first insert returns `201` with `"created": true`.

### Request examples

```bash
curl -X POST http://localhost:8787/api/patients \
  -H "authorization: Bearer $TOKEN" -H "content-type: application/json" \
  -d '{"name":"कमला देवी","age":42,"gender":"female","village":"रामपुर","client_id":"<uuid>"}'

curl -X POST http://localhost:8787/api/symptom-logs \
  -H "authorization: Bearer $TOKEN" -H "content-type: application/json" \
  -d '{"patient_id":"<uuid>","raw_transcript":"तेज़ बुखार","symptoms":["fever","rash"],
       "captured_at":"2026-01-24T10:15:00.000Z","triage_result":"visit_phc",
       "triage_advice":{"headline_hi":"PHC जाएँ","headline_en":"Visit the PHC",
       "reasoning":"...","source":"nvidia-nim"},"client_record_id":"<uuid>"}'

curl -X POST http://localhost:8787/api/prescriptions \
  -H "authorization: Bearer $TOKEN" -H "content-type: application/json" \
  -d '{"patient_id":"<uuid>","image_base64":"<base64 jpeg>","ocr_text":"ORS",
       "ocr_confidence":94,"captured_at":"2026-01-24T10:15:00.000Z","client_record_id":"<uuid>"}'
```

### AI safety rules

`POST /api/triage` **never** returns a diagnosis, a drug name or a dosage:

* the system prompt forbids diagnosis and only allows the three categories
  `home_care`, `visit_phc`, `refer_immediately`;
* the answer is parsed and validated — anything that is not one of the three
  categories becomes `visit_phc` (the conservative choice);
* if NVIDIA is unreachable or the key is missing, the endpoint returns the
  conservative fallback `{ "triage_result": "visit_phc", "triage_advice":
  { "source": "fallback" } }`;
* identical symptom combinations are cached for one hour to protect the
  40 requests/minute limit.

---

## Offline behaviour

1. `src/lib/offlineQueue.ts` stores every failed write in IndexedDB (with a
   localStorage fallback).
2. The queue is replayed when the app starts and whenever the browser fires
   the `online` event.
3. Because the queued payload keeps its `client_record_id`, replaying is
   idempotent.
4. The Sync screen shows the real `pending_count` from
   `GET /api/sync/pending` and falls back to the local counters when the
   server cannot be reached.

## Prescription images

`src/screens/ScanScreen.tsx` resizes every photo to **max 1024 px wide** and
encodes it as JPEG (quality 0.82) before uploading, which keeps the database
small. The bytes go into the `image_blob` column and are served back by
`GET /api/prescriptions/:id/image`.

---

## Project structure

```
.
├── db/migrations/001_init.sql      # SQLite schema (applied automatically)
├── server/
│   ├── api.ts                      # the HTTP server (node:http, no framework)
│   ├── db.ts                       # SQLite connection + migration runner
│   └── lib/
│       ├── auth.ts                 # JWT verification (WebCrypto HS256)
│       ├── handlers.ts              # the endpoint implementations (SQLite SQL)
│       ├── http.ts                  # JSON/CORS/error handling
│       ├── router.ts                # routing table
│       ├── triage.ts                # NVIDIA NIM + safety guard + cache
│       └── validate.ts              # request validation
├── tests/
│   ├── api.test.ts                  # 28 API tests over real HTTP
│   ├── db-inspect.mjs               # shows the schema, proves the constraints
│   ├── frontend-integration.mjs     # frontend <-> backend browser test
│   └── sql-seed-and-curl.mjs        # raw SQL -> curl the timeline
├── src/
│   ├── lib/api.ts                   # typed fetch wrappers
│   ├── lib/offlineQueue.ts          # IndexedDB write queue
│   ├── screens/…                    # the six screens
│   └── …                            # components, i18n, camera, speech
├── .env.example
└── README.md
```

## Deployment

The API is a plain Node process, so it runs anywhere that runs Node:

```bash
npm ci --legacy-peer-deps
npm run build                     # frontend
SQLITE_PATH=/var/lib/aarogya/aarogya.sqlite NEON_AUTH_SECRET=... npm run api:start
```

Point the frontend at it with `VITE_API_URL=https://api.your-domain.com` and
put the static `dist/` behind any web server. Back up the SQLite file (one
file, `cp` is enough).

## Notes and known limits

* **Authentication is not wired to a sign-in screen yet.** The API verifies a
  JWT signed with `NEON_AUTH_SECRET`; the frontend reads the token from
  `localStorage` (`setAuthToken()` in `src/lib/api.ts`) or from
  `VITE_API_TOKEN` during development. A login screen is the natural next step.
* The local API accepts a bare worker UUID as the bearer token when
  `ALLOW_DEV_AUTH=true` — **never** enable that in production.
* **NVIDIA NIM is untested live** (no key in this environment) — the prompt,
  the parser, the safety guard, the cache and the fallback are all tested.
* SQLite writes are serialised through one connection, which is perfect for a
  single ASHA worker's device or a small clinic; for a large multi-user
  deployment move the SQL layer (`server/db.ts`) to Postgres — the handlers
  are the only place that would change.
* `GET /api/patients` was added on top of the requested endpoint list so the
  patient directory can be filled from the database.
* OCR is still the mock text; the image and the OCR result are stored, the
  extraction service is not wired.
