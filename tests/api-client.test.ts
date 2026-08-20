// Unit tests for the frontend API client (src/lib.ts) -- the layer that wires the
// Next.js UI to the Express backend over HTTP via NEXT_PUBLIC_API_URL.
//
// We never hit a real network here: global.fetch is replaced with a small spy
// that records the request (url/method/headers/body) and returns a canned
// Response. That lets us assert BOTH halves of the contract:
//   1. the client sends the right request (path, verb, auth header, JSON body);
//   2. the client parses success bodies and surfaces backend error messages.
//
// src/lib.ts captures process.env.NEXT_PUBLIC_API_URL at module-evaluation time,
// so we set it BEFORE importing the module. ESM `import` is hoisted above other
// top-level code, and a top-level `await import()` is unsupported under the
// CommonJS transform tsx uses here, so we defer the import into a `before()`
// hook -- it runs after the env assignment but before any test body.
import { before, beforeEach, afterEach, test, describe } from 'node:test';
import assert from 'node:assert/strict';

const API_URL = 'https://api.sniplet.test';
process.env.NEXT_PUBLIC_API_URL = API_URL;

type LibModule = typeof import('../src/lib');
let lib: LibModule;

before(async () => {
  lib = await import('../src/lib');
});

// ---- fetch spy ---------------------------------------------------------------
interface RecordedCall {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: unknown;
  cache?: string;
}

const calls: RecordedCall[] = [];
const originalFetch = globalThis.fetch;

// The next Response the spy will hand back. Tests overwrite this per-case.
let nextResponse: () => Response = () => jsonResponse(200, {});

