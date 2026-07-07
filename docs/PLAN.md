# TeamHub — Implementation Plan (ABH-1)

> Author: The Architect · Phase: PLAN_DESIGN · Status: Ready for Grunt
> Repo: https://github.com/Abhishek9302/zerohuman-teamhub

## 0. Scope Summary
Full-stack team project management app (Asana/Jira-like). Auth, orgs w/ RBAC,
projects, tasks (list/kanban/calendar), subtasks, comments+@mentions, labels,
activity feed, dashboard, team page, notifications. Dark mode, cmd palette,
responsive, animated. Deploy FE→Vercel, BE→ECS Fargate, DB→RDS Postgres.

## 1. Tech Stack (fixed)
- Frontend: React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui
- Backend: Node.js 22 + Express + TypeScript + Drizzle ORM
- DB: PostgreSQL 16
- Auth: JWT (access + refresh), bcrypt password hashing
- Validation: zod (shared between FE/BE via packages/shared)
- Extras: cmdk (Cmd+K), framer-motion (animations), TanStack Query (data),
  react-router-dom, zustand (light client state), lucide-react (icons)

## 2. Monorepo Layout (pnpm workspaces)
```
zerohuman-teamhub/
├─ package.json                # workspace root, scripts
├─ pnpm-workspace.yaml
├─ tsconfig.base.json
├─ .env.example
├─ docker-compose.yml          # local postgres + api
├─ packages/
│  └─ shared/                  # zod schemas, shared TS types, enums, constants
│     ├─ src/schemas/*.ts
│     ├─ src/types.ts
│     └─ package.json
├─ apps/
│  ├─ api/                     # Express + Drizzle backend
│  │  ├─ src/
│  │  │  ├─ index.ts           # app bootstrap
│  │  │  ├─ db/
│  │  │  │  ├─ schema.ts       # Drizzle table defs (12 tables)
│  │  │  │  ├─ client.ts       # drizzle(pg pool)
│  │  │  │  └─ seed.ts
│  │  │  ├─ middleware/        # auth, error, validate(zod), rbac, pagination
│  │  │  ├─ routes/            # auth, orgs, projects, tasks, comments,
│  │  │  │                     #  labels, notifications, activity, dashboard, members
│  │  │  ├─ services/          # business logic
│  │  │  └─ utils/             # jwt, activity-logger, notifier
│  │  ├─ drizzle.config.ts
│  │  ├─ Dockerfile
│  │  └─ package.json
│  └─ web/                     # React frontend
│     ├─ src/
│     │  ├─ main.tsx / App.tsx / router.tsx
│     │  ├─ components/ui/     # shadcn generated
│     │  ├─ components/        # Sidebar, CommandPalette, TaskCard, KanbanBoard,
│     │  │                     #  CalendarView, TaskListView, CommentThread, etc.
│     │  ├─ pages/             # per section (see §5)
│     │  ├─ features/          # api hooks (TanStack Query) per domain
│     │  ├─ lib/               # api client (axios), auth store, theme
│     │  └─ styles/index.css   # tailwind + dark theme tokens
│     ├─ vite.config.ts
│     ├─ tailwind.config.ts
│     ├─ vercel.json
│     └─ package.json
└─ docs/                       # PLAN.md, SCHEMA.md, API.md, DEPLOY.md
```

## 3. Database Schema (12 tables — Drizzle/pgTable)
See docs/SCHEMA.md for full column detail. Tables:
1. **users** — id(uuid pk), email(unique), passwordHash, name, avatarUrl, createdAt
2. **organizations** — id, name, slug(unique), ownerId→users, createdAt
3. **org_members** — id, orgId→orgs, userId→users, role(enum owner|admin|member|viewer), invitedEmail, status(pending|active), createdAt; unique(orgId,userId)
4. **projects** — id, orgId→orgs, name, description, color, icon, archived(bool), createdById→users, createdAt
5. **project_members** — id, projectId→projects, userId→users, role, createdAt; unique(projectId,userId)
6. **tasks** — id, projectId→projects, title, description, assigneeId→users(nullable), creatorId→users, dueDate(timestamp,null), priority(enum low|medium|high|urgent), status(enum todo|in_progress|in_review|done), position(int for ordering), createdAt, updatedAt
7. **subtasks** — id, taskId→tasks(parent), title, done(bool), assigneeId(null), position, createdAt  *(nested via self-ref optional; use parentTaskId on tasks OR dedicated table — chosen: dedicated subtasks table for simplicity + a nullable tasks.parentTaskId for true nesting)*
8. **comments** — id, taskId→tasks, authorId→users, body(text), mentions(uuid[]), createdAt, updatedAt
9. **labels** — id, projectId→projects, name, color, createdAt; unique(projectId,name)
10. **task_labels** — taskId→tasks, labelId→labels; pk(taskId,labelId)
11. **notifications** — id, userId→users(recipient), type(enum assignment|comment|mention|due_date|invite), entityType, entityId, actorId→users, message, read(bool), createdAt
12. **activity_log** — id, orgId, projectId(null), taskId(null), actorId→users, action(enum created|updated|status_changed|assigned|commented|archived|...), meta(jsonb), createdAt

Enums defined via pgEnum: role, task_priority, task_status, notification_type, activity_action.
Indexes: tasks(projectId,status), tasks(assigneeId), comments(taskId), notifications(userId,read), activity_log(projectId,createdAt).

## 4. API Design (REST, JWT-protected except auth/*)
Base: `/api`. All list endpoints paginated `?page=&pageSize=` returning `{data,total,page,pageSize}`.
Standard status codes: 200/201/204, 400 validation, 401 auth, 403 rbac, 404, 409 conflict.

