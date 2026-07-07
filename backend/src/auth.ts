import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";

const JWT_SECRET = process.env.JWT_SECRET || "teamhub-dev-secret-change-me";

export interface AuthedRequest extends Request {
  userId?: string;
  userName?: string;
}

export function signToken(payload: { id: string; name: string; email: string }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) {
    res.status(401).json({ error: "Missing token" });
    return;
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; name: string; email: string };
    req.userId = decoded.id;
    req.userName = decoded.name;
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}
