export function generateSlug(length = 7) {
  const alphabet = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let slug = '';

  for (let index = 0; index < length; index += 1) {
    slug += alphabet[Math.floor(Math.random() * alphabet.length)];
  }

  return slug;
}

export function isValidUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}
