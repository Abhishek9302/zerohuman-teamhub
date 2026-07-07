import crypto from 'node:crypto';

const SLUG_ALPHABET = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';

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
 * Only allow http(s) targets. This blocks dangerous schemes such as
 * `javascript:`, `data:` and `file:` that could be used for phishing or to
 * probe internal resources via the redirect endpoint.
 */
export function isValidUrl(value: string) {
  if (typeof value !== 'string' || value.length === 0 || value.length > MAX_TARGET_URL_LENGTH) {
    return false;
  }

  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}
