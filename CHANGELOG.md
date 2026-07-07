# Changelog

## [ABH-2] - 2026-07-07

### Added
- Full-stack Sniplet delivery documentation covering the Next.js 14 frontend, Express + TypeScript backend, and PostgreSQL schema
- README instructions for installation with `npm install`, environment variable setup, database initialization, and local run flow
- Implementation handoff notes for deployment and PR readiness in `docs/IMPLEMENTATION_NOTES.md`

### Implemented in branch
- JWT-based signup and login API flow
- Authenticated link creation, listing, and deletion
- Redirect endpoint that increments per-link click analytics
- PostgreSQL schema for `users` and `links`
- Frontend-to-backend live API integration through `NEXT_PUBLIC_API_URL`

### Verified
- Feature implementation commit present: `89072b7 feat(abh-2): implement Build a full-stack URL shortener called "Sniplet" with click analytics`
- Pedant review artifact available for testing handoff in `docs/PEDANT_REVIEW.md`

### Notes
- This changelog entry documents release-facing scope for ticket ABH-2 only
- Scribe phase intentionally avoided application source changes and limited updates to markdown handoff artifacts

## [ABH-1] - 2026-07-07

### Added
- TeamHub frontend demo experience with dashboard, sidebar navigation, task list view, kanban board, calendar view, task detail panel, team members view, notifications panel, and command palette shell
- Release-facing README update describing what was built, how to install dependencies with `npm install`, and how to run the app locally
- Delivery handoff notes in `docs/IMPLEMENTATION_NOTES.md`
- Planning artifact in `docs/PLAN.md`
- Planned data model artifact in `docs/SCHEMA.md`
- QA/build verification artifact in `docs/PEDANT_REVIEW.md`

### Verified
- `npm run build` passes according to pedant review artifact
- `npm run typecheck` passes according to pedant review artifact

### Notes
- The current branch delivers a buildable Next.js UI prototype using mock data
- The original ABH-1 request described a larger full-stack delivery including auth, REST APIs, PostgreSQL, Drizzle ORM, and deployable infrastructure
- Those backend and deployment requirements remain documented as target scope rather than implemented behavior in the current repository state
