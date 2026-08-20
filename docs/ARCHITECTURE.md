# Sniplet — Architecture

Sniplet is a full-stack URL shortener with per-link click analytics. It is a
monorepo with three cleanly separated layers:

1. **Frontend** — a Next.js 14 (App Router) + TypeScript single-page dashboard at
   the repository root.
2. **Backend** — a Node.js + Express + TypeScript REST API in `backend/` using the
   raw `pg` driver (no ORM).
3. **Database** — PostgreSQL, provisioned from `database/schema.sql`.

The layers are wired by two environment variables:

- Frontend → Backend over HTTP via **`NEXT_PUBLIC_API_URL`**.
- Backend → Database via **`DATABASE_URL`**.

```
┌──────────────────────────┐        NEXT_PUBLIC_API_URL        ┌──────────────────────────┐        DATABASE_URL         ┌───────────────┐
│  Next.js frontend (root) │  ───── fetch() JSON + JWT ─────▶  │  Express API (backend/)  │  ──── pg (parameterized) ─▶ │  PostgreSQL   │
│  app/ · components/ · src│  ◀──── JSON / 302 redirect ─────  │  helmet·cors·rate-limit  │  ◀──── rows / RETURNING ──── │ users · links │
└──────────────────────────┘                                   └──────────────────────────┘                             └───────────────┘
```

---

## Repository layout

```
sniplet/                     # repo root = Next.js frontend
├─ app/
│  ├─ layout.tsx             # root layout, metadata, global styles
│  ├─ page.tsx               # the entire dashboard (client component, state owner)
│  └─ globals.css            # dark-theme design tokens
├─ components/               # presentational client components (props-driven)
│  ├─ AuthPanel.tsx          # login / signup form with mode toggle
│  ├─ CreateLinkForm.tsx     # target-URL input → create a link
│  ├─ HeroStats.tsx          # aggregate totals (links, clicks)
│  ├─ LinksTable.tsx         # per-link rows: short URL, target, clicks, delete
│  └─ CopyButton.tsx         # copy a short URL to the clipboard
├─ src/
│  ├─ lib.ts                 # API client (the ONLY place that calls fetch)
│  └─ types.ts               # shared TS types (ShortLink, AuthResponse, ApiError)
├─ backend/
│  ├─ src/
│  │  ├─ index.ts            # process entrypoint: reads PORT, app.listen()
│  │  ├─ app.ts              # Express app: middleware + all route handlers
│  │  ├─ auth.ts             # JWT sign/verify + requireAuth middleware
│  │  ├─ db.ts               # pg Pool built from DATABASE_URL (+ conditional SSL)
│  │  └─ utils.ts            # generateSlug (crypto) + isValidUrl (SSRF-safe)
│  └─ tests/                 # api / auth / utils tests
├─ database/
│  └─ schema.sql             # users + links tables + indexes (idempotent)
└─ docs/                     # PLAN · API · SCHEMA · ARCHITECTURE · handoff notes
```

---

## Frontend architecture

The frontend is a **single-page, client-rendered dashboard**. `app/page.tsx` is a
`'use client'` component that owns *all* application state and orchestrates every
action; the `components/*` are stateless and presentational, receiving values and
callbacks as props.

### State ownership (`app/page.tsx`)

| State                         | Purpose                                                        |
|-------------------------------|----------------------------------------------------------------|
| `mode`                        | `'login'` vs `'signup'` for the auth panel.                    |
| `email`, `password`           | Auth form inputs.                                              |
| `targetUrl`                   | Create-link form input.                                       |
| `token`                       | The JWT; presence of a token == "authenticated".              |
| `links`                       | The current user's links (from `GET /links`).                 |
| `*Loading`, `deletingId`      | Per-action loading flags for disabled/spinner states.         |
| `authError`, `linkError`      | Inline error messages surfaced from the API.                  |
| `statusMessage`               | Human-readable status line in the status bar.                 |

`totalClicks` is a `useMemo` derived by summing `links[].clicks` — the aggregate
analytics figure shown in `HeroStats`.

### Session handling

- On successful signup/login the JWT and email are persisted to `localStorage`
  under `sniplet-token` / `sniplet-email`, and mirrored into React state.
- A mount-time `useEffect` rehydrates state from `localStorage`, so a refresh
  keeps the user signed in until the token expires (7 days).
- A `useEffect` keyed on `token` re-fetches links whenever the token changes
  (login, rehydrate, logout).
- If any request fails with a token-related message, the app auto-logs-out by
  clearing the stored token.

### The API client (`src/lib.ts`)

`src/lib.ts` is the single integration point with the backend — no component
calls `fetch` directly. It:

- reads the base URL from `process.env.NEXT_PUBLIC_API_URL` and throws a clear
  error if it is unset (`getApiUrl()`);
