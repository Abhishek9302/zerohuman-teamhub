# TeamHub

TeamHub is a polished team project management app prototype inspired by Asana, Jira, Linear, and Notion.

This repository currently delivers a **buildable documentation-backed frontend demo** for ticket **ABH-1**, with release notes and implementation handoff artifacts prepared for automated PR flow.

## ABH-1 overview
The original ticket asked for a **full-stack team project management platform** with:
- React + TypeScript + Vite + Tailwind CSS + shadcn/ui
- Node.js + Express + TypeScript backend
- Drizzle ORM + PostgreSQL
- JWT authentication
- organizations, projects, tasks, subtasks, comments, labels, notifications, and activity logs
- deployable infrastructure across Vercel, AWS ECS Fargate, and AWS RDS PostgreSQL

## What was built in this branch
The current implementation in the repo is a **frontend demo/prototype** that includes:
- dashboard summary cards for my tasks, overdue work, due today, and completed work
- sidebar navigation with project list
- task surfaces in:
  - list view
  - kanban board view
  - calendar view
- task detail panel with:
  - title and description
  - assignee and status information
  - subtasks
  - comments
  - activity feed
- team members page showing organization access and workload snapshot
- notifications panel
- command palette shell
- responsive dark UI styling suitable for desktop and tablet demo review

## Current implementation status
This branch is **not yet the full-stack product described in the original ticket**.

### Implemented now
- buildable UI application
- mock seeded data for projects, tasks, members, comments, and activity
- typed frontend data model helpers
- release documentation and QA handoff artifacts

### Not implemented yet
- JWT signup/login/logout flows
- Express REST API
- PostgreSQL database
- Drizzle ORM models and migrations
- server-side validation and pagination
- real organization/project/task persistence
- AWS ECS/RDS deployment integration
- Vercel-to-backend production wiring

## Tech stack currently present in the repo
- Next.js 14
- React 18
- TypeScript
- lucide-react

## Project structure
- `app/` — application shell and route entrypoints
- `components/` — dashboard, task, board, team, and notification UI
- `src/data.ts` — seeded TeamHub mock data
- `src/types.ts` — typed frontend models
- `src/lib.ts` — UI data helpers
- `docs/PLAN.md` — target architecture plan for the intended full-stack version
- `docs/SCHEMA.md` — planned database schema
- `docs/PEDANT_REVIEW.md` — QA/build verification artifact
- `docs/IMPLEMENTATION_NOTES.md` — release and handoff notes

## Setup
Install dependencies:

```bash
npm install
```

## Run locally
Start the development server:

```bash
npm run dev
```

Then open the local app URL shown by Next.js in your terminal.

## Build
Create a production build:

```bash
npm run build
```

## Typecheck
Run TypeScript validation:

```bash
npm run typecheck
```

## Release readiness notes
For ABH-1 documentation handoff, this branch is ready for:
- code review
- UI walkthroughs
- automated PR creation
- scope clarification between prototype delivery and full-stack production delivery

It is **not** ready for production deployment as the originally requested Vercel + ECS + RDS stack because the backend and infrastructure portions are not implemented in this branch.

## Handoff documents
- Architecture target: `docs/PLAN.md`
- Schema target: `docs/SCHEMA.md`
- QA review: `docs/PEDANT_REVIEW.md`
- Delivery notes: `docs/IMPLEMENTATION_NOTES.md`
