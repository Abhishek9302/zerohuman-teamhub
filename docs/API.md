# Sniplet — API Reference

The Sniplet backend is a Node.js + Express + TypeScript service using the `pg`
driver. It exposes a small REST API for authentication, short-link management,
and click-tracking redirects. This document describes every endpoint, its
request/response shapes, authentication rules, and error behavior as
implemented in `backend/src/index.ts`.

- **Base URL (local):** `http://localhost:4000`
- **Base URL (deployed):** the value the frontend reads from `NEXT_PUBLIC_API_URL`
- **Content type:** all request and response bodies are JSON (`application/json`)
- **Max request body:** `16kb` (`express.json({ limit: '16kb' })`); larger payloads are rejected
- **CORS:** restricted to the origins listed in the comma-separated `CORS_ORIGIN`
  allowlist. When `CORS_ORIGIN` is unset the API falls back to permissive access
  so local development keeps working. Allowed methods are `GET, POST, DELETE`;
  allowed headers are `Content-Type` and `Authorization`.
- **Security headers:** [`helmet`](https://helmetjs.github.io/) is enabled, so
  responses carry HSTS, `X-Content-Type-Options: nosniff`, frame protection, and
  related hardening headers.
- **Rate limiting:** the auth endpoints are throttled — see
  [Rate limiting](#rate-limiting).

> For the complete security posture (slug entropy, URL scheme allow-listing,
> JWT secret rules, TLS to Postgres, etc.) see [`SECURITY.md`](../SECURITY.md).

---

## Authentication

Sniplet uses stateless **JWT bearer tokens**.

1. Obtain a token from `POST /auth/signup` or `POST /auth/login`.
2. Send it on every protected request using the `Authorization` header:

   ```
   Authorization: Bearer <token>
   ```

Tokens are signed with `JWT_SECRET` (see [Environment](#environment)) and
expire after **7 days** (`expiresIn: '7d'`). The token payload contains:

```json
{ "userId": 1, "email": "you@example.com" }
```

Protected endpoints run through the `requireAuth` middleware. A request with a
missing/malformed `Authorization` header returns `401 Missing bearer token.`,
and an invalid or expired token returns `401 Invalid or expired token.`

## Rate limiting

The credential endpoints — `POST /auth/signup` and `POST /auth/login` — are
protected by an [`express-rate-limit`](https://www.npmjs.com/package/express-rate-limit)
limiter to slow down brute-force attempts:

- **Window:** 15 minutes (`windowMs: 15 * 60 * 1000`)
- **Limit:** 20 requests per client IP per window
- **On breach:** `429 Too Many Requests` with body
  `{ "error": "Too many attempts. Please try again later." }`
- Standard `RateLimit-*` headers are returned; legacy `X-RateLimit-*` headers are
  disabled.

The IP is resolved via `app.set('trust proxy', 1)`, so the limiter keys on the
real client address behind the deployment proxy rather than the proxy itself.

### Endpoint summary

| Method | Path            | Auth       | Description                                      |
|--------|-----------------|------------|--------------------------------------------------|
| GET    | `/health`       | Public     | Liveness + database connectivity check           |
| POST   | `/auth/signup`  | Public     | Create an account, returns a JWT                 |
| POST   | `/auth/login`   | Public     | Authenticate, returns a JWT                      |
| POST   | `/links`        | 🔒 Bearer  | Create a short link with a random slug           |
| GET    | `/links`        | 🔒 Bearer  | List the authenticated user's links              |
| DELETE | `/links/:id`    | 🔒 Bearer  | Delete one of the authenticated user's links     |
| GET    | `/r/:slug`      | Public     | Increment click count and redirect to target URL |

---

## Health

### `GET /health`

Confirms the process is up and that a query round-trips to PostgreSQL
(`SELECT 1`). Useful as a load-balancer / uptime probe.

**Response `200 OK`** — process is up and the database is reachable:

```json
{ "ok": true }
```

**Response `503 Service Unavailable`** — the database query failed:

```json
{ "ok": false }
```

**Example**

```bash
curl http://localhost:4000/health
```

---

## Auth

### `POST /auth/signup`

Creates a new user. The email is trimmed and lowercased before storage, the
password is hashed with bcrypt (cost factor 10), and a JWT is returned.

**Request body**

| Field      | Type   | Required | Rules                                          |
|------------|--------|----------|------------------------------------------------|
| `email`    | string | yes      | Max 254 chars; stored normalized (lowercased)  |
| `password` | string | yes      | Between 6 and 72 characters                    |

> The 72-character password cap exists because `bcryptjs` silently truncates
> input beyond 72 bytes; capping keeps the whole secret meaningful.

```json
{ "email": "you@example.com", "password": "supersecret" }
```

**Response `201 Created`**

```json
{
  "token": "<jwt>",
  "user": { "id": 1, "email": "you@example.com" }
}
```

**Errors**

| Status | Body                                                                          | When                                            |
|--------|-------------------------------------------------------------------------------|-------------------------------------------------|
| 400    | `{ "error": "Email and a password between 6 and 72 characters are required." }` | Missing/invalid fields, or password out of range |
| 409    | `{ "error": "Email already exists." }`                                        | Email already registered                        |
| 429    | `{ "error": "Too many attempts. Please try again later." }`                   | Rate limit exceeded (see [Rate limiting](#rate-limiting)) |
| 500    | `{ "error": "Unable to create account." }`                                    | Unexpected server/database error                |

**Example**

```bash
curl -X POST http://localhost:4000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"supersecret"}'
```

---

### `POST /auth/login`

Verifies credentials against the stored bcrypt hash and returns a JWT.

**Request body**

| Field      | Type   | Required |
|------------|--------|----------|
| `email`    | string | yes      |
| `password` | string | yes      |

```json
{ "email": "you@example.com", "password": "supersecret" }
```

**Response `200 OK`**

```json
{
  "token": "<jwt>",
  "user": { "id": 1, "email": "you@example.com" }
}
```

**Errors**

| Status | Body                                                        | When                          |
|--------|-------------------------------------------------------------|-------------------------------|
| 400    | `{ "error": "Email and password are required." }`           | Missing fields                |
| 401    | `{ "error": "Invalid credentials." }`                       | Unknown email or bad password |
| 429    | `{ "error": "Too many attempts. Please try again later." }` | Rate limit exceeded (see [Rate limiting](#rate-limiting)) |
| 500    | `{ "error": "Unable to login." }`                           | Unexpected server error       |

**Example**

```bash
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"supersecret"}'
```

---

## Links

All `/links` endpoints require a valid bearer token and operate only on links
owned by the authenticated user.

### `POST /links`

Creates a short link for a target URL. The server validates that the URL is a
well-formed `http:`/`https:` URL of at most 2048 characters, then generates a
unique 7-character slug. Slugs are drawn from a 54-character alphabet using a
cryptographically secure RNG (`crypto.randomInt`) so they cannot be enumerated.
Slug generation retries up to 5 times to avoid collisions before giving up.

Non-`http(s)` schemes such as `javascript:`, `data:`, and `file:` are rejected
to prevent the redirect endpoint from being abused for phishing or SSRF-style
probing.

**Headers**

```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request body**

| Field       | Type   | Required | Rules                                   |
|-------------|--------|----------|-----------------------------------------|
| `targetUrl` | string | yes      | Valid `http`/`https` URL, max 2048 chars |

```json
{ "targetUrl": "https://example.com/some/very/long/path" }
```

**Response `201 Created`** — the full link row:

```json
{
  "id": 12,
  "slug": "aZ3kxq9",
  "target_url": "https://example.com/some/very/long/path",
  "clicks": 0,
  "owner_id": 1,
  "created_at": "2026-07-07T10:41:00.000Z"
}
```

> The public short URL for a link is `${NEXT_PUBLIC_API_URL}/r/${slug}` (the
> frontend builds this via the `getShortUrl` helper).

**Errors**

| Status | Body                                                                | When                                  |
|--------|---------------------------------------------------------------------|---------------------------------------|
| 400    | `{ "error": "A valid targetUrl is required." }`                     | Missing or invalid URL                |
| 401    | `{ "error": "Missing bearer token." }` / `Invalid or expired token.`| Not authenticated                     |
| 503    | `{ "error": "Unable to generate a unique short link right now." }`  | 5 slug collisions in a row            |
| 500    | `{ "error": "Unable to create link." }`                             | Unexpected server error               |

**Example**

```bash
curl -X POST http://localhost:4000/links \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"targetUrl":"https://example.com/some/very/long/path"}'
```

---

### `GET /links`

Lists all links owned by the authenticated user, newest first
(`ORDER BY created_at DESC`).

**Headers**

```
Authorization: Bearer <token>
```

**Response `200 OK`** — an array of link rows:

```json
[
  {
    "id": 12,
    "slug": "aZ3kxq9",
    "target_url": "https://example.com/some/very/long/path",
    "clicks": 4,
    "owner_id": 1,
    "created_at": "2026-07-07T10:41:00.000Z"
  }
]
```

**Errors**

| Status | Body                                       | When                    |
|--------|--------------------------------------------|-------------------------|
| 401    | `{ "error": "Missing bearer token." }`     | Not authenticated       |
| 500    | `{ "error": "Unable to load links." }`     | Unexpected server error |

**Example**

```bash
curl http://localhost:4000/links -H "Authorization: Bearer $TOKEN"
```

---

### `DELETE /links/:id`

Deletes a single link. The delete is scoped by `owner_id`, so a user can only
remove their own links.

**Path parameters**

| Param | Type    | Description             |
|-------|---------|-------------------------|
| `id`  | integer | Numeric link identifier |

**Headers**

```
Authorization: Bearer <token>
```

**Response `200 OK`**

```json
{ "success": true }
```

**Errors**

| Status | Body                                    | When                                          |
|--------|-----------------------------------------|-----------------------------------------------|
| 400    | `{ "error": "Invalid link id." }`       | `id` is not a number                          |
| 401    | `{ "error": "Missing bearer token." }`  | Not authenticated                             |
| 404    | `{ "error": "Link not found." }`        | No matching link owned by the user            |
| 500    | `{ "error": "Unable to delete link." }` | Unexpected server error                       |

**Example**

```bash
curl -X DELETE http://localhost:4000/links/12 \
  -H "Authorization: Bearer $TOKEN"
```

---

## Redirect & Click Analytics

### `GET /r/:slug`

The public, unauthenticated redirect endpoint. It atomically increments the
link's `clicks` counter and issues an HTTP redirect to the stored target URL.
This single query is what powers Sniplet's click analytics:

```sql
UPDATE links SET clicks = clicks + 1 WHERE slug = $1 RETURNING target_url
```

**Path parameters**

| Param  | Type   | Description               |
|--------|--------|---------------------------|
| `slug` | string | The generated short slug  |

**Response**

- `302 Found` — redirect to the link's `target_url` (click counter incremented)
- `404 Not Found` — `{ "error": "Short link not found." }` when no slug matches
- `500` — `{ "error": "Unable to redirect." }` on unexpected server error

**Example**

```bash
# -L follows the redirect to the destination
curl -iL http://localhost:4000/r/aZ3kxq9
```

---

## Data Model

The schema is created idempotently from `database/schema.sql`.

### `users`

| Column          | Type          | Constraints                    |
|-----------------|---------------|--------------------------------|
| `id`            | `SERIAL`      | Primary key                    |
| `email`         | `TEXT`        | `NOT NULL`, `UNIQUE`           |
| `password_hash` | `TEXT`        | `NOT NULL` (bcrypt hash)       |
| `created_at`    | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()`       |

### `links`

| Column       | Type          | Constraints                                           |
|--------------|---------------|-------------------------------------------------------|
| `id`         | `SERIAL`      | Primary key                                           |
| `slug`       | `TEXT`        | `NOT NULL`, `UNIQUE`                                  |
| `target_url` | `TEXT`        | `NOT NULL`                                            |
| `clicks`     | `INT`         | `NOT NULL DEFAULT 0`                                  |
| `owner_id`   | `INT`         | `NOT NULL REFERENCES users(id) ON DELETE CASCADE`     |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT NOW()`                              |

**Indexes:** `idx_links_owner_id (owner_id)`, `idx_links_slug (slug)`.

Deleting a user cascades to their links via the `ON DELETE CASCADE` foreign key.

---

## Environment

The backend reads the following environment variables:

| Variable       | Required | Default            | Purpose                                                              |
|----------------|----------|--------------------|---------------------------------------------------------------------|
| `DATABASE_URL` | yes      | —                  | Postgres connection string (startup fails if unset)                 |
| `PORT`         | no       | `4000`             | Port the Express server listens on                                  |
| `JWT_SECRET`   | prod*    | ephemeral (dev)    | Signing secret for JWTs — **required (≥ 32 chars) in production**    |
| `CORS_ORIGIN`  | prod†    | permissive (`*`)   | Comma-separated allowlist of browser origins permitted by CORS      |
| `NODE_ENV`     | no       | —                  | Set to `production` to enforce the strict `JWT_SECRET` requirement   |
| `PG_POOL_MAX`  | no       | `10`               | Maximum size of the Postgres connection pool                        |

\* `JWT_SECRET` is optional in development — when it is unset or shorter than 32
characters the backend generates an ephemeral random secret at startup (tokens
do not survive a restart). In production (`NODE_ENV=production`) the process
**refuses to start** unless `JWT_SECRET` is at least 32 characters, so tokens can
never be forged with a well-known default.

† `CORS_ORIGIN` is optional but strongly recommended in production; without it
the API accepts requests from any origin.

TLS to Postgres is enabled automatically when `DATABASE_URL` contains
`sslmode=require` or points at an AWS/RDS host — no extra configuration needed.

The frontend reads a single variable:

| Variable              | Required | Purpose                                         |
|-----------------------|----------|-------------------------------------------------|
| `NEXT_PUBLIC_API_URL` | yes      | Base URL of the backend the browser talks to    |

---

## Error Format

All error responses share the same JSON envelope:

```json
{ "error": "Human-readable message." }
```

The frontend API helper (`src/lib.ts`) reads the `error` field and surfaces it to
the user; if the message mentions a token issue it clears the local session.

| Status | Meaning                                         |
|--------|-------------------------------------------------|
| 200    | Success                                         |
| 201    | Resource created (`signup`, `POST /links`)      |
| 302    | Redirect (`GET /r/:slug`)                       |
| 400    | Validation error (bad/missing input)            |
| 401    | Authentication required or failed               |
| 404    | Resource not found                              |
| 409    | Conflict (email already exists)                 |
| 429    | Rate limit exceeded on an auth endpoint         |
| 500    | Unexpected server/database error                |
| 503    | Could not allocate a unique slug, or `/health` DB check failed |

---

## End-to-End Example

```bash
API=http://localhost:4000

# 1. Sign up and capture the token
TOKEN=$(curl -s -X POST $API/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@example.com","password":"supersecret"}' \
  | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

# 2. Create a short link
curl -s -X POST $API/links \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"targetUrl":"https://example.com"}'

# 3. List your links (note the slug + clicks:0)
curl -s $API/links -H "Authorization: Bearer $TOKEN"

# 4. Visit the redirect to increment clicks, then list again
curl -sL $API/r/<slug> > /dev/null
curl -s $API/links -H "Authorization: Bearer $TOKEN"
```
