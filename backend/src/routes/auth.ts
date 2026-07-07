import { Router } from "express";
import bcrypt from "bcryptjs";
import { query } from "../db";
import { signToken, requireAuth, AuthedRequest } from "../auth";

const router = Router();

router.post("/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body ?? {};
    if (!name || !email || !password) {
      return res.status(400).json({ error: "name, email and password are required" });
    }
    const existing = await query("SELECT id FROM users WHERE email = $1", [email]);
    if (existing.length > 0) {
      return res.status(409).json({ error: "Email already registered" });
    }
    const hash = await bcrypt.hash(password, 10);
    const avatar = String(name).trim().slice(0, 2).toUpperCase();
    const rows = await query(
      `INSERT INTO users (name, email, password_hash, role, avatar)
       VALUES ($1, $2, $3, 'Owner', $4)
       RETURNING id, name, email, role, avatar`,
      [name, email, hash, avatar],
    );
    const user = rows[0];
    const token = signToken({ id: user.id, name: user.name, email: user.email });
    return res.status(201).json({ token, user });
  } catch (err) {
    console.error("signup error", err);
    return res.status(500).json({ error: "Signup failed" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body ?? {};
    if (!email || !password) {
      return res.status(400).json({ error: "email and password are required" });
    }
    const rows = await query(
      "SELECT id, name, email, role, avatar, password_hash FROM users WHERE email = $1",
      [email],
    );
    if (rows.length === 0) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const user = rows[0];
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const token = signToken({ id: user.id, name: user.name, email: user.email });
    return res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, avatar: user.avatar },
    });
  } catch (err) {
    console.error("login error", err);
    return res.status(500).json({ error: "Login failed" });
  }
});

// Return the currently authenticated user (used to rehydrate the session on reload).
router.get("/me", requireAuth, async (req: AuthedRequest, res) => {
  const rows = await query(
    "SELECT id, name, email, role, avatar FROM users WHERE id = $1",
    [req.userId],
  );
  if (rows.length === 0) return res.status(404).json({ error: "User not found" });
  return res.json({ user: rows[0] });
});

export default router;