function jsonResponse(status: number, payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

function record(input: RequestInfo | URL, init?: RequestInit): RecordedCall {
  const headers: Record<string, string> = {};
  const rawHeaders = init?.headers as Record<string, string> | undefined;
  if (rawHeaders) {
    for (const [key, value] of Object.entries(rawHeaders)) {
      headers[key] = value;
    }
  }
  return {
    url: String(input),
    method: (init?.method ?? 'GET').toUpperCase(),
    headers,
    body: init?.body ? JSON.parse(init.body as string) : undefined,
    cache: (init as { cache?: string } | undefined)?.cache
  };
}

beforeEach(() => {
  calls.length = 0;
  nextResponse = () => jsonResponse(200, {});
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push(record(input, init));
    return nextResponse();
  }) as typeof fetch;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('signup', () => {
  test('POSTs credentials to /auth/signup and returns the parsed auth response', async () => {
    const authBody = { token: 'jwt-token', user: { id: 1, email: 'a@b.com' } };
    nextResponse = () => jsonResponse(201, authBody);

    const result = await lib.signup('a@b.com', 'supersecret');

    assert.equal(calls.length, 1);
    const [call] = calls;
    assert.equal(call.url, `${API_URL}/auth/signup`);
    assert.equal(call.method, 'POST');
    assert.equal(call.headers['Content-Type'], 'application/json');
    assert.deepEqual(call.body, { email: 'a@b.com', password: 'supersecret' });
    assert.deepEqual(result, authBody);
  });

  test('throws the backend error message on a 409 conflict', async () => {
    nextResponse = () => jsonResponse(409, { error: 'Email already exists.' });
    await assert.rejects(lib.signup('dupe@b.com', 'supersecret'), /Email already exists\./);
  });
});

describe('login', () => {
  test('POSTs credentials to /auth/login and returns the parsed auth response', async () => {
    const authBody = { token: 'jwt-token', user: { id: 7, email: 'me@b.com' } };
    nextResponse = () => jsonResponse(200, authBody);

    const result = await lib.login('me@b.com', 'supersecret');

    const [call] = calls;
    assert.equal(call.url, `${API_URL}/auth/login`);
    assert.equal(call.method, 'POST');
    assert.deepEqual(call.body, { email: 'me@b.com', password: 'supersecret' });
    assert.deepEqual(result, authBody);
  });

  test('throws "Invalid credentials." on a 401', async () => {
    nextResponse = () => jsonResponse(401, { error: 'Invalid credentials.' });
    await assert.rejects(lib.login('me@b.com', 'wrong'), /Invalid credentials\./);
  });
});

describe('fetchLinks', () => {
  test('GETs /links with a bearer token, no-store cache, and returns the array', async () => {
    const links = [
      { id: 1, slug: 'abc1234', target_url: 'https://x.com', clicks: 3, owner_id: 1, created_at: 'now' }
    ];
    nextResponse = () => jsonResponse(200, links);

    const result = await lib.fetchLinks('my-token');

    const [call] = calls;
    assert.equal(call.url, `${API_URL}/links`);
    assert.equal(call.method, 'GET');
    assert.equal(call.headers.Authorization, 'Bearer my-token');
    assert.equal(call.cache, 'no-store');
    assert.deepEqual(result, links);
  });

  test('returns an empty array when the user has no links', async () => {
    nextResponse = () => jsonResponse(200, []);
    const result = await lib.fetchLinks('my-token');
    assert.deepEqual(result, []);
  });

  test('throws on an unauthorized (401) response', async () => {
    nextResponse = () => jsonResponse(401, { error: 'Missing bearer token.' });
    await assert.rejects(lib.fetchLinks('bad-token'), /Missing bearer token\./);
  });
});

describe('createLink', () => {
  test('POSTs the targetUrl with auth and returns the created link', async () => {
    const link = { id: 9, slug: 'newslug', target_url: 'https://x.com', clicks: 0, owner_id: 1, created_at: 'now' };
    nextResponse = () => jsonResponse(201, link);

    const result = await lib.createLink('https://x.com', 'my-token');

    const [call] = calls;
    assert.equal(call.url, `${API_URL}/links`);
    assert.equal(call.method, 'POST');
    assert.equal(call.headers['Content-Type'], 'application/json');
    assert.equal(call.headers.Authorization, 'Bearer my-token');
    assert.deepEqual(call.body, { targetUrl: 'https://x.com' });
    assert.deepEqual(result, link);
  });

  test('throws the validation error from the backend on a 400', async () => {
    nextResponse = () => jsonResponse(400, { error: 'A valid targetUrl is required.' });
    await assert.rejects(lib.createLink('not-a-url', 'my-token'), /A valid targetUrl is required\./);
  });
});

describe('deleteLink', () => {
  test('sends DELETE /links/:id with auth and returns the success payload', async () => {
    nextResponse = () => jsonResponse(200, { success: true });

    const result = await lib.deleteLink(42, 'my-token');

    const [call] = calls;
    assert.equal(call.url, `${API_URL}/links/42`);
    assert.equal(call.method, 'DELETE');
    assert.equal(call.headers.Authorization, 'Bearer my-token');
    assert.deepEqual(result, { success: true });
  });

  test('throws when deleting a missing / non-owned link (404)', async () => {
    nextResponse = () => jsonResponse(404, { error: 'Link not found.' });
    await assert.rejects(lib.deleteLink(999, 'my-token'), /Link not found\./);
  });
});

describe('getShortUrl', () => {
  test('builds the public redirect URL from the slug', () => {
    assert.equal(lib.getShortUrl('abc1234'), `${API_URL}/r/abc1234`);
  });
});

describe('error parsing (parseResponse)', () => {
  test('falls back to a generic message when the error body is not JSON', async () => {
    nextResponse = () => new Response('<html>502 Bad Gateway</html>', {
      status: 502,
      headers: { 'Content-Type': 'text/html' }
    });
    await assert.rejects(lib.fetchLinks('my-token'), /Request failed/);
  });

  test('falls back to a generic message when the error body has no "error" field', async () => {
    nextResponse = () => jsonResponse(500, { unexpected: 'shape' });
    await assert.rejects(lib.login('a@b.com', 'x'), /Request failed/);
  });

  test('propagates a network-level fetch rejection', async () => {
    globalThis.fetch = (async () => {
      throw new TypeError('Failed to fetch');
    }) as typeof fetch;
    await assert.rejects(lib.fetchLinks('my-token'), /Failed to fetch/);
  });
});
