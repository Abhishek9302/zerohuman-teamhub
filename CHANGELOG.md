# Changelog

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
