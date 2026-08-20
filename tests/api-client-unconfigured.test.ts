// Companion to api-client.test.ts covering the "misconfigured deploy" case:
// when NEXT_PUBLIC_API_URL is not injected, every network helper must fail fast
// with a clear message instead of firing a request at "undefined/...".
//
// src/lib.ts reads the env var once at module load, so this scenario needs a
// module instance loaded with the var UNSET. Node's test runner executes each
// test file in its own child process, so deleting the var here cannot leak into
// (or be clobbered by) the configured suite in the sibling file.
import { before, test, describe } from 'node:test';
import assert from 'node:assert/strict';

delete process.env.NEXT_PUBLIC_API_URL;

type LibModule = typeof import('../src/lib');
let lib: LibModule;

before(async () => {
  lib = await import('../src/lib');
});

describe('missing NEXT_PUBLIC_API_URL', () => {
  test('signup rejects before issuing a request', async () => {
    await assert.rejects(lib.signup('a@b.com', 'supersecret'), /NEXT_PUBLIC_API_URL is not configured\./);
  });

  test('login rejects before issuing a request', async () => {
    await assert.rejects(lib.login('a@b.com', 'supersecret'), /NEXT_PUBLIC_API_URL is not configured\./);
  });

  test('fetchLinks rejects before issuing a request', async () => {
    await assert.rejects(lib.fetchLinks('token'), /NEXT_PUBLIC_API_URL is not configured\./);
  });

  test('createLink rejects before issuing a request', async () => {
    await assert.rejects(lib.createLink('https://x.com', 'token'), /NEXT_PUBLIC_API_URL is not configured\./);
  });

  test('deleteLink rejects before issuing a request', async () => {
    await assert.rejects(lib.deleteLink(1, 'token'), /NEXT_PUBLIC_API_URL is not configured\./);
  });

  test('getShortUrl throws synchronously', () => {
    assert.throws(() => lib.getShortUrl('abc1234'), /NEXT_PUBLIC_API_URL is not configured\./);
  });
});
