# Task Tracker

A small Trello-like tracker: workspaces with roles, projects, a kanban board, comments, status history and realtime updates.

Stack: NestJS, Prisma, PostgreSQL, React, TanStack Query, shadcn/ui, socket.io.

## Run

```
docker compose up --build
```

- App: http://localhost:8080
- Swagger: http://localhost:8080/api/docs
- Health check: http://localhost:8080/api/health

No setup is needed. To change ports or secrets, copy `.env.example` to `.env`.

## Development and tests

```
cp .env.example .env
docker compose up -d postgres
cd backend && npm install && npm run db:deploy && npm run start:dev
cd frontend && npm install && npm run dev
```

```
cd backend && npm test && npm run test:e2e
cd frontend && npm run storybook
```

E2E tests need the `postgres` container and use their own database. GitHub Actions runs lint, build and all tests on every push.

## Architecture

- **Backend**: modules `auth`, `users`, `workspaces`, `projects`, `tasks`, `health`, each split into controller, service and repository. Responses are DTOs, validation and error format are global.
- **Auth**: 15-minute access token kept in memory, 7-day refresh token in an HttpOnly cookie. Refresh rotates the token; reuse revokes the session.
- **Access**: non-members get 404, members without the role get 403. Only owners manage members and delete projects.
- **Consistency**: a status change and its history row are written in one transaction with a row lock.
- **Tasks**: cursor pagination, filters by status, assignee and priority, indexes for each.
- **Board**: one column per status, optimistic drag and drop, realtime reload through a socket.io room per project.
- **Security**: argon2, rate limiting on login and registration, Helmet, Content Security Policy.

## Why these tools

- **PostgreSQL**: the data is relational, and foreign keys, unique constraints, transactions and row locks do work that MongoDB would leave to application code.
- **Prisma**: typed queries, migrations, parameterised SQL.
- **socket.io**: rooms and reconnection out of the box.
- **TanStack Query**: caching, invalidation and optimistic updates.
- **react-hook-form, zod, shadcn/ui, dnd-kit**: typed forms, accessible components, drag and drop with keyboard support.

## Not done

- No Redis, no frontend tests, invitations are not emailed.
- Projects cannot be renamed, invitations cannot be cancelled.
- Comments are not realtime; a removed member keeps receiving events until reconnecting.
- Single backend instance: socket rooms are in memory.
- Default JWT secrets in `docker-compose.yml`, replace them for a real deployment.
- The Prisma CLI stays in the backend image for migrations and brings transitive `npm audit` findings that do not affect the API.
