import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';

const jwtSecret = process.env.JWT_SECRET || 'development-secret-change-me';

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
