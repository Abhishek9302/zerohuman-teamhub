# Sniplet — Implementation Plan (ABH-2)

> Author: The Architect · Phase: PLAN_DESIGN · Status: Implemented (plan reflects delivered code)
> Goal: Build a full-stack URL shortener called **Sniplet** with click analytics.

## 0. Scope Summary
A REAL, wired full-stack URL shortener (NOT a static demo). Users sign up / log in
(JWT), create short links backed by random slugs, list their own links, see live
per-link click counts, and delete links. A public redirect endpoint increments the
click counter and 302s to the destination. All buttons/forms persist to PostgreSQL
through the backend REST API.

**Delivery contract (mandatory):**
- Frontend (repo root): Next.js 14 App Router + TypeScript. Client app fetching live
  data via `process.env.NEXT_PUBLIC_API_URL`.
- Backend (`backend/`): Node.js + Express + TypeScript using the `pg` driver. Reads
  `process.env.DATABASE_URL` and `process.env.PORT` (default 4000). `backend/package.json`
  defines `build` (tsc), `start` (node dist/index.js) and `main = dist/index.js`.
- Database (`database/schema.sql`): idempotent `CREATE TABLE IF NOT EXISTS` for `users`
  (email UNIQUE + password_hash) and `links` (slug UNIQUE, target_url, clicks, owner_id).
  Auto-applied by the deploy pipeline.

## 1. Tech Stack (fixed)
- Frontend: Next.js 14 (App Router) + React 18 + TypeScript, `lucide-react` icons, hand-rolled dark UI (no CSS framework dependency).
- Backend: Node.js + Express + TypeScript, `pg` (raw parameterized SQL — no ORM).
- DB: PostgreSQL.
- Auth: JWT (7-day access token) + `bcryptjs` password hashing.
- Hardening: `helmet`, `express-rate-limit` (auth endpoints), CORS allowlist, JSON body cap.
- Dev tooling: `tsx` (backend watch), `tsc --noEmit` typecheck on both apps.

## 2. Repository Layout (monorepo)
```
sniplet/                         # repo root = Next.js frontend
├─ package.json                  # frontend deps + scripts (dev/build/start/typecheck + backend:* passthroughs)
├─ tsconfig.json                 # path alias @/* → repo root
├─ app/
│  ├─ layout.tsx                 # root layout, metadata, global styles
│  ├─ page.tsx                   # single-page dashboard: auth + create + list + delete
│  └─ globals.css                # dark theme tokens
├─ components/
│  ├─ AuthPanel.tsx              # signup/login form (mode toggle)
│  ├─ CreateLinkForm.tsx         # target URL input → POST /links
│  ├─ HeroStats.tsx             # aggregate stats (total links, total clicks)
│  ├─ LinksTable.tsx             # list rows: short URL, target, clicks, delete
│  └─ CopyButton.tsx             # copy short URL to clipboard
├─ src/
│  ├─ lib.ts                     # API client (signup/login/fetch/create/delete/getShortUrl)
│  └─ types.ts                   # ShortLink, AuthResponse, ApiError types
├─ backend/                      # Express API service
│  ├─ package.json               # main=dist/index.js; build=tsc; start=node dist/index.js; dev=tsx watch
│  ├─ tsconfig.json
│  ├─ src/
│  │  ├─ index.ts                # bootstrap: reads PORT, calls app.listen(...)
│  │  ├─ app.ts                  # Express app: all middleware + routes (exported so tests can import it)
│  │  ├─ db.ts                   # pg Pool from DATABASE_URL (+ conditional SSL for RDS)
│  │  ├─ auth.ts                 # JWT sign/verify + requireAuth middleware
│  │  └─ utils.ts                # generateSlug (crypto RNG) + isValidUrl (http/https + SSRF/private-host block)
│  └─ tests/                     # api / auth / utils unit + route tests
├─ database/
│  └─ schema.sql                 # users + links tables + indexes (idempotent)
└─ docs/                         # PLAN.md, SCHEMA.md, API.md, IMPLEMENTATION_NOTES.md, PEDANT_REVIEW.md
```

## 3. Database Schema (`database/schema.sql`)
Idempotent (`CREATE TABLE IF NOT EXISTS`) so the deploy pipeline can re-apply safely.

1. **users** — `id SERIAL PK`, `email TEXT UNIQUE NOT NULL`, `password_hash TEXT NOT NULL`,
   `created_at TIMESTAMPTZ DEFAULT NOW()`.
