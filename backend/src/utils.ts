import crypto from 'node:crypto';
import net from 'node:net';

// Deliberately excludes visually ambiguous characters (0/O, 1/l/I) so slugs are
// unguessable AND unmistakable when copied by hand. Note the uppercase "L" is
// omitted too, matching the lowercase exclusion.
const SLUG_ALPHABET = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';

// Cap the stored URL length to keep payloads bounded and avoid abusive input.
export const MAX_TARGET_URL_LENGTH = 2048;

/**
 * Generate an unguessable slug using a cryptographically secure RNG.
 * Using Math.random() would make slugs predictable and allow enumeration of
 * other users' links, so we draw uniformly with crypto.randomInt instead.
 */
export function generateSlug(length = 7) {
  let slug = '';

  for (let index = 0; index < length; index += 1) {
    slug += SLUG_ALPHABET[crypto.randomInt(SLUG_ALPHABET.length)];
  }

  return slug;
}

/**
 * Detect hostnames/IP literals that point at the loopback interface, private
 * networks, link-local space (including the 169.254.169.254 cloud metadata
 * endpoint) or unique-local IPv6. Allowing these as redirect targets would let
 * the shortener be used to reach internal-only infrastructure (SSRF) or to
 * disguise attacks against a private network behind a public short link.
 */
export function isPrivateOrReservedHost(hostname: string): boolean {
  // URL#hostname keeps IPv6 addresses wrapped in brackets, e.g. "[::1]".
  const host = hostname.toLowerCase().replace(/^\[/, '').replace(/\]$/, '');

  if (host === '' || host === 'localhost' || host.endsWith('.localhost')) {
    return true;
  }

  const ipVersion = net.isIP(host);

  if (ipVersion === 4) {
    return isPrivateIpv4(host);
  }

  if (ipVersion === 6) {
    // IPv4-mapped / IPv4-compatible IPv6 must be re-checked as IPv4 so the SSRF
    // guard cannot be bypassed by wrapping a blocked address (e.g. the
    // 169.254.169.254 cloud metadata endpoint) in an IPv6 literal. The WHATWG
    // URL parser normalises "[::ffff:169.254.169.254]" to its compressed hex
    // form "[::ffff:a9fe:a9fe]", so we must handle BOTH the dotted-decimal and
    // hex representations here.
    const embeddedIpv4 = extractEmbeddedIpv4(host);
    if (embeddedIpv4) {
      return isPrivateIpv4(embeddedIpv4);
    }

    if (host === '::' || host === '::1') {
      return true; // unspecified + loopback
    }

    // fc00::/7 (unique-local) and fe80::/10 (link-local).
    return /^f[cd]/.test(host) || /^fe[89ab]/.test(host);
  }

  return false;
}

/**
 * Pull the embedded IPv4 address out of an IPv4-mapped ("::ffff:a.b.c.d") or
 * IPv4-compatible ("::a.b.c.d") IPv6 literal, in either its dotted-decimal or
 * compressed-hex ("::ffff:a9fe:a9fe") form. Returns the dotted-decimal string,
 * or null when the host carries no embedded IPv4 address.
 */
function extractEmbeddedIpv4(host: string): string | null {
  // Dotted-decimal, e.g. ::ffff:169.254.169.254 or ::169.254.169.254
  const dotted = host.match(/^::(?:ffff:)?(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/i);
  if (dotted) {
    return dotted[1];
  }

  // Compressed-hex IPv4-mapped, e.g. ::ffff:a9fe:a9fe
  const hex = host.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i);
  if (hex) {
    const high = parseInt(hex[1], 16);
    const low = parseInt(hex[2], 16);
    return [(high >> 8) & 0xff, high & 0xff, (low >> 8) & 0xff, low & 0xff].join('.');
  }

  return null;
}

function isPrivateIpv4(host: string): boolean {
  const parts = host.split('.').map(Number);
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part) || part < 0 || part > 255)) {
    return true; // treat anything unparseable as unsafe
  }

  const [a, b] = parts;

  if (a === 0 || a === 10 || a === 127) return true; // "this network", private, loopback
  if (a === 169 && b === 254) return true; // link-local incl. 169.254.169.254 metadata
  if (a === 172 && b >= 16 && b <= 31) return true; // private
  if (a === 192 && b === 168) return true; // private
  if (a === 100 && b >= 64 && b <= 127) return true; // carrier-grade NAT

  return false;
}

/**
 * Only allow http(s) targets aimed at public hosts. This blocks dangerous
 * schemes such as `javascript:`, `data:` and `file:` (phishing / local probing)
 * and rejects loopback/private/link-local targets to prevent the redirect
 * endpoint from being abused for SSRF against internal infrastructure.
 */
export function isValidUrl(value: string) {
  if (typeof value !== 'string' || value.length === 0 || value.length > MAX_TARGET_URL_LENGTH) {
    return false;
  }

  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return false;
    }
    return !isPrivateOrReservedHost(url.hostname);
  } catch {
    return false;
  }
}
