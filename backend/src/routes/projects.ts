import { Router } from "express";
import { query } from "../db";
import { requireAuth, AuthedRequest } from "../auth";

const router = Router();

router.use(requireAuth);

// List projects owned by the authed user
router.get("/", async (req: AuthedRequest, res) => {
  const rows = await query(
    `SELECT id, name, icon, color, description, archived, created_at
     FROM projects WHERE owner_id = $1 ORDER BY created_at ASC`,
    [req.userId],
  );
  res.json({ projects: rows });
});

router.post("/", async (req: AuthedRequest, res) => {
  const { name, icon, color, description } = req.body ?? {};
  if (!name) return res.status(400).json({ error: "name is required" });
  const rows = await query(
    `INSERT INTO projects (owner_id, name, icon, color, description)
     VALUES ($1, $2, COALESCE($3,'📁'), COALESCE($4,'#6366f1'), COALESCE($5,''))
     RETURNING id, name, icon, color, description, archived, created_at`,
    [req.userId, name, icon, color, description],
  );
  res.status(201).json({ project: rows[0] });
});

router.patch("/:id", async (req: AuthedRequest, res) => {
  const { name, description, archived } = req.body ?? {};
  const rows = await query(
    `UPDATE projects SET
       name = COALESCE($3, name),
       description = COALESCE($4, description),
       archived = COALESCE($5, archived)
     WHERE id = $1 AND owner_id = $2
     RETURNING id, name, icon, color, description, archived, created_at`,
    [req.params.id, req.userId, name, description, archived],
  );
  if (rows.length === 0) return res.status(404).json({ error: "Project not found" });
  res.json({ project: rows[0] });
});

router.delete("/:id", async (req: AuthedRequest, res) => {
  const rows = await query(
    "DELETE FROM projects WHERE id = $1 AND owner_id = $2 RETURNING id",
    [req.params.id, req.userId],
  );
  if (rows.length === 0) return res.status(404).json({ error: "Project not found" });
  res.json({ ok: true });
});

export default router;
