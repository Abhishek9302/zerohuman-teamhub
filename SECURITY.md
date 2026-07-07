# Security

This document describes the security posture of **Sniplet** — the mechanisms
built into the backend (`backend/src/`) that protect accounts, links, and the
public redirect surface. It reflects the hardening delivered for ABH-2 and is
meant to be read alongside [`docs/API.md`](docs/API.md).

- Backend hardening lives in `backend/src/index.ts`, `backend/src/auth.ts`,
  `backend/src/utils.ts`, and `backend/src/db.ts`.
- Report a vulnerability privately to the repository owner rather than opening a
  public issue.

---

## Authentication & sessions

Sniplet uses stateless **JWT bearer tokens**.

- Tokens are issued by `POST /auth/signup` and `POST /auth/login` and signed with
  HS256 using `JWT_SECRET`.
- Tokens expire after **7 days** (`expiresIn: '7d'`). The payload contains only
  `{ userId, email }` — no secrets or password material.
- Protected endpoints (`POST /links`, `GET /links`, `DELETE /links/:id`) run
  through the `requireAuth` middleware, which requires an `Authorization: Bearer
  <token>` header. Missing/malformed headers → `401 Missing bearer token.`;
  invalid or expired tokens → `401 Invalid or expired token.`
- All link queries are scoped by `owner_id`, so an authenticated user can only
  list or delete **their own** links (authorization, not just authentication).

### JWT secret handling

The signing secret is resolved defensively in `auth.ts`:

| Environment                     | Behavior                                                                 |
|---------------------------------|--------------------------------------------------------------------------|
| `NODE_ENV=production`           | **Startup fails** unless `JWT_SECRET` is set and ≥ 32 characters.        |
| Development, secret ≥ 32 chars  | Uses the provided secret.                                                |
| Development, secret < 32 chars  | Uses it but logs a warning.                                              |
| Development, secret unset       | Generates an ephemeral random 48-byte secret; tokens die on restart.    |

This guarantees production tokens can never be forged with a well-known default
value, while local development stays frictionless.

## Password storage

- Passwords are hashed with **bcrypt** (`bcryptjs`) at cost factor **10**.
- Only the hash (`password_hash`) is stored; the plaintext is never persisted or
  logged.
- Password length is bounded to **6–72 characters**. The 72-byte upper bound
  exists because `bcryptjs` silently truncates longer input, so the cap keeps the
  entire secret meaningful and bounds request work.
- Login uses `bcrypt.compare` and returns a generic `Invalid credentials.` for
  both unknown emails and bad passwords, avoiding user enumeration.

## Input validation

- **Emails** are trimmed, lowercased, and capped at 254 characters.
- **Target URLs** are validated with the WHATWG `URL` parser and must use the
  `http:` or `https:` scheme and be ≤ 2048 characters. Dangerous schemes such as
  `javascript:`, `data:`, and `file:` are rejected to stop the redirect endpoint
  from being weaponized for phishing or SSRF-style probing.
- **SSRF hardening:** target hostnames are additionally screened against
  loopback (`localhost`, `127.0.0.0/8`, `::1`), private ranges
  (`10/8`, `172.16/12`, `192.168/16`, `100.64/10` CGNAT), link-local space
  (`169.254/16`, including the `169.254.169.254` cloud-metadata endpoint,
  and IPv6 `fe80::/10`), unique-local IPv6 (`fc00::/7`) and the unspecified
  address. IPv4-mapped/-compatible IPv6 literals are decoded to their embedded
  IPv4 address — in **both** the dotted-decimal (`::ffff:169.254.169.254`) and
  the parser-normalized compressed-hex (`::ffff:a9fe:a9fe`) forms — before the
  check, so the guard cannot be bypassed by wrapping a blocked address in an
  IPv6 literal.
- **Link IDs** are coerced to numbers; non-numeric IDs return `400 Invalid link
  id.`
- All database access uses **parameterized queries** (`$1`, `$2`, …) via the
  `pg` driver — there is no string concatenation of user input into SQL.
- Request bodies are limited to **16 kb** (`express.json({ limit: '16kb' })`) to
  bound large-payload denial-of-service attempts.

## Short-link (slug) safety

- Slugs are 7 characters drawn from a 54-character alphabet using a
  cryptographically secure RNG (`crypto.randomInt`), **not** `Math.random()`.
  This makes slugs unguessable and prevents enumeration of other users' links.
- The alphabet omits visually ambiguous characters (`0/O`, `1/l/I`) to reduce
  copy/paste mistakes.
- Slug creation retries up to 5 times on collision, then returns `503` rather
  than looping indefinitely.

## Transport & network hardening

- **Helmet** (`app.use(helmet())`) sets secure response headers: HSTS,
  `X-Content-Type-Options: nosniff`, frame protection, and related defaults.
- **CORS** is restricted to the comma-separated `CORS_ORIGIN` allowlist, limited
  to methods `GET, POST, DELETE` and headers `Content-Type`, `Authorization`.
  When `CORS_ORIGIN` is unset the API falls back to permissive access for local
  development — **always set `CORS_ORIGIN` in production**.
- `app.set('trust proxy', 1)` lets the app see the real client IP behind a single
  deployment proxy so rate limiting keys on the correct address.

## Rate limiting

The credential endpoints (`POST /auth/signup`, `POST /auth/login`) are throttled
with `express-rate-limit`:

- **20 requests per client IP per 15-minute window.**
- On breach: `429 Too Many Requests` with
  `{ "error": "Too many attempts. Please try again later." }`.
- Standard `RateLimit-*` headers are emitted; legacy headers are disabled.

This slows credential brute-forcing and signup abuse.

## Database connection security

Configured in `db.ts`:

- `DATABASE_URL` is **required**; the process throws at startup if it is missing.
- **TLS is enabled automatically** when the connection string contains
  `sslmode=require` or points at an AWS/RDS host, so traffic to managed Postgres
  is encrypted in transit.
- The connection pool is bounded (`PG_POOL_MAX`, default `10`) with sensible idle
  and connection timeouts, so a traffic burst cannot exhaust database
  connections.
- An idle-client `error` handler prevents an unexpected pool error from crashing
  the process.

## Error handling & information disclosure

- All errors are returned as a uniform `{ "error": "<message>" }` envelope with
  user-safe messages.
- Internal failures are logged server-side with a stable tag (e.g.
  `SIGNUP_ERROR`, `REDIRECT_ERROR`) but the client only receives a generic
  message — stack traces and driver details are never leaked.
- `GET /health` returns `503 { "ok": false }` when the database probe fails,
  giving load balancers a clear signal without exposing internals.

---

## Production deployment checklist

- [ ] Set `NODE_ENV=production`.
- [ ] Set `JWT_SECRET` to a random value of **at least 32 characters**.
- [ ] Set `CORS_ORIGIN` to your exact frontend origin(s).
- [ ] Point `DATABASE_URL` at a TLS-capable Postgres (RDS or `sslmode=require`).
- [ ] Serve the API over HTTPS behind your proxy/load balancer (Helmet HSTS
      assumes TLS termination).
- [ ] Apply `database/schema.sql` before starting the backend.
- [ ] Confirm `NEXT_PUBLIC_API_URL` on the frontend targets the HTTPS backend
      URL.
