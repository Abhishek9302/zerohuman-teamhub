# TeamHub

TeamHub is a project management dashboard UI inspired by Asana and Jira.

This branch currently delivers a polished, buildable **frontend demo** implemented with **Next.js + React + TypeScript** and local mock data. It includes the core product surfaces for a team workspace, but it is **not yet the full-stack system from the original ticket**.

## What was built

### Implemented in this repo
- Dashboard summary cards for personal task status
- Sidebar navigation with project list
- Project task views:
  - List view
  - Kanban board view
  - Calendar view
- Task detail panel with:
  - description
  - subtasks
  - comments
  - activity feed
- Team members page with role and workload snapshot
- Notifications panel
- Command palette shell
- Responsive dark UI styling and demo interactions

### Not included in the current implementation
The original ABH-1 brief asked for a full-stack platform with:
- JWT authentication
- organizations and invitations
- role-based backend access control
- REST API
- PostgreSQL + Drizzle ORM
- deployable backend on ECS/RDS
- Vercel/ECS/RDS integration

Those backend and deployment pieces are **documented in `docs/PLAN.md` and `docs/SCHEMA.md`**, but they are **not implemented in the current codebase**.

## Tech stack in the current branch
- Next.js 14
- React 18
- TypeScript
- lucide-react

## Project structure
- `app/` — Next.js app shell
- `components/` — dashboard, board, calendar, task, team, and notification UI
- `src/data.ts` — seeded mock TeamHub data
- `src/types.ts` — UI data model types
- `src/lib.ts` — client-side data helpers
- `docs/PLAN.md` — original target architecture plan
- `docs/SCHEMA.md` — planned database schema
- `docs/PEDANT_REVIEW.md` — QA/build review notes

## Getting started

### Install
```bash
npm install
```

### Run locally
```bash
npm run dev
```

Then open:

```text
http://localhost:3000
```

### Production build
```bash
npm run build
npm run start
```

### Type checking
```bash
npm run typecheck
```

## Release readiness notes
- `npm run build` passes
- `npm run typecheck` passes
- Current output is suitable as a UI prototype/demo
- Current output is **not release-ready as the originally requested full-stack app**

## Documentation handoff
- Architecture target: `docs/PLAN.md`
- Planned schema: `docs/SCHEMA.md`
- Validation/review notes: `docs/PEDANT_REVIEW.md`
- Delivery gap summary: `docs/IMPLEMENTATION_NOTES.md`
