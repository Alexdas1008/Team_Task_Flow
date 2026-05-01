# Team Task Manager

Full-stack web app for small teams to manage projects, assign tasks, and track progress.

## Stack

- **Monorepo:** pnpm workspaces
- **Frontend artifact:** `artifacts/task-manager` — React + Vite + Tailwind, shadcn UI, wouter routing, TanStack Query
- **Backend artifact:** `artifacts/api-server` — Express 5 + Drizzle ORM + Postgres, structured JSON logging via pino
- **Auth:** Clerk (custom-branded sign-in/up, no `<UserButton/>`, custom user menu)
- **DB:** Postgres via `lib/db` (Drizzle schemas)
- **API contract:** OpenAPI 3.1 in `lib/api-spec/openapi.yaml`; React Query hooks generated to `lib/api-client-react`; Zod schemas to `lib/api-zod`

## Domain model

- `users` — mirrors Clerk users, upserted on first authenticated request
- `projects` — name, description, color, owner
- `project_members` — join table with `role: admin | member` (creator becomes admin)
- `tasks` — title, description, `status: todo | in_progress | done`, `priority: low | medium | high`, optional assignee + due date
- `activity` — audit feed for project/task/member events

## Pages (all under base `/`)

- `/` — public landing for signed-out, redirects to `/dashboard` for signed-in
- `/sign-in/*?` — branded Clerk SignIn
- `/sign-up/*?` — branded Clerk SignUp
- `/dashboard` — KPI cards, status breakdown chart, upcoming/overdue, recent activity
- `/projects` — grid of project cards with progress, member count, status counts
- `/projects/:projectId` — Board (kanban), List, Members tabs; admin-only controls gated by `myRole`
- `/my-tasks` — assigned tasks across projects, grouped and overdue-highlighted

## Role rules

- Any signed-in user can create a project and is auto-added as `admin`
- Admins: create/edit/delete tasks, edit/delete project, add/remove/promote members
- Members: only update `status` of tasks assigned to them
- Project owner cannot be removed

## Conventions

- Always `pnpm --filter @workspace/api-spec run codegen` after editing `openapi.yaml`
- Run full check with `pnpm run typecheck`
- DB schema lives in `lib/db/src/schema/`; push with `pnpm --filter @workspace/db run push`
- Server logging: `req.log.*` inside handlers, `logger.*` at module level. Never `console.log` server-side
- Frontend: hooks/zod imported from `@workspace/api-client-react` and `@workspace/api-zod`; conditional queries always pass `queryKey` from the matching `getXQueryKey()` helper

## Environment variables / secrets

- Set as secrets: `CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `DATABASE_URL` (+ `PG*`), `SESSION_SECRET`
- Set as env: `VITE_CLERK_PUBLISHABLE_KEY` (mirrors the publishable key for the Vite build)
