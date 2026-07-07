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
- `docs/PEDANT_REVIEW.md` — testing/review handoff artifact
- `docs/IMPLEMENTATION_NOTES.md` — architecture and release handoff summary

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
```

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
npm run dev
npm run build
npm run typecheck
```

## Release readiness
For ABH-2, the repository now contains the expected full-stack delivery shape:
- live frontend-to-backend API wiring through `NEXT_PUBLIC_API_URL`
- backend-to-Postgres wiring through `DATABASE_URL`
- real persistence for users and links
- click analytics via redirect counting
- deployment-facing documentation and handoff notes

## Handoff documents
- QA review: `docs/PEDANT_REVIEW.md`
- Implementation handoff: `docs/IMPLEMENTATION_NOTES.md`
- Release notes: `CHANGELOG.md`
