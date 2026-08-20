import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { generateSlug, isValidUrl, isPrivateOrReservedHost, MAX_TARGET_URL_LENGTH } from '../src/utils';

const ALLOWED = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';
// Ambiguous characters that MUST NOT appear in slugs (avoids i/l/1, o/0 confusion).
const FORBIDDEN = ['i', 'l', 'o', '0', '1', 'I', 'L', 'O'];

describe('generateSlug', () => {
  test('defaults to a length of 7', () => {
    assert.equal(generateSlug().length, 7);
  });

  test('honours a custom length', () => {
    for (const length of [1, 4, 10, 32]) {
      assert.equal(generateSlug(length).length, length);
    }
  });

  test('returns an empty string for length 0', () => {
    assert.equal(generateSlug(0), '');
  });

  test('only uses characters from the safe alphabet', () => {
    for (let i = 0; i < 200; i += 1) {
      const slug = generateSlug(12);
      for (const char of slug) {
        assert.ok(ALLOWED.includes(char), `Unexpected character "${char}" in slug "${slug}"`);
      }
    }
  });

  test('never emits visually ambiguous characters', () => {
    for (let i = 0; i < 200; i += 1) {
      const slug = generateSlug(20);
      for (const forbidden of FORBIDDEN) {
        assert.ok(!slug.includes(forbidden), `Slug "${slug}" contained ambiguous char "${forbidden}"`);
      }
    }
  });

  test('produces highly-varied output (effectively unique)', () => {
    const slugs = new Set<string>();
    for (let i = 0; i < 1000; i += 1) {
      slugs.add(generateSlug());
    }
    // With 7 chars from a 54-char alphabet, 1000 samples should be all-unique in practice.
    assert.ok(slugs.size > 990, `Expected near-unique slugs but only got ${slugs.size} distinct values`);
  });
});

describe('isValidUrl', () => {
  test('accepts http and https URLs', () => {
    assert.equal(isValidUrl('http://example.com'), true);
    assert.equal(isValidUrl('https://example.com'), true);
    assert.equal(isValidUrl('https://example.com/path?q=1#frag'), true);
    assert.equal(isValidUrl('https://sub.domain.example.co.uk:8080/a/b'), true);
  });

  test('rejects non-http(s) protocols', () => {
    assert.equal(isValidUrl('ftp://example.com'), false);
    assert.equal(isValidUrl('javascript:alert(1)'), false);
    assert.equal(isValidUrl('mailto:someone@example.com'), false);
    assert.equal(isValidUrl('file:///etc/passwd'), false);
  });

  test('rejects malformed or empty input', () => {
    assert.equal(isValidUrl(''), false);
    assert.equal(isValidUrl('not a url'), false);
    assert.equal(isValidUrl('example.com'), false);
    assert.equal(isValidUrl('   '), false);
    assert.equal(isValidUrl('//example.com'), false);
  });

  test('rejects loopback / private / link-local targets (SSRF protection)', () => {
    assert.equal(isValidUrl('http://localhost/'), false);
    assert.equal(isValidUrl('http://sub.localhost/'), false);
    assert.equal(isValidUrl('http://127.0.0.1/'), false);
    assert.equal(isValidUrl('http://127.5.5.5:8080/x'), false);
    assert.equal(isValidUrl('http://10.0.0.5/'), false);
    assert.equal(isValidUrl('http://172.16.0.1/'), false);
    assert.equal(isValidUrl('http://192.168.1.1/'), false);
    assert.equal(isValidUrl('http://169.254.169.254/latest/meta-data'), false);
    assert.equal(isValidUrl('http://[::1]/'), false);
    assert.equal(isValidUrl('http://[fe80::1]/'), false);
    assert.equal(isValidUrl('http://[fc00::1]/'), false);
    assert.equal(isValidUrl('http://[::ffff:169.254.169.254]/'), false);
    // The URL parser rewrites IPv4-mapped literals to compressed hex form
    // (::ffff:a9fe:a9fe), which must still resolve to the blocked IPv4 address.
    assert.equal(isValidUrl('http://[::ffff:a9fe:a9fe]/'), false); // 169.254.169.254
    assert.equal(isValidUrl('http://[::ffff:7f00:1]/'), false); // 127.0.0.1
    assert.equal(isValidUrl('http://[::ffff:a00:1]/'), false); // 10.0.0.1
    assert.equal(isValidUrl('http://[::ffff:c0a8:1]/'), false); // 192.168.0.1
  });

  test('still allows ordinary public hosts', () => {
    assert.equal(isValidUrl('https://example.com/path'), true);
    assert.equal(isValidUrl('http://172.15.0.1/'), true); // just outside the private 172.16/12 block
    assert.equal(isValidUrl('http://8.8.8.8/'), true);
  });

  test('enforces the MAX_TARGET_URL_LENGTH cap at the boundary', () => {
    const prefix = 'https://example.com/';
    // A URL of exactly MAX_TARGET_URL_LENGTH characters is accepted...
    const atLimit = prefix + 'a'.repeat(MAX_TARGET_URL_LENGTH - prefix.length);
    assert.equal(atLimit.length, MAX_TARGET_URL_LENGTH);
    assert.equal(isValidUrl(atLimit), true);

    // ...and a single character over the limit is rejected.
    const overLimit = atLimit + 'a';
    assert.equal(overLimit.length, MAX_TARGET_URL_LENGTH + 1);
    assert.equal(isValidUrl(overLimit), false);
  });
});

describe('isPrivateOrReservedHost', () => {
  test('flags internal hosts', () => {
    for (const host of ['localhost', '127.0.0.1', '10.1.2.3', '192.168.0.1', '169.254.169.254', '::1', 'fe80::1']) {
      assert.equal(isPrivateOrReservedHost(host), true, `${host} should be blocked`);
    }
  });

  test('allows public hosts', () => {
    for (const host of ['example.com', '8.8.8.8', '1.1.1.1', '172.32.0.1', '2606:4700:4700::1111']) {
      assert.equal(isPrivateOrReservedHost(host), false, `${host} should be allowed`);
    }
  });
});
