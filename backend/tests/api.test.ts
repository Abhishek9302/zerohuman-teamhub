// End-to-end HTTP tests for the Express API.
//
// The whole request pipeline -- routing, validation, bcrypt hashing, JWT auth,
// redirects and click counting -- is exercised against the real Express `app`
// (imported from ../src/app) bound to an *ephemeral* port. There is no real
// Postgres: we swap `pool.query` for a small in-memory fake, which keeps the
// tests hermetic, fast and free of experimental Node flags.
//
// Two subtleties are handled deliberately:
//   1. auth.ts and db.ts read process.env at module-evaluation time, and ESM
//      `import` is hoisted above top-level code. We therefore set env vars first
//      and pull the modules in with `await import(...)`.
//   2. app.ts (via index.ts historically) used to call app.listen() at import
//      time. The app is now exported without listening, so the test owns the
//      lifecycle: listen(0) in before, close() in after -> the process exits
//      cleanly instead of hanging on an open socket.
import { before, after, beforeEach, test, describe } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';

process.env.DATABASE_URL = 'postgres://fake:fake@localhost:5432/fake';
process.env.JWT_SECRET = 'integration-secret-value-at-least-32-chars';
process.env.NODE_ENV = 'test';

// ---- In-memory fake database -------------------------------------------------
interface UserRow { id: number; email: string; password_hash: string; created_at: string }
interface LinkRow { id: number; slug: string; target_url: string; clicks: number; owner_id: number; created_at: string }

const users: UserRow[] = [];
const links: LinkRow[] = [];
let nextUserId = 0;
let nextLinkId = 0;

// When set, the very next pool.query() call rejects, letting us drive the
// backend's catch-blocks (503 health, 500 error paths).
let failNextQuery: Error | null = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fakeQuery(text: string, params: any[] = []): Promise<{ rows: any[]; rowCount: number }> {
  if (failNextQuery) {
    const err = failNextQuery;
    failNextQuery = null;
    throw err;
  }

  const sql = text.trim();

  if (sql === 'SELECT 1') {
    return { rows: [{ '?column?': 1 }], rowCount: 1 };
  }
  if (sql.startsWith('SELECT id FROM users WHERE email')) {
    const found = users.filter((u) => u.email === params[0]);
    return { rows: found.map((u) => ({ id: u.id })), rowCount: found.length };
  }
  if (sql.startsWith('INSERT INTO users')) {
    const row: UserRow = { id: ++nextUserId, email: params[0], password_hash: params[1], created_at: new Date().toISOString() };
    users.push(row);
    return { rows: [{ id: row.id, email: row.email }], rowCount: 1 };
  }
  if (sql.startsWith('SELECT id, email, password_hash FROM users')) {
    const found = users.filter((u) => u.email === params[0]);
    return { rows: found.map((u) => ({ id: u.id, email: u.email, password_hash: u.password_hash })), rowCount: found.length };
  }
  if (sql.startsWith('SELECT id FROM links WHERE slug')) {
    const found = links.filter((l) => l.slug === params[0]);
    return { rows: found.map((l) => ({ id: l.id })), rowCount: found.length };
  }
  if (sql.startsWith('INSERT INTO links')) {
    const row: LinkRow = { id: ++nextLinkId, slug: params[0], target_url: params[1], clicks: 0, owner_id: params[2], created_at: new Date(Date.now() + nextLinkId).toISOString() };
    links.push(row);
    return { rows: [{ ...row }], rowCount: 1 };
  }
  if (sql.startsWith('SELECT * FROM links WHERE owner_id')) {
    const found = links
      .filter((l) => l.owner_id === params[0])
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
    return { rows: found.map((l) => ({ ...l })), rowCount: found.length };
  }
  if (sql.startsWith('UPDATE links SET clicks')) {
    const link = links.find((l) => l.slug === params[0]);
    if (!link) return { rows: [], rowCount: 0 };
    link.clicks += 1;
    return { rows: [{ target_url: link.target_url }], rowCount: 1 };
  }
  if (sql.startsWith('DELETE FROM links')) {
    const idx = links.findIndex((l) => l.id === params[0] && l.owner_id === params[1]);
    if (idx === -1) return { rows: [], rowCount: 0 };
    links.splice(idx, 1);
    return { rows: [{ id: params[0] }], rowCount: 1 };
  }
  throw new Error(`Unhandled SQL in fakeQuery: ${sql}`);
}

let server: Server;
let BASE = '';

before(async () => {
  // Import db FIRST (after env is set) and replace its query method, then import
  // the app which closes over that same pool instance.
  const db = await import('../src/db');
  (db.pool as unknown as { query: typeof fakeQuery }).query = fakeQuery;
  const { app } = await import('../src/app');

  await new Promise<void>((resolve) => {
    server = app.listen(0, () => resolve());
  });
  const { port } = server.address() as AddressInfo;
  BASE = `http://127.0.0.1:${port}`;
});