- attaches `Authorization: Bearer <token>` to protected calls;
- normalizes responses in `parseResponse<T>()`, throwing an `Error` carrying the
  backend's `{ error }` message on non-2xx responses;
- exposes `signup`, `login`, `fetchLinks`, `createLink`, `deleteLink`, and
  `getShortUrl(slug)` (which builds `${API}/r/${slug}`).

`GET /links` is fetched with `cache: 'no-store'` so click counts are always live.

---

## Backend architecture

The backend is a conventional layered Express service. `index.ts` only boots the
server; `app.ts` builds the app and defines every route so the app can be
imported directly by the tests without opening a port.

### Middleware pipeline (order matters)

```
helmet()                       # secure response headers (HSTS, nosniff, frame guard)
  → cors(allowlist)            # CORS_ORIGIN allowlist; methods GET/POST/DELETE
  → express.json({limit:16kb}) # bounded JSON body parsing
  → authLimiter                # (auth routes only) 20 req / 15 min per IP
  → requireAuth                # (protected routes only) verify JWT → req.user
  → route handler
```

`app.set('trust proxy', 1)` ensures the rate limiter keys on the real client IP
behind a single deployment proxy.

### Modules

| Module     | Responsibility                                                                                          |
|------------|---------------------------------------------------------------------------------------------------------|
| `db.ts`    | Creates a bounded `pg` `Pool` from `DATABASE_URL`; enables TLS automatically for RDS/`sslmode=require`. |
| `auth.ts`  | `createToken()`/`requireAuth()`; resolves `JWT_SECRET` (fails fast in prod, ephemeral in dev).          |
| `utils.ts` | `generateSlug()` (crypto RNG) and `isValidUrl()` (http/https only, blocks private/loopback SSRF hosts). |
| `app.ts`   | All route handlers + the middleware chain above.                                                        |
| `index.ts` | `app.listen(PORT)` — the only thing that binds a socket.                                                 |

See [`docs/API.md`](API.md) for the full endpoint contract and
[`SECURITY.md`](../SECURITY.md) for the hardening rationale.

---

## End-to-end data flow

### Creating a short link

```
User submits target URL in CreateLinkForm
  → page.tsx handleCreateLink()
  → src/lib.ts createLink(targetUrl, token)      POST {NEXT_PUBLIC_API_URL}/links  (Bearer JWT)
  → backend requireAuth → validate URL → generate unique slug → INSERT into links
  → 201 with the new row
  → page.tsx refreshLinks() → GET /links → LinksTable re-renders
```

### A visitor clicking a short link (analytics)

```
Anyone opens {NEXT_PUBLIC_API_URL}/r/:slug   (public, no auth)
  → backend UPDATE links SET clicks = clicks + 1 WHERE slug=$1 RETURNING target_url
  → 302 redirect to target_url   (404 if the slug is unknown)
  → owner later sees the incremented count via GET /links (fetched no-store)
```

Click analytics are therefore a side effect of the redirect: a single atomic
`UPDATE` both records the click and retrieves the destination.

---

## Build, run, and test

| Task                | Command                                                    |
|---------------------|------------------------------------------------------------|
| Frontend dev        | `npm run dev` (repo root)                                   |
| Frontend build      | `npm run build`                                            |
| Backend dev         | `npm run backend:dev` (or `cd backend && npm run dev`)     |
| Backend build       | `npm run backend:build` → `backend/dist/`                  |
| Backend start (prod)| `npm run backend:start` → `node dist/index.js`             |
| Apply schema        | `psql "$DATABASE_URL" -f database/schema.sql`              |
| Typecheck           | `npm run typecheck` (root) · `cd backend && npm run typecheck` |
| Backend tests       | `cd backend && npm test`                                   |

## Deployment wiring

The deploy pipeline injects the wiring variables automatically:

- `NEXT_PUBLIC_API_URL` → the frontend build (backend origin).
- `DATABASE_URL` → the backend (TLS auto-enabled for RDS/`sslmode=require`).
- `database/schema.sql` is applied before the backend starts.
- `GET /health` is the readiness/liveness probe (checks DB connectivity).

Remember to set `JWT_SECRET` (≥ 32 chars) and a `CORS_ORIGIN` allowlist in
production — see the checklist in [`SECURITY.md`](../SECURITY.md).

---

## Related documentation

- [`README.md`](../README.md) — setup and quick start.
- [`docs/README.md`](README.md) — documentation index.
- [`docs/API.md`](API.md) — full REST reference with curl examples.
- [`docs/FRONTEND.md`](FRONTEND.md) — component reference, props, and the API client.
- [`docs/SCHEMA.md`](SCHEMA.md) — database tables, indexes, and query map.
- [`SECURITY.md`](../SECURITY.md) — security model and deployment checklist.
- [`docs/PLAN.md`](PLAN.md) — original implementation plan.