2. **links** — `id SERIAL PK`, `slug TEXT UNIQUE NOT NULL`, `target_url TEXT NOT NULL`,
   `clicks INT NOT NULL DEFAULT 0`, `owner_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE`,
   `created_at TIMESTAMPTZ DEFAULT NOW()`.

Indexes: `idx_links_owner_id (owner_id)` for per-user listing, `idx_links_slug (slug)` for
redirect lookups. `ON DELETE CASCADE` removes a user's links if the account is deleted.

See `docs/SCHEMA.md` for full column notes.

## 4. API Design (REST — JWT-protected except health/auth/redirect)
Base URL comes from the environment; the deploy pipeline injects `NEXT_PUBLIC_API_URL`.
Status codes: 200/201, 400 validation, 401 auth, 404 not found, 409 conflict, 503 capacity, 500 server.

- **GET /health** — verifies DB connectivity (`SELECT 1`); `{ok:true}` / 503 `{ok:false}`.
- **POST /auth/signup** — `{email,password}` → validates (email ≤254, password 6–72 chars),
  409 on duplicate, hashes with bcrypt, returns `{token,user}` (201). Rate-limited.
- **POST /auth/login** — `{email,password}` → verifies bcrypt hash, returns `{token,user}`;
  401 on invalid credentials (uniform message to avoid user enumeration). Rate-limited.
- **POST /links** *(auth)* — `{targetUrl}` → validates http/https URL, generates a unique
  crypto slug (retry up to 5×, else 503), inserts, returns the row (201).
- **GET /links** *(auth)* — lists the caller's links ordered by `created_at DESC`.
- **GET /r/:slug** *(public)* — atomic `UPDATE ... SET clicks = clicks + 1 ... RETURNING target_url`,
  then 302 redirect; 404 if slug unknown. This is the click-analytics counter.
- **DELETE /links/:id** *(auth)* — deletes only rows owned by the caller (`WHERE id=$1 AND owner_id=$2`);
  404 if not found/owned.

Middleware chain: `helmet` → `cors(allowlist)` → `express.json({limit:'16kb'})` →
[`authLimiter` on auth routes] → [`requireAuth` on protected routes] → handler.
All queries are parameterized (`$1,$2,...`) — no string interpolation.

## 5. Frontend (Next.js 14 App Router)
Single dashboard page (`app/page.tsx`, client component) drives the whole flow:
- **Unauthenticated:** `AuthPanel` toggles between signup/login, calls `src/lib.ts`,
  stores the JWT + email in `localStorage` (`sniplet-token`, `sniplet-email`).
- **Authenticated:** `HeroStats` (total links + aggregate clicks), `CreateLinkForm`
  (target URL → `POST /links`), `LinksTable` (short URL via `getShortUrl(slug)`, target,
  live click count, `CopyButton`, delete). Logout clears local session state.
- **Data layer:** `src/lib.ts` centralizes fetch calls, attaches `Authorization: Bearer`,
  parses errors into user-facing messages, throws when `NEXT_PUBLIC_API_URL` is unset.
- **Types:** `src/types.ts` defines `ShortLink`, `AuthResponse`, `ApiError`.
- Loading/disabled states per action (auth, create, per-row delete) and inline error text.

## 6. Wiring & Environment Variables
- **Frontend → Backend:** `NEXT_PUBLIC_API_URL` (e.g. `http://localhost:4000`). Injected by deploy.
- **Backend → DB:** `DATABASE_URL` (SSL auto-enabled when host matches `*.rds.amazonaws.com`
  or `sslmode=require`). Injected by deploy.
- **Backend config:** `PORT` (default 4000), `JWT_SECRET` (≥32 chars required in production;
  ephemeral random secret in dev), `CORS_ORIGIN` (comma-separated allowlist; permissive in dev),
  `PG_POOL_MAX` (default 10).

## 7. Security Hardening (delivered)
- Passwords hashed with bcrypt (cost 10); length capped at 72 (bcrypt truncation guard).
- JWT secret refuses weak/missing values in production.
- `helmet` security headers; `trust proxy` so rate-limit keys on real client IP.
- `express-rate-limit` (20 req / 15 min) on signup + login to slow brute-force.
- Slugs from `crypto.randomInt` (unguessable, non-enumerable).
- `isValidUrl` allows only `http:`/`https:` (blocks `javascript:`/`data:`/`file:`).
- SSRF guard: `isPrivateOrReservedHost` rejects loopback, private (RFC1918), CGNAT,
  link-local (incl. the `169.254.169.254` cloud-metadata endpoint) and unique-local IPv6
  redirect targets.
