# Implementation Notes — ABH-2 / Sniplet

## Release summary
ABH-2 lands as a real full-stack **Sniplet** delivery: a Next.js frontend wired to a live Express API, backed by PostgreSQL for auth, link persistence, and click analytics.

## What the repository contains
Observed deliverables in the current branch:
- a Next.js 14 App Router frontend at the repo root
- frontend API helpers that require `NEXT_PUBLIC_API_URL`
- an Express + TypeScript backend in `backend/`
- PostgreSQL schema creation SQL in `database/schema.sql`
- JWT auth and bcrypt password hashing
- authenticated link management plus redirect-based click counting

## Architecture summary
### Frontend
- Framework: Next.js 14 App Router
- Language: TypeScript
- Runtime role: authenticated UI for signup/login and link management
- API integration: all live requests go through `process.env.NEXT_PUBLIC_API_URL`

Frontend responsibilities include:
- account signup
- account login
- fetching the current user's links
- creating short links
- deleting links
- rendering the generated redirect URL and click totals

### Backend
- Runtime: Node.js + Express
- Language: TypeScript
- Database access: `pg`
- Environment: `DATABASE_URL`, `PORT` (default `4000`), and JWT secret configuration

Documented API surface observed in implementation:
- `GET /health`
- `POST /auth/signup`
- `POST /auth/login`
- `POST /links`
- `GET /links`
- `GET /r/:slug`
- `DELETE /links/:id`

Behavior notes:
- signup normalizes email, hashes password, stores user, and returns a JWT
- login verifies credentials and returns a JWT
- link creation validates the target URL and generates a unique slug
- listing returns links owned by the authenticated user
- redirect increments `clicks` before redirecting to the saved target URL
- deletion is ownership-scoped to the authenticated user

### Database
The schema in `database/schema.sql` defines:
- `users`
  - unique `email`
  - `password_hash`
  - `created_at`
- `links`
  - unique `slug`
  - `target_url`
  - `clicks INT DEFAULT 0`
  - `owner_id` foreign key to `users(id)` with cascade delete
  - `created_at`
- supporting indexes on `owner_id` and `slug`

## Deployment/readiness handoff
### Ready for
- code review
- automated PR creation
- local environment bring-up
- deployment preparation with frontend/backend env wiring

### Deployment requirements to confirm in target environment
- PostgreSQL database exists and `database/schema.sql` has been applied
- backend has valid `DATABASE_URL`, `PORT`, and JWT secret configuration
- frontend has `NEXT_PUBLIC_API_URL` pointing at the deployed backend base URL
- backend redirect base is reachable for `/r/:slug` traffic

### Actionable release checklist
1. Apply `database/schema.sql` to the target Postgres instance.
2. Set backend env: `DATABASE_URL`, `PORT`, `JWT_SECRET`, and if needed `CORS_ORIGIN`.
3. Set frontend env: `NEXT_PUBLIC_API_URL=<deployed backend origin>`.
4. Build both apps:
   - root: `npm run build`
   - backend: `cd backend && npm run build`
5. Run the release smoke test:
   - `POST /auth/signup`
   - `POST /auth/login`
   - create a link from the UI or `POST /links`
   - verify `GET /links` shows the new record
   - open `GET /r/:slug` and confirm the redirect succeeds
   - verify the click count increments in the dashboard/API
   - delete the link and confirm it disappears

### Merge/PR notes for the next role
- The required implementation commit is present: `89072b7 feat(abh-2): implement Build a full-stack URL shortener called "Sniplet" with click analytics`.
- Pedant validation artifacts already exist in `docs/PEDANT_REVIEW.md`.
- This Scribe pass made markdown-only release-prep updates; no application source files were changed.

## Scope guardrails followed in this Scribe phase
This phase intentionally stayed documentation-only.

I did **not**:
- modify `app/page.tsx`
- modify `components/*.tsx`
- modify `src/*`
- modify `package.json`
- modify backend source files
- push a branch
- create a PR manually

## Suggested reviewer focus
- verify environment variable setup in deployment targets
- confirm `database/schema.sql` is applied before backend startup
- smoke test signup, login, create link, list links, delete link, and redirect click counting
- ensure the deployed frontend uses the correct backend URL in `NEXT_PUBLIC_API_URL`

## Supporting documents
- Release notes: `CHANGELOG.md`
- QA review artifact: `docs/PEDANT_REVIEW.md`
- Primary project overview: `README.md`
