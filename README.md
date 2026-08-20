# Sniplet

Sniplet is a full-stack URL shortener with account-based link management and click analytics.

It includes:
- a Next.js 14 frontend with a polished dark interface
- a Node.js + Express + TypeScript backend API
- PostgreSQL persistence for users and links
- JWT-based signup/login
- short-link creation, listing, deletion, and redirect click tracking

## ABH-2 overview
The ABH-2 ticket asked for a **real full-stack web app**, not a static demo. The current branch implements that scope as a working frontend + backend + database-backed system named **Sniplet**.

## What was built
### Frontend
The repo root contains a Next.js 14 App Router application that:
- signs users up with email + password
- logs users in and stores session auth state in the UI
- creates short links against the live backend API
- lists the signed-in user's links
- displays per-link click counts
- deletes existing links
- builds redirect URLs from `process.env.NEXT_PUBLIC_API_URL`

### Backend
The `backend/` service provides a TypeScript Express API with:
- `GET /health`
- `POST /auth/signup`
- `POST /auth/login`
- `POST /links` to create a short link with a generated slug
- `GET /links` to list the authenticated user's links
- `GET /r/:slug` to redirect and increment click counts
- `DELETE /links/:id` to remove one of the authenticated user's links

### Database
The `database/schema.sql` file creates the required PostgreSQL schema:
- `users` table with unique email and password hash
- `links` table with unique slug, target URL, click counter, and owner relationship
- indexes for owner and slug lookup

## Tech stack
- Next.js 14
- React 18
- TypeScript
- Node.js
- Express
- PostgreSQL
- `pg`
- JWT authentication
- bcrypt password hashing

## Project structure
- `app/` — Next.js App Router entrypoints and UI shell
- `components/` — frontend UI components
- `src/` — frontend API helpers and shared types
- `backend/` — Express API server, auth, db access, and utilities
- `database/schema.sql` — PostgreSQL schema
- `docs/ARCHITECTURE.md` — system architecture and data flow
- `docs/API.md` — REST API reference
- `docs/SCHEMA.md` — database schema reference
- `docs/IMPLEMENTATION_NOTES.md` — architecture and release handoff summary
- `docs/PEDANT_REVIEW.md` — prior QA review artifact from the ABH-1 (TeamHub) branch

## Setup
Install dependencies from the repository root:

```bash
npm install
```

Install backend dependencies:

```bash
cd backend
npm install
```

## Environment variables
### Frontend
Create an environment file for the Next.js app and set:

```bash
NEXT_PUBLIC_API_URL=http://localhost:4000
```

### Backend
Create an environment file inside `backend/` and set:

```bash
DATABASE_URL=postgres://postgres:postgres@localhost:5432/sniplet
PORT=4000
JWT_SECRET=your-development-secret

# Optional (recommended in production)
CORS_ORIGIN=http://localhost:3000
NODE_ENV=development
PG_POOL_MAX=10
```

Backend environment variables at a glance:

| Variable       | Required | Default          | Purpose                                                           |
|----------------|----------|------------------|-------------------------------------------------------------------|
| `DATABASE_URL` | yes      | —                | Postgres connection string (startup fails if unset)              |
| `PORT`         | no       | `4000`           | Port the API listens on                                           |
| `JWT_SECRET`   | prod     | ephemeral (dev)  | JWT signing secret — **must be ≥ 32 chars in production**         |
| `CORS_ORIGIN`  | prod     | permissive       | Comma-separated allowlist of browser origins                      |
| `NODE_ENV`     | no       | —                | Set to `production` to enforce the strict `JWT_SECRET` rule       |
| `PG_POOL_MAX`  | no       | `10`             | Max Postgres connection-pool size                                 |

In production the server **refuses to start** unless `JWT_SECRET` is at least 32
characters. In development an ephemeral secret is generated automatically if one
is not provided (tokens are then invalidated on restart). TLS to Postgres is
enabled automatically for `sslmode=require` / AWS RDS connection strings. See
[`SECURITY.md`](SECURITY.md) for the full security model.

## Database setup
Apply the schema in `database/schema.sql` to your PostgreSQL database before starting the backend.

Example:

```bash
psql "$DATABASE_URL" -f database/schema.sql
```

If you are running that command from inside `backend/`, reference the file as `../database/schema.sql` instead.

## How to run
### 1. Start PostgreSQL
Make sure your PostgreSQL server is running and matches `DATABASE_URL`.

### 2. Start the backend
From `backend/`:

```bash
npm run dev
```

The backend defaults to port `4000` when `PORT` is not set.

### 3. Start the frontend
From the repo root:

```bash
npm run dev
```

Then open the local URL shown by Next.js.

## How the app works
1. Create an account or log in.
2. Submit a destination URL.
3. Sniplet creates a random short slug and stores it in PostgreSQL.
4. The dashboard lists your saved links and live click totals.
5. Visiting `/r/:slug` on the backend increments the click counter and redirects to the target URL.

## Useful commands
### Frontend
```bash
npm run dev
npm run build
npm run typecheck
```

### Backend
```bash
cd backend
npm run dev    # tsx watch src/index.ts
npm run build  # tsc -p tsconfig.json -> dist/
npm run start  # node dist/index.js
```

## Release readiness
For ABH-2, the repository now contains the expected full-stack delivery shape:
- live frontend-to-backend API wiring through `NEXT_PUBLIC_API_URL`
- backend-to-Postgres wiring through `DATABASE_URL`
- real persistence for users and links
- click analytics via redirect counting
- deployment-facing documentation and handoff notes

### Deployment checklist
Before cutting a release or merging the automated PR, confirm:
- PostgreSQL is reachable from the backend runtime
- `database/schema.sql` has been applied to the target database
- backend env includes `DATABASE_URL`, `PORT`, and a strong `JWT_SECRET`
- frontend env includes `NEXT_PUBLIC_API_URL` pointing to the deployed backend base URL
- browser CORS origin is allowed by backend configuration
- smoke test passes for signup, login, create link, list links, delete link, and redirect click counting

## Documentation
Start at the documentation index: [`docs/README.md`](docs/README.md).

- **Architecture:** `docs/ARCHITECTURE.md` — how the frontend, backend, and database fit together, state ownership, the middleware pipeline, and end-to-end data flow (including click analytics).
- **API reference:** `docs/API.md` — every endpoint, request/response shape, auth rules, rate limiting, error codes, data model, and end-to-end curl examples.
- **Frontend reference:** `docs/FRONTEND.md` — component-by-component props, the state model, session handling, and the API client.
- **Database schema:** `docs/SCHEMA.md` — the `users` and `links` tables, indexes, and the query map for each endpoint.
- **Security:** `SECURITY.md` — auth model, secret handling, input validation, transport/CORS hardening, and deployment checklist.

## Handoff documents
- Implementation handoff: `docs/IMPLEMENTATION_NOTES.md`
- Prior QA review (ABH-1 / TeamHub branch): `docs/PEDANT_REVIEW.md`
- Release notes: `CHANGELOG.md`
