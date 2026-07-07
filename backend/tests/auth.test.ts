// Unit tests for the JWT auth helpers (token minting + the requireAuth guard).
//
// auth.ts reads process.env.JWT_SECRET *at module-evaluation time*, and ES module
// `import` statements are hoisted above any other top-level code. A plain
// `import` therefore evaluates auth.ts BEFORE we could set the secret, causing it
// to fall back to a random ephemeral key and making every signature check fail.
// We defeat that by setting the env var first and pulling the module in with a
// dynamic `await import(...)`, which runs only after the assignment above it.
import { before, test, describe } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import type { Response, NextFunction } from 'express';

// A >= 32 char secret so auth.ts treats it as production-grade and uses it verbatim.
const SECRET = 'test-secret-value-that-is-32-plus-characters-long';
process.env.JWT_SECRET = SECRET;

// auth.ts reads process.env.JWT_SECRET at module-evaluation time, so the module
// must be imported AFTER the assignment above. A top-level `await import(...)`
// would be cleanest but fails under the CommonJS transform used here ("top-level
// await is not supported"), so we defer the import into a `before()` hook -- it
// runs before any test body executes, mirroring the pattern in api.test.ts.
let createToken: typeof import('../src/auth').createToken;
let requireAuth: typeof import('../src/auth').requireAuth;
type AuthenticatedRequest = import('../src/auth').AuthenticatedRequest;

before(async () => {
  const mod = await import('../src/auth');
  createToken = mod.createToken;
  requireAuth = mod.requireAuth;
});

function buildResponse() {
  const state: { statusCode?: number; body?: unknown } = {};
  const response = {
    status(code: number) {
      state.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      state.body = payload;
      return this;
    }
  } as unknown as Response;
  return { response, state };
}

function buildRequest(authorization?: string) {
  return {
    header(name: string) {
      if (name.toLowerCase() === 'authorization') {
        return authorization;
      }
      return undefined;
    }
  } as unknown as AuthenticatedRequest;
}

describe('createToken', () => {
  test('creates a JWT that verifies against the configured secret', () => {
    const token = createToken(42, 'user@example.com');
    const decoded = jwt.verify(token, SECRET) as { userId: number; email: string; exp: number };
    assert.equal(decoded.userId, 42);
    assert.equal(decoded.email, 'user@example.com');
  });

  test('sets an expiry roughly 7 days in the future', () => {
    const token = createToken(1, 'a@b.com');
    const decoded = jwt.verify(token, SECRET) as { iat: number; exp: number };
    const sevenDays = 7 * 24 * 60 * 60;
    assert.equal(decoded.exp - decoded.iat, sevenDays);
  });

  test('embeds exactly the userId and email claims (plus iat/exp)', () => {
    const token = createToken(7, 'claims@example.com');
    const decoded = jwt.verify(token, SECRET) as Record<string, unknown>;
    assert.deepEqual(
      Object.keys(decoded).sort(),
      ['email', 'exp', 'iat', 'userId'].sort()
    );
  });

  test('tokens are not verifiable with the wrong secret', () => {
    const token = createToken(1, 'a@b.com');
    assert.throws(() => jwt.verify(token, 'the-wrong-secret'));
  });

  test('produces distinct tokens for distinct users', () => {
    const a = createToken(1, 'a@example.com');
    const b = createToken(2, 'b@example.com');
    assert.notEqual(a, b);
  });
});

describe('requireAuth', () => {
  test('rejects a request with no Authorization header', () => {
    const { response, state } = buildResponse();
    let nextCalled = false;
    const next: NextFunction = () => { nextCalled = true; };

    requireAuth(buildRequest(undefined), response, next);

    assert.equal(state.statusCode, 401);
    assert.deepEqual(state.body, { error: 'Missing bearer token.' });
    assert.equal(nextCalled, false);
  });

  test('rejects an Authorization header that is not a Bearer token', () => {
    const { response, state } = buildResponse();
    let nextCalled = false;
    const next: NextFunction = () => { nextCalled = true; };

    requireAuth(buildRequest('Basic abc123'), response, next);

    assert.equal(state.statusCode, 401);
    assert.deepEqual(state.body, { error: 'Missing bearer token.' });
    assert.equal(nextCalled, false);
  });

  test('rejects a Bearer prefix with an empty token', () => {
    const { response, state } = buildResponse();
    let nextCalled = false;
    const next: NextFunction = () => { nextCalled = true; };

    requireAuth(buildRequest('Bearer '), response, next);

    assert.equal(state.statusCode, 401);
    assert.deepEqual(state.body, { error: 'Invalid or expired token.' });
    assert.equal(nextCalled, false);
  });

  test('rejects an invalid / tampered token', () => {
    const { response, state } = buildResponse();
    let nextCalled = false;
    const next: NextFunction = () => { nextCalled = true; };

    requireAuth(buildRequest('Bearer not-a-real-token'), response, next);

    assert.equal(state.statusCode, 401);
    assert.deepEqual(state.body, { error: 'Invalid or expired token.' });
    assert.equal(nextCalled, false);
  });

  test('rejects a token signed with a different secret', () => {
    const forged = jwt.sign({ userId: 1, email: 'x@y.com' }, 'a-totally-different-secret-value-here');
    const { response, state } = buildResponse();
    let nextCalled = false;
    const next: NextFunction = () => { nextCalled = true; };

    requireAuth(buildRequest(`Bearer ${forged}`), response, next);

    assert.equal(state.statusCode, 401);
    assert.deepEqual(state.body, { error: 'Invalid or expired token.' });
    assert.equal(nextCalled, false);
  });

  test('rejects an expired token', () => {
    const expired = jwt.sign({ userId: 5, email: 'x@y.com' }, SECRET, { expiresIn: -10 });
    const { response, state } = buildResponse();
    let nextCalled = false;
    const next: NextFunction = () => { nextCalled = true; };

    requireAuth(buildRequest(`Bearer ${expired}`), response, next);

    assert.equal(state.statusCode, 401);
    assert.deepEqual(state.body, { error: 'Invalid or expired token.' });
    assert.equal(nextCalled, false);
  });

  test('accepts a valid token and attaches the user to the request', () => {
    const token = createToken(99, 'valid@example.com');
    const request = buildRequest(`Bearer ${token}`);
    const { response } = buildResponse();
    let nextCalled = false;
    const next: NextFunction = () => { nextCalled = true; };

    requireAuth(request, response, next);

    assert.equal(nextCalled, true);
    assert.equal(request.user?.userId, 99);
    assert.equal(request.user?.email, 'valid@example.com');
  });
});