after(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

beforeEach(() => {
  failNextQuery = null;
});

// A signed-in owner reused across the link tests.
let token = '';

describe('GET /health', () => {
  test('reports ok when the database responds', async () => {
    const res = await fetch(`${BASE}/health`);
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { ok: true });
  });

  test('reports 503 when the database query fails', async () => {
    failNextQuery = new Error('connection refused');
    const res = await fetch(`${BASE}/health`);
    assert.equal(res.status, 503);
    assert.deepEqual(await res.json(), { ok: false });
  });
});

describe('unknown routes', () => {
  test('return 404 as a uniform JSON envelope', async () => {
    const res = await fetch(`${BASE}/no/such/route`);
    assert.equal(res.status, 404);
    assert.match(res.headers.get('content-type') ?? '', /application\/json/);
    assert.deepEqual(await res.json(), { error: 'Not found.' });
  });
});

describe('error handling (no information disclosure)', () => {
  test('malformed JSON returns a safe 400 JSON envelope, not a stack trace', async () => {
    const res = await fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{ this is not valid json'
    });
    assert.equal(res.status, 400);
    assert.match(res.headers.get('content-type') ?? '', /application\/json/);
    const body = await res.json();
    assert.deepEqual(body, { error: 'Request body is not valid JSON.' });
    // The response must never leak internals such as stack frames or file paths.
    assert.equal('stack' in body, false);
  });

  test('oversized JSON body returns a safe 413 JSON envelope', async () => {
    const res = await fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'a'.repeat(20_000), password: 'supersecret' })
    });
    assert.equal(res.status, 413);
    assert.match(res.headers.get('content-type') ?? '', /application\/json/);
    assert.deepEqual(await res.json(), { error: 'Request body is too large.' });
  });
});

describe('POST /auth/signup', () => {
  test('rejects a missing password', async () => {
    const res = await fetch(`${BASE}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'nopass@example.com' })
    });
    assert.equal(res.status, 400);
  });

  test('rejects a non-string email', async () => {
    const res = await fetch(`${BASE}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 12345, password: 'supersecret' })
    });
    assert.equal(res.status, 400);
  });

  test('rejects a password shorter than 6 characters', async () => {
    const res = await fetch(`${BASE}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'short@example.com', password: '123' })
    });
    assert.equal(res.status, 400);
  });

  test('rejects a password longer than 72 characters', async () => {
    const res = await fetch(`${BASE}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'long@example.com', password: 'x'.repeat(73) })
    });
    assert.equal(res.status, 400);
  });

  test('creates a new account, normalises the email and returns a token', async () => {
    const res = await fetch(`${BASE}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: '  Owner@Example.com ', password: 'supersecret' })
    });
    assert.equal(res.status, 201);
    const body = await res.json();
    assert.ok(body.token, 'expected a token');
    assert.equal(body.user.email, 'owner@example.com', 'email should be trimmed + lowercased');
    assert.ok(typeof body.user.id === 'number');
    token = body.token;
  });

  test('rejects a duplicate email (case-insensitive)', async () => {
    const res = await fetch(`${BASE}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'OWNER@example.com', password: 'supersecret' })
    });
    assert.equal(res.status, 409);
  });

  test('never returns the password hash to the client', async () => {
    const res = await fetch(`${BASE}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'nohash@example.com', password: 'supersecret' })
    });
    const body = await res.json();
    assert.equal('password_hash' in body.user, false);
    assert.equal('password' in body.user, false);
  });

  test('returns 500 when the database errors mid-signup', async () => {
    failNextQuery = new Error('db down');
    const res = await fetch(`${BASE}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'boom@example.com', password: 'supersecret' })
    });
    assert.equal(res.status, 500);
  });
});

describe('POST /auth/login', () => {
  test('rejects missing fields', async () => {
    const res = await fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'owner@example.com' })
    });
    assert.equal(res.status, 400);
  });

  test('rejects unknown credentials', async () => {
    const res = await fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'ghost@example.com', password: 'whatever' })
    });
    assert.equal(res.status, 401);
  });

  test('rejects a wrong password for an existing user', async () => {
    const res = await fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'owner@example.com', password: 'WRONGpassword' })
    });
    assert.equal(res.status, 401);
  });

  test('logs in with correct credentials (case-insensitive email)', async () => {
    const res = await fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'OWNER@example.com', password: 'supersecret' })
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(body.token);
    assert.equal(body.user.email, 'owner@example.com');
    // Refresh the shared token from a real login for the CRUD suite.
    token = body.token;
  });
});