- Body size cap (16kb) and target URL length cap (2048) to bound payloads.
- Ownership checks on delete; parameterized queries everywhere.

## 8. Build / Verify Commands
- Frontend install: `npm install` (repo root); backend install: `cd backend && npm install`.
- DB apply: `psql "$DATABASE_URL" -f database/schema.sql`.
- Backend dev: `npm run backend:dev` (tsx watch) — or `cd backend && npm run dev`.
- Frontend dev: `npm run dev`.
- Typecheck: `npm run typecheck` (root) and `cd backend && npx tsc --noEmit`.
- Build: `npm run build` (Next) and `npm run backend:build` (tsc → `backend/dist`).
- Backend start (prod): `npm run backend:start` (`node dist/index.js`).
- Tests: backend unit/route tests under `backend/tests/` (utils, auth, api).

## 9. Deployment Notes
- Frontend deploys as a Next.js 14 app; set `NEXT_PUBLIC_API_URL` to the backend origin.
- Backend deploys as a Node service exposing `PORT`; `GET /health` is the readiness probe.
- Pipeline auto-applies `database/schema.sql` and injects `DATABASE_URL` / `NEXT_PUBLIC_API_URL`.
- Set a strong `JWT_SECRET` and a `CORS_ORIGIN` allowlist in production.

## 10. Handoff / Delivery Ownership
- **Grunt:** implement frontend (app/components/src), backend (index/db/auth/utils),
  schema, and docs. NO push / NO PR.
- **Pedant:** review code, verify schema + endpoints, run typecheck/build + backend tests,
  record findings in `docs/PEDANT_REVIEW.md`. NO push / NO PR.
- **Scribe:** ONLY role to `git push` the branch and open the PR.

## 11. Implementation Sequencing (recommended)
1. `database/schema.sql` — users + links + indexes.
2. Backend: `db.ts` (pool) → `utils.ts` (slug/url + SSRF guard) → `auth.ts` (JWT/middleware) →
   `app.ts` (health, auth, links CRUD, redirect + helmet/cors/rate-limit hardening) →
   `index.ts` (bootstrap that imports `app` and calls `listen`).
3. Frontend: `src/types.ts` → `src/lib.ts` (API client) → components (AuthPanel,
   CreateLinkForm, HeroStats, LinksTable, CopyButton) → `app/page.tsx` wiring + `globals.css`.
4. Wire env (`NEXT_PUBLIC_API_URL`, `DATABASE_URL`, `PORT`, `JWT_SECRET`).
5. Tests + docs (API.md, SCHEMA.md, IMPLEMENTATION_NOTES.md), then typecheck/build green.

## 12. Status vs. Delivered Code
All planned scope is present in the branch: FE dashboard wired to the API, Express backend
with the full endpoint set, idempotent Postgres schema, security hardening, backend tests,
and documentation. This plan is the authoritative reference for the ABH-2 Sniplet delivery.

**Verification (2026-07-07, HEAD `31656c3`):**
- Root frontend `npx tsc --noEmit` — clean (exit 0).
- Backend `npm run build` (tsc → `dist/`) — clean; emits `app/auth/db/index/utils.js`.
- Backend `npm test` (`tsx --test tests/*.test.ts`) — **57/57 pass**.
- Root API-client tests (`tests/*.test.ts`) — pass.
- Endpoint audit of `backend/src/app.ts` confirms all planned routes: `GET /health`,
  `POST /auth/signup`, `POST /auth/login`, `POST /links`, `GET /links`, `GET /r/:slug`,
  `DELETE /links/:id`, plus `helmet` / CORS allowlist / `express.json({limit:'16kb'})`.

**Previously-outstanding items — now RESOLVED in commit `31656c3`:**
1. **SSRF gap (`utils.test.ts`).** `isValidUrl('http://[::ffff:169.254.169.254]/')` now
   returns `false`. `isPrivateOrReservedHost` handles BOTH the dotted-decimal
   (`::ffff:a.b.c.d`) and Node-normalized compressed-hex (`::ffff:a9fe:a9fe`) forms,
   extracts the embedded IPv4, and routes it through `isPrivateIpv4`.
2. **Test-harness gap (`auth.test.ts`).** The dynamic `await import('../src/auth')` was
   moved into a `before()` hook, so `tsx --test` (CJS, no top-level await) loads the spec.

No outstanding remediation items remain; the branch is ready for Pedant review and Scribe
push/PR per §10.
