// Unit tests for the authentication layer (src/auth.ts): JWT minting
// (createToken), the requireAuth Express middleware, and the resolveJwtSecret
// startup guard.
//
// auth.ts reads process.env at module-evaluation time and derives its signing
// secret ONCE. We therefore pin JWT_SECRET/NODE_ENV before importing the module
// (import is deferred into a before() hook so the assignment below wins). Knowing
// the secret lets us forge tokens with the raw `jsonwebtoken` library to exercise
// the expired / wrong-secret / malformed branches that createToken cannot
// produce on its own.
//
// The resolveJwtSecret startup contract only fires at import time and can throw,
// so those cases are exercised in fresh child processes (Node's test runner also
// isolates each *file*, but a single file cannot re-import auth.ts under three
// different environments — hence the subprocesses).
import { before, beforeEach, test, describe } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import jwt from 'jsonwebtoken';
import type { Response } from 'express';

const JWT_SECRET = 'unit-test-secret-value-at-least-32-chars-long';
process.env.JWT_SECRET = JWT_SECRET;
process.env.NODE_ENV = 'test';

type AuthModule = typeof import('../src/auth');
let auth: AuthModule;

before(async () => {
  auth = await import('../src/auth');
});

// ---- Minimal Express req/res/next test doubles -------------------------------
interface CapturedResponse {
  statusCode: number;
  body: unknown;
}

function makeResponse(): { res: Response; captured: CapturedResponse } {
  const captured: CapturedResponse = { statusCode: 200, body: undefined };
  const res = {
    status(code: number) {
      captured.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      captured.body = payload;
      return this;
    }
  } as unknown as Response;
  return { res, captured };
}

// A req whose header(name) reads from a case-insensitive map, mirroring Express.
function makeRequest(headers: Record<string, string> = {}) {
  const lower: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers)) lower[k.toLowerCase()] = v;
  return {
    header(name: string) {
      return lower[name.toLowerCase()];
    }
  } as unknown as import('../src/auth').AuthenticatedRequest;
}

describe('createToken', () => {
  test('mints a token that verifies against the configured secret', () => {
    const token = auth.createToken(42, 'owner@example.com');
    assert.equal(typeof token, 'string');
    const payload = jwt.verify(token, JWT_SECRET) as Record<string, unknown>;
    assert.equal(payload.userId, 42);
    assert.equal(payload.email, 'owner@example.com');
  });

  test('embeds a ~7 day expiry', () => {
    const token = auth.createToken(1, 'a@b.com');
    const payload = jwt.verify(token, JWT_SECRET) as { iat: number; exp: number };
    const sevenDays = 7 * 24 * 60 * 60;
    // Allow a couple of seconds of slack around the fixed 7d window.
    assert.ok(Math.abs(payload.exp - payload.iat - sevenDays) <= 2, `unexpected lifetime: ${payload.exp - payload.iat}s`);
  });

  test('cannot be verified with a different secret (guards against forgery)', () => {
    const token = auth.createToken(1, 'a@b.com');
    assert.throws(() => jwt.verify(token, 'a-totally-different-secret-value-here'), /invalid signature/);
  });
});

