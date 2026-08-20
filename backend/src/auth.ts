import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';

const isProduction = process.env.NODE_ENV === 'production';

/**
 * The JWT signing secret is required. In production we refuse to start without a
 * strong (>= 32 char) secret so tokens can never be forged with a well-known
 * default value. Outside production we fall back to an ephemeral random secret,
 * which invalidates tokens on restart but never leaks a predictable key.
 */
function resolveJwtSecret(): string {
  const configured = process.env.JWT_SECRET;

  if (configured && configured.length >= 32) {
    return configured;
  }

  if (isProduction) {
    throw new Error('JWT_SECRET must be set to a value of at least 32 characters in production.');
  }

  if (configured) {
    console.warn('JWT_SECRET is shorter than 32 characters; using it for non-production only.');
    return configured;
  }

  console.warn('JWT_SECRET is not set; generating an ephemeral development secret. Tokens will not survive a restart.');
  return crypto.randomBytes(48).toString('hex');
}

const jwtSecret = resolveJwtSecret();

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: number;
    email: string;
  };
}

export function createToken(userId: number, email: string) {
  return jwt.sign({ userId, email }, jwtSecret, { expiresIn: '7d' });
}

export function requireAuth(request: AuthenticatedRequest, response: Response, next: NextFunction) {
  const header = request.header('authorization');

  if (!header?.startsWith('Bearer ')) {
    return response.status(401).json({ error: 'Missing bearer token.' });
  }

  const token = header.slice(7);

  try {
    const payload = jwt.verify(token, jwtSecret) as { userId: number; email: string };
    request.user = payload;
    return next();
  } catch {
    return response.status(401).json({ error: 'Invalid or expired token.' });
  }
}