- **auth**: POST /auth/signup, POST /auth/login, POST /auth/refresh, POST /auth/logout, GET /auth/me
- **orgs**: POST /orgs, GET /orgs, GET /orgs/:id, PATCH /orgs/:id, POST /orgs/:id/invite, GET /orgs/:id/members, PATCH /orgs/:id/members/:memberId (role), DELETE /orgs/:id/members/:memberId, POST /orgs/invites/:token/accept
- **projects**: POST /orgs/:orgId/projects, GET /orgs/:orgId/projects, GET /projects/:id, PATCH /projects/:id, POST /projects/:id/archive, project members CRUD
- **tasks**: POST /projects/:pid/tasks, GET /projects/:pid/tasks (filters: status,assignee,priority,label,q), GET /tasks/:id, PATCH /tasks/:id, PATCH /tasks/:id/status, PATCH /tasks/:id/move (position/status for kanban DnD), DELETE /tasks/:id
- **subtasks**: POST /tasks/:id/subtasks, PATCH /subtasks/:id, DELETE /subtasks/:id
- **comments**: GET /tasks/:id/comments, POST /tasks/:id/comments, PATCH/DELETE /comments/:id
- **labels**: GET/POST /projects/:pid/labels, PATCH/DELETE /labels/:id, POST/DELETE /tasks/:id/labels/:labelId
- **notifications**: GET /notifications, PATCH /notifications/:id/read, POST /notifications/read-all
- **activity**: GET /projects/:pid/activity, GET /tasks/:id/activity
- **dashboard**: GET /dashboard (myTasks, overdue, dueToday, byProject counts)
- **members**: GET /orgs/:id/members-with-stats (role + task counts)

Middleware chain: cors → json → requireAuth → resolveOrgContext → requireRole(min) → validate(zodSchema) → handler → errorHandler.
Cross-cutting: every mutating task/project action writes activity_log + fans out notifications (assignment, mention, comment, due-date via cron/interval check).

## 5. Frontend Pages & Components
Routes (react-router):
- /login, /signup (public)
- /(app) shell with Sidebar + Topbar + CommandPalette
  - /dashboard — my tasks, overdue, due today, by-project widgets
  - /projects/:id — tabs: List | Board (Kanban DnD) | Calendar
  - /projects/:id/tasks/:taskId — task detail drawer/modal (desc, subtasks, comments, activity, labels, assignee, due, priority)
  - /team — members table (role, task count, invite button)
  - /notifications — in-app feed
  - /settings/org — org + members + roles
Key components: Sidebar(project list), CommandPalette(cmdk), ThemeToggle(dark mode),
KanbanBoard(dnd-kit), TaskCard, TaskListTable, CalendarView, CommentThread(@mention autocomplete),
LabelPicker, AssigneePicker, PriorityBadge, StatusBadge, ActivityFeed, NotificationBell.
State: TanStack Query for server cache; zustand for auth/theme/ui. framer-motion for view + drawer transitions.

## 6. Deployment Plan
- **Frontend → Vercel**: root apps/web, build `pnpm build`, output dist, env `VITE_API_URL`. vercel.json rewrites for SPA.
- **Backend → AWS ECS Fargate**: multi-stage Dockerfile (build TS → node:22-slim runtime), listens on PORT, healthcheck GET /health. Task def + service behind ALB. Push image to ECR. Env: DATABASE_URL, JWT_SECRET, JWT_REFRESH_SECRET, CORS_ORIGIN.
- **DB → AWS RDS PostgreSQL**: run `drizzle-kit push`/migrations on deploy (init container or one-off task). Security group allows ECS tasks only.
- Connectivity: FE VITE_API_URL → ALB DNS; BE DATABASE_URL → RDS endpoint; CORS_ORIGIN → Vercel domain.
- IaC optional: provide docs/DEPLOY.md with step-by-step + sample task-definition.json. (Grunt: ship Dockerfile + compose + deploy docs; live AWS provisioning is manual/credential-gated.)

## 7. Environment Variables (.env.example)
API: PORT, DATABASE_URL, JWT_SECRET, JWT_REFRESH_SECRET, ACCESS_TTL, REFRESH_TTL, CORS_ORIGIN
WEB: VITE_API_URL

## 8. Build / Verify Commands (for later phases)
- Install: `pnpm install`
- DB up (local): `docker compose up -d db`
- Migrate: `pnpm --filter api db:push` (drizzle-kit)
- Seed: `pnpm --filter api db:seed`
- Dev: `pnpm --filter api dev` + `pnpm --filter web dev`
- Typecheck: `pnpm -r typecheck`
- Build: `pnpm -r build`
- Smoke (Pedant, post-deploy): Playwright — login → create project → create task → move on kanban.

## 9. Handoff Order (delivery ownership)
- **Grunt**: scaffold monorepo, implement shared schemas, Drizzle schema+migrations,
  all API routes+middleware, full frontend pages/components, Dockerfile, compose,
  deploy docs. NO push / NO PR.
- **Pedant**: review with codebase-reader MCP, verify schema via PostgreSQL MCP,
  run typecheck/build + Playwright smoke. NO push / NO PR.
- **Scribe**: ONLY role to `git push` branch and open PR to
  github.com/Abhishek9302/zerohuman-teamhub.

## 10. Sequencing for Grunt (recommended)
1. Root workspace + tsconfig + tooling
2. packages/shared (enums + zod)
3. apps/api: db schema → client → migrations → auth → middleware → routes → activity/notify
4. apps/web: shell/theme/router → auth pages → dashboard → project views → task detail → team/notifications → command palette
5. Docker + compose + DEPLOY.md
6. Local run + typecheck/build green