describe('requireAuth', () => {
  let nextCalled: number;
  const next = () => {
    nextCalled += 1;
  };

  beforeEach(() => {
    nextCalled = 0;
  });

  test('401s when the Authorization header is absent', () => {
    const { res, captured } = makeResponse();
    auth.requireAuth(makeRequest(), res, next);
    assert.equal(captured.statusCode, 401);
    assert.deepEqual(captured.body, { error: 'Missing bearer token.' });
    assert.equal(nextCalled, 0);
  });

  test('401s when the scheme is not "Bearer "', () => {
    const { res, captured } = makeResponse();
    auth.requireAuth(makeRequest({ authorization: 'Basic abc123' }), res, next);
    assert.equal(captured.statusCode, 401);
    assert.deepEqual(captured.body, { error: 'Missing bearer token.' });
    assert.equal(nextCalled, 0);
  });

  test('401s on a structurally malformed token', () => {
    const { res, captured } = makeResponse();
    auth.requireAuth(makeRequest({ authorization: 'Bearer not-a-jwt' }), res, next);
    assert.equal(captured.statusCode, 401);
    assert.deepEqual(captured.body, { error: 'Invalid or expired token.' });
    assert.equal(nextCalled, 0);
  });

  test('401s on a token signed with the wrong secret', () => {
    const forged = jwt.sign({ userId: 7, email: 'evil@example.com' }, 'the-wrong-secret-but-long-enough-here', {
      expiresIn: '7d'
    });
    const { res, captured } = makeResponse();
    auth.requireAuth(makeRequest({ authorization: `Bearer ${forged}` }), res, next);
    assert.equal(captured.statusCode, 401);
    assert.equal(nextCalled, 0);
  });

  test('401s on an expired token even when correctly signed', () => {
    const expired = jwt.sign({ userId: 7, email: 'a@b.com' }, JWT_SECRET, { expiresIn: -10 });
    const { res, captured } = makeResponse();
    auth.requireAuth(makeRequest({ authorization: `Bearer ${expired}` }), res, next);
    assert.equal(captured.statusCode, 401);
    assert.deepEqual(captured.body, { error: 'Invalid or expired token.' });
    assert.equal(nextCalled, 0);
  });

  test('calls next() and attaches req.user for a valid token', () => {
    const token = auth.createToken(99, 'valid@example.com');
    const req = makeRequest({ authorization: `Bearer ${token}` });
    const { res, captured } = makeResponse();
    auth.requireAuth(req, res, next);
    assert.equal(nextCalled, 1);
    // Untouched response — the request was allowed through.
    assert.equal(captured.statusCode, 200);
    assert.equal(req.user?.userId, 99);
    assert.equal(req.user?.email, 'valid@example.com');
  });

  test('is case-insensitive about the header name (Express normalises it)', () => {
    const token = auth.createToken(5, 'case@example.com');
    const req = makeRequest({ Authorization: `Bearer ${token}` });
    const { res } = makeResponse();
    auth.requireAuth(req, res, next);
    assert.equal(nextCalled, 1);
    assert.equal(req.user?.userId, 5);
  });
});

// ---- resolveJwtSecret startup contract (import-time, so run in subprocesses) --
describe('resolveJwtSecret startup guard', () => {
  const authPath = path.join(__dirname, '..', 'src', 'auth.ts');

  // Import auth.ts in a fresh tsx process under a controlled environment and
  // report whether the import succeeded or threw.
  function importAuthWith(env: Record<string, string | undefined>): { ok: boolean; stderr: string } {
    const childEnv: Record<string, string> = { __AUTH_PATH__: authPath };
    for (const [k, v] of Object.entries({ ...process.env, ...env })) {
      if (v !== undefined) childEnv[k] = v;
    }
    const code =
      "import(process.env.__AUTH_PATH__).then(() => { console.log('IMPORT_OK'); }).catch((e) => { console.error('IMPORT_ERR:' + e.message); process.exit(3); });";
    const result = spawnSync('npx', ['tsx', '-e', code], { encoding: 'utf8', env: childEnv });
    return { ok: result.status === 0, stderr: `${result.stdout}${result.stderr}` };
  }

  test('refuses to start in production without a JWT_SECRET', () => {
    const { ok, stderr } = importAuthWith({ NODE_ENV: 'production', JWT_SECRET: undefined });
    assert.equal(ok, false, 'import should have thrown');
    assert.match(stderr, /JWT_SECRET must be set to a value of at least 32 characters in production\./);
  });

  test('refuses to start in production with a too-short JWT_SECRET', () => {
    const { ok, stderr } = importAuthWith({ NODE_ENV: 'production', JWT_SECRET: 'short' });
    assert.equal(ok, false, 'import should have thrown');
    assert.match(stderr, /at least 32 characters in production/);
  });

  test('starts in production when given a strong (>=32 char) JWT_SECRET', () => {
    const { ok, stderr } = importAuthWith({
      NODE_ENV: 'production',
      JWT_SECRET: 'a-perfectly-strong-production-secret-value'
    });
    assert.equal(ok, true, `import should have succeeded, got: ${stderr}`);
  });

  test('tolerates a missing JWT_SECRET outside production (ephemeral secret)', () => {
    const { ok, stderr } = importAuthWith({ NODE_ENV: 'development', JWT_SECRET: undefined });
    assert.equal(ok, true, `import should have succeeded, got: ${stderr}`);
  });
});
