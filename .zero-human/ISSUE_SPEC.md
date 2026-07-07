# ABH-2: Build a full-stack URL shortener called "Sniplet" with click analytics

Create a REAL full-stack web app (NOT a static demo).
- FRONTEND (Next.js 14 App Router + TypeScript, repo root): a polished dark UI to sign up/login, create short links, list them, and view per-link click counts. It MUST fetch live data from the backend via process.env.NEXT_PUBLIC_API_URL.
- BACKEND (backend/, Node.js + Express + TypeScript + pg): REST API with GET /health, POST /auth/signup, POST /auth/login (JWT), and CRUD for links (POST /links to create with a random slug, GET /links to list mine, GET /r/:slug to redirect and increment clicks, DELETE /links/:id). Reads process.env.DATABASE_URL and process.env.PORT (default 4000).
- DATABASE (database/schema.sql): CREATE TABLE IF NOT EXISTS for users (email UNIQUE + password_hash) and links (slug UNIQUE, target_url, clicks INT DEFAULT 0, owner_id).
Wire frontend->backend via NEXT_PUBLIC_API_URL and backend->db via DATABASE_URL. Every button/form must perform a real action that persists to Postgres.


---
## FULL-STACK TECH CONTRACT (mandatory unless the request is explicitly frontend/static-only)

Deliver a REAL, wired-together full-stack app — buttons and forms MUST perform real actions that persist to a database via a backend API. Do NOT ship a static frontend with mocked data.

**Repository layout (monorepo):**
- **Frontend** (repo root): Next.js 14 App Router + TypeScript. The UI is a client app that fetches live data from the backend using `process.env.NEXT_PUBLIC_API_URL`.
- **Backend** (`backend/`): Node.js + Express + TypeScript using the `pg` driver. Reads `process.env.DATABASE_URL` and `process.env.PORT` (default 4000). Exposes `GET /health`, full CRUD REST endpoints for the domain, and auth (`POST /auth/signup`, `POST /auth/login` returning a JWT). `backend/package.json` must define scripts `build` (tsc), `start` (node dist/index.js) and `main` = `dist/index.js`.
- **Database** (`database/schema.sql`): `CREATE TABLE IF NOT EXISTS` statements for a `users` table (email UNIQUE + password_hash) and all domain tables. This file is auto-applied by the deploy pipeline.

**Wiring rules:**
- Frontend → Backend over HTTP via `NEXT_PUBLIC_API_URL` (the deploy pipeline injects this automatically).
- Backend → Database via `DATABASE_URL` (the deploy pipeline injects this automatically). Use parameterized queries. Enable Postgres SSL when the URL points at RDS/AWS.
- Keep imports/exports consistent so every `npm run build` succeeds for both apps.
