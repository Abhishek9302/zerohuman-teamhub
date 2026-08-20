# Sniplet — Documentation

**Sniplet** is a full-stack URL shortener with per-link click analytics. It is a
monorepo:

- **Frontend** (repo root): Next.js 14 App Router + TypeScript dashboard.
- **Backend** (`backend/`): Node.js + Express + TypeScript REST API (`pg` driver).
- **Database** (`database/schema.sql`): PostgreSQL `users` + `links` tables.

The layers are wired by two environment variables: the frontend calls the backend
via `NEXT_PUBLIC_API_URL`, and the backend reaches Postgres via `DATABASE_URL`.

---

## Start here

- New to the project? Read the [root `README.md`](../README.md) for setup, env
  vars, and how to run everything locally.
- Want the big picture? Read [`ARCHITECTURE.md`](ARCHITECTURE.md).

## Documentation map

| Document                                     | What it covers                                                              |
|----------------------------------------------|-----------------------------------------------------------------------------|
| [`../README.md`](../README.md)               | Project overview, setup, environment variables, run/build commands.         |
| [`ARCHITECTURE.md`](ARCHITECTURE.md)         | System layering, middleware pipeline, and end-to-end data flow.             |
| [`API.md`](API.md)                           | Full REST reference: every endpoint, request/response, errors, curl examples.|
| [`FRONTEND.md`](FRONTEND.md)                  | Frontend/component reference: props, state model, session handling, API client.|
| [`SCHEMA.md`](SCHEMA.md)                      | Database tables, indexes, and the per-endpoint query map.                   |
| [`../SECURITY.md`](../SECURITY.md)           | Auth model, password hashing, SSRF/slug safety, TLS, deployment checklist.  |
| [`PLAN.md`](PLAN.md)                          | Original implementation plan for the ABH-2 delivery.                        |
| [`IMPLEMENTATION_NOTES.md`](IMPLEMENTATION_NOTES.md) | Implementation/release handoff summary.                             |
| [`../CHANGELOG.md`](../CHANGELOG.md)          | Release notes.                                                             |

## Find it fast

- **"How do I call endpoint X?"** → [`API.md`](API.md)
- **"What does component/prop Y do?"** → [`FRONTEND.md`](FRONTEND.md)
- **"What columns/indexes exist?"** → [`SCHEMA.md`](SCHEMA.md)
- **"How do the pieces fit together?"** → [`ARCHITECTURE.md`](ARCHITECTURE.md)
- **"Is it safe to deploy?"** → [`../SECURITY.md`](../SECURITY.md)

## Feature at a glance: click analytics

A visitor opening `GET /r/:slug` triggers a single atomic statement that both
records the click and looks up the destination:

```sql
UPDATE links SET clicks = clicks + 1 WHERE slug = $1 RETURNING target_url;
```

The backend then issues a `302` redirect. The owner sees the updated count on the
dashboard, which fetches `GET /links` with `cache: 'no-store'`. See
[`ARCHITECTURE.md`](ARCHITECTURE.md#end-to-end-data-flow) and
[`SCHEMA.md`](SCHEMA.md) for details.
