import "dotenv/config";
import express from "express";
import cors from "cors";
import { pool } from "./db";
import authRoutes from "./routes/auth";
import projectRoutes from "./routes/projects";
import taskRoutes from "./routes/tasks";

const app = express();
const PORT = Number(process.env.PORT) || 4000;

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "teamhub-backend", time: new Date().toISOString() });
});

app.use("/auth", authRoutes);
app.use("/projects", projectRoutes);
app.use("/tasks", taskRoutes);

app.get("/", (_req, res) => {
  res.json({ service: "teamhub-backend", endpoints: ["/health", "/auth/signup", "/auth/login", "/projects", "/tasks"] });
});

async function start() {
  // Best-effort: ensure pgcrypto for gen_random_uuid() (no-op if present).
  try {
    await pool.query("CREATE EXTENSION IF NOT EXISTS pgcrypto");
  } catch (err) {
    console.warn("pgcrypto extension check skipped:", (err as Error).message);
  }
  app.listen(PORT, () => {
    console.log(`teamhub-backend listening on :${PORT}`);
  });
}

start().catch((err) => {
  console.error("Failed to start server", err);
  process.exit(1);
});
