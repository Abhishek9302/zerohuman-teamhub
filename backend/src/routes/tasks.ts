import { Router } from "express";
import { query } from "../db";
import { requireAuth, AuthedRequest } from "../auth";

const router = Router();

router.use(requireAuth);

// List tasks for the authed user, optionally filtered by ?projectId=
router.get("/", async (req: AuthedRequest, res) => {
  const projectId = (req.query.projectId as string) || null;
  const rows = projectId
    ? await query(
        `SELECT t.* FROM tasks t
         JOIN projects p ON p.id = t.project_id
         WHERE p.owner_id = $1 AND t.project_id = $2
         ORDER BY t.created_at DESC`,
        [req.userId, projectId],
      )
    : await query(
        `SELECT t.* FROM tasks t
         JOIN projects p ON p.id = t.project_id
         WHERE p.owner_id = $1
         ORDER BY t.created_at DESC`,
        [req.userId],
      );
  res.json({ tasks: rows });
});

router.post("/", async (req: AuthedRequest, res) => {
  const { projectId, title, description, assignee, dueDate, priority, status } = req.body ?? {};
  if (!title) return res.status(400).json({ error: "title is required" });

  // If no projectId supplied, ensure the user has a default project.
  let pid = projectId;
  if (!pid) {
    const existing = await query("SELECT id FROM projects WHERE owner_id = $1 ORDER BY created_at ASC LIMIT 1", [req.userId]);
    if (existing.length > 0) {
      pid = existing[0].id;
    } else {
      const created = await query(
        `INSERT INTO projects (owner_id, name, description) VALUES ($1, 'My Tasks', 'Default project') RETURNING id`,
        [req.userId],
      );
      pid = created[0].id;
    }
  }

  const rows = await query(
    `INSERT INTO tasks (project_id, creator_id, title, description, assignee, due_date, priority, status)
     VALUES ($1, $2, $3, COALESCE($4,''), COALESCE($5,''), COALESCE($6,''), COALESCE($7,'Medium'), COALESCE($8,'Todo'))
     RETURNING *`,
    [pid, req.userId, title, description, assignee, dueDate, priority, status],
  );
  res.status(201).json({ task: rows[0] });
});

router.patch("/:id", async (req: AuthedRequest, res) => {
  const { title, description, assignee, dueDate, priority, status } = req.body ?? {};
  const rows = await query(
    `UPDATE tasks t SET
       title = COALESCE($3, title),
       description = COALESCE($4, description),
       assignee = COALESCE($5, assignee),
       due_date = COALESCE($6, due_date),
       priority = COALESCE($7, priority),
       status = COALESCE($8, status),
       updated_at = now()
     FROM projects p
     WHERE t.id = $1 AND t.project_id = p.id AND p.owner_id = $2
     RETURNING t.*`,
    [req.params.id, req.userId, title, description, assignee, dueDate, priority, status],
  );
  if (rows.length === 0) return res.status(404).json({ error: "Task not found" });
  res.json({ task: rows[0] });
});

router.delete("/:id", async (req: AuthedRequest, res) => {
  const rows = await query(
    `DELETE FROM tasks t USING projects p
     WHERE t.id = $1 AND t.project_id = p.id AND p.owner_id = $2
     RETURNING t.id`,
    [req.params.id, req.userId],
  );
  if (rows.length === 0) return res.status(404).json({ error: "Task not found" });
  res.json({ ok: true });
});

export default router;
