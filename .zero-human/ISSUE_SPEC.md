# ABH-2: Build a full-stack URL shortener called "Sniplet" with click analytics

Create a REAL full-stack web app (NOT a static demo).
- FRONTEND (Next.js 14 App Router + TypeScript, repo root): a polished dark UI to sign up/login, create short links, list them, and view per-link click counts. It MUST fetch live data from the backend via process.env.NEXT_PUBLIC_API_URL.
- BACKEND (backend/, Node.js + Express + TypeScript + pg): REST API with GET /health, POST /auth/signup, POST /auth/login (JWT), and CRUD for links (POST /links to create with a random slug, GET /links to list mine, GET /r/:slug to redirect and increment clicks, DELETE /links/:id). Reads process.env.DATABASE_URL and process.env.PORT (default 4000).
- DATABASE (database/schema.sql): CREATE TABLE IF NOT EXISTS for users (email UNIQUE + password_hash) and links (slug UNIQUE, target_url, clicks INT DEFAULT 0, owner_id).
Wire frontend->backend via NEXT_PUBLIC_API_URL and backend->db via DATABASE_URL. Every button/form must perform a real action that persists to Postgres.