describe('links CRUD', () => {
  let createdSlug = '';
  let createdId = 0;

  test('POST /links requires authentication', async () => {
    const res = await fetch(`${BASE}/links`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetUrl: 'https://example.com' })
    });
    assert.equal(res.status, 401);
  });

  test('POST /links rejects an invalid targetUrl', async () => {
    const res = await fetch(`${BASE}/links`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ targetUrl: 'not-a-valid-url' })
    });
    assert.equal(res.status, 400);
  });

  test('POST /links rejects a dangerous javascript: scheme', async () => {
    const res = await fetch(`${BASE}/links`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ targetUrl: 'javascript:alert(1)' })
    });
    assert.equal(res.status, 400);
  });

  test('POST /links rejects a missing targetUrl', async () => {
    const res = await fetch(`${BASE}/links`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({})
    });
    assert.equal(res.status, 400);
  });

  test('POST /links creates a short link with a generated slug', async () => {
    const res = await fetch(`${BASE}/links`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ targetUrl: 'https://example.com/destination' })
    });
    assert.equal(res.status, 201);
    const body = await res.json();
    assert.ok(body.slug, 'expected a slug');
    assert.equal(body.slug.length, 7);
    assert.equal(body.target_url, 'https://example.com/destination');
    assert.equal(body.clicks, 0);
    createdSlug = body.slug;
    createdId = body.id;
  });

  test('GET /links requires authentication', async () => {
    const res = await fetch(`${BASE}/links`);
    assert.equal(res.status, 401);
  });

  test("GET /links returns only the current user's links", async () => {
    const res = await fetch(`${BASE}/links`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(Array.isArray(body));
    assert.equal(body.length, 1);
    assert.equal(body[0].slug, createdSlug);
  });

  test('GET /r/:slug redirects and increments the click count', async () => {
    const redirect = await fetch(`${BASE}/r/${createdSlug}`, { redirect: 'manual' });
    assert.ok(redirect.status === 302 || redirect.status === 301, `expected a redirect, got ${redirect.status}`);
    assert.equal(redirect.headers.get('location'), 'https://example.com/destination');

    // Hit it a second time, then verify clicks incremented to 2.
    await fetch(`${BASE}/r/${createdSlug}`, { redirect: 'manual' });

    const list = await fetch(`${BASE}/links`, { headers: { Authorization: `Bearer ${token}` } });
    const body = await list.json();
    assert.equal(body[0].clicks, 2);
  });

  test('GET /r/:slug returns 404 for an unknown slug', async () => {
    const res = await fetch(`${BASE}/r/does-not-exist`, { redirect: 'manual' });
    assert.equal(res.status, 404);
  });

  test('DELETE /links/:id requires authentication', async () => {
    const res = await fetch(`${BASE}/links/${createdId}`, { method: 'DELETE' });
    assert.equal(res.status, 401);
  });

  test('DELETE /links/:id rejects a non-numeric id', async () => {
    const res = await fetch(`${BASE}/links/not-a-number`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    assert.equal(res.status, 400);
  });

  test('DELETE /links/:id returns 404 for a link owned by someone else', async () => {
    const res = await fetch(`${BASE}/links/999999`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    assert.equal(res.status, 404);
  });

  test("DELETE /links/:id removes the caller's own link", async () => {
    const res = await fetch(`${BASE}/links/${createdId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { success: true });

    const list = await fetch(`${BASE}/links`, { headers: { Authorization: `Bearer ${token}` } });
    const body = await list.json();
    assert.equal(body.length, 0);
  });
});

describe('multi-user isolation', () => {
  let tokenA = '';
  let tokenB = '';
  let linkAId = 0;

  async function signup(email: string): Promise<string> {
    const res = await fetch(`${BASE}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'supersecret' })
    });
    assert.equal(res.status, 201);
    return (await res.json()).token as string;
  }

  test('sets up two independent accounts each with a link', async () => {
    tokenA = await signup('alice@example.com');
    tokenB = await signup('bob@example.com');

    const createA = await fetch(`${BASE}/links`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenA}` },
      body: JSON.stringify({ targetUrl: 'https://alice.example.com' })
    });
    linkAId = (await createA.json()).id;

    await fetch(`${BASE}/links`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenB}` },
      body: JSON.stringify({ targetUrl: 'https://bob.example.com' })
    });
  });

  test("each user's GET /links only shows their own link", async () => {
    const [listA, listB] = await Promise.all([
      fetch(`${BASE}/links`, { headers: { Authorization: `Bearer ${tokenA}` } }).then((r) => r.json()),
      fetch(`${BASE}/links`, { headers: { Authorization: `Bearer ${tokenB}` } }).then((r) => r.json())
    ]);
    assert.equal(listA.length, 1);
    assert.equal(listB.length, 1);
    assert.equal(listA[0].target_url, 'https://alice.example.com');
    assert.equal(listB[0].target_url, 'https://bob.example.com');
  });

  test("user B cannot delete user A's link", async () => {
    const res = await fetch(`${BASE}/links/${linkAId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenB}` }
    });
    assert.equal(res.status, 404);

    // Confirm the link still belongs to A.
    const listA = await fetch(`${BASE}/links`, { headers: { Authorization: `Bearer ${tokenA}` } }).then((r) => r.json());
    assert.equal(listA.length, 1);
  });
});
