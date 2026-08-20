import type { ApiError, AuthResponse, ShortLink } from '@/src/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

async function parseResponse<T>(response: Response): Promise<T> {
  const data = (await response.json().catch(() => null)) as T | ApiError | null;

  if (!response.ok) {
    const errorMessage = data && typeof data === 'object' && 'error' in data ? data.error : 'Request failed';
    throw new Error(errorMessage);
  }

  return data as T;
}

function getApiUrl() {
  if (!API_URL) {
    throw new Error('NEXT_PUBLIC_API_URL is not configured.');
  }

  return API_URL;
}

export async function signup(email: string, password: string) {
  const response = await fetch(`${getApiUrl()}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  return parseResponse<AuthResponse>(response);
}

export async function login(email: string, password: string) {
  const response = await fetch(`${getApiUrl()}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  return parseResponse<AuthResponse>(response);
}

export async function fetchLinks(token: string) {
  const response = await fetch(`${getApiUrl()}/links`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store'
  });

  return parseResponse<ShortLink[]>(response);
}

export async function createLink(targetUrl: string, token: string) {
  const response = await fetch(`${getApiUrl()}/links`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ targetUrl })
  });

  return parseResponse<ShortLink>(response);
}

export async function deleteLink(id: number, token: string) {
  const response = await fetch(`${getApiUrl()}/links/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });

  return parseResponse<{ success: true }>(response);
}

export function getShortUrl(slug: string) {
  return `${getApiUrl()}/r/${slug}`;
}
