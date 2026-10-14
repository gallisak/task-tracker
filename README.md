# Task Tracker

A small Trello-like tracker: workspaces with roles, projects, a kanban board, comments, status history and realtime updates.

Stack: NestJS, Prisma, PostgreSQL, React, TanStack Query, shadcn/ui, socket.io.

## Run

1. `cp .env.example .env`
2. In `.env`, set `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` to two different random values, for example from `openssl rand -base64 48`.
3. `docker compose up --build`

- App: http://localhost:8080
- Swagger: http://localhost:8080/api/docs
- Health check: http://localhost:8080/api/health

Compose runs the backend in production mode. It does not start without the secrets, with the `change-me` defaults, or with the same value for both. Ports can be changed in `.env`.

## Development and tests

Needs Node.js 24 and Docker. From the repository root:

```
cp .env.example .env
docker compose up -d postgres
```

Backend:

```
cd backend
npm install
npm run db:deploy
npm run start:dev
```

Frontend (http://localhost:5173):

```
cd frontend
npm install
npm run dev
```

Invitation links are built from `CORS_ORIGIN`; set it to `http://localhost:5173` in `.env` so they open the dev frontend.

Tests and Storybook:

```
npm --prefix backend test
npm --prefix backend run test:e2e
npm --prefix frontend test
npm --prefix frontend run storybook
```

E2E tests need the `postgres` container and use a separate database. GitHub Actions runs lint, build and all tests on every push.

## Architecture

- **Backend**: modules `auth`, `users`, `workspaces`, `projects`, `tasks`, `health`, each with a controller, service and repository. Responses are DTOs; validation and the error format are global.
- **Auth**: a 15-minute access token kept in memory and a 7-day refresh token in an HttpOnly cookie. Every refresh rotates the token; using an already rotated token revokes the whole session. A rate-limited refresh never signs the user out: on page load and on socket reconnect the client waits as long as the server asks and tries again.
- **Access**: non-members get 404, members without the right role get 403. Only owners manage members and invitations and delete projects.
- **Consistency**: a status change and its history row are saved in one transaction. Owner and assignee checks run inside a transaction that locks the workspace, so they cannot race with removing or demoting a member.
- **Tasks**: cursor pagination, filters by status, assignee and priority, with indexes.
- **Board**: a column per status, filters kept in the URL, optimistic drag and drop with the mouse or the keyboard (Space to pick up and drop, arrows to move), live updates through a socket.io room per project.
- **Invitations**: the owner invites by email, and the answer does not show whether the email has an account. The invitation stores a hash of a random token and expires in 7 days. The link is written to the backend log instead of an email; the invited person opens it, signs in with that email and presses Accept.
- **Security**: argon2, rate limits on login, registration and token refresh, Helmet, Content Security Policy.

## Realtime protocol

The socket.io server shares the API origin (path `/socket.io`). Swagger covers only the REST API.

- Connect with `auth: { token: <access token> }`; without a valid token the connection is refused with `Unauthorized`.
- `project:join` with `{ projectId }` subscribes to a project, for members only, and answers `{ ok, error? }`. `project:leave` unsubscribes.
- Events: `task.created` and `task.updated` with `{ task }`, `task.deleted` with `{ projectId, taskId }`.
- The server disconnects a socket when its access token expires; the client refreshes the session and connects again.
- A member removed from a workspace leaves the rooms of its projects at once.
- A failed message gets an `exception` event with `{ statusCode, message, details? }`, and its acknowledgement, if any, gets `{ ok: false, error }`.

## Why these tools

- **PostgreSQL**: the data is relational, and foreign keys, unique constraints, transactions and row locks do work that MongoDB would leave to application code.
- **Prisma**: typed queries, migrations, parameterised SQL.
- **socket.io**: rooms and reconnection out of the box.
- **TanStack Query**: caching, invalidation and optimistic updates.
- **react-hook-form, zod, shadcn/ui, dnd-kit**: typed forms, accessible components, drag and drop with keyboard support.

## Not done

- Invitations are not emailed and cannot be cancelled.
- No Redis and a single backend instance: socket rooms live in memory.
- Frontend tests cover only helper functions, there are no component tests.
- Projects and workspaces cannot be renamed, workspaces cannot be deleted, and only an owner can remove a member.
- Comments are not realtime.
- The Prisma CLI stays in the backend image for migrations and brings `npm audit` findings that do not affect the API.

## Simplified on purpose

- Logout revokes the refresh token; an access token already issued works until it expires.
- A page reload in the middle of a token refresh can end the session.
- Tabs share refreshes through `navigator.locks`, which browsers offer only on HTTPS or localhost. Elsewhere two tabs refreshing at once can end the session.
- Rate limits count requests per client IP, so users behind one shared address share a limit. A per-session limit would fix that for refresh.
- Only tasks are paginated; comments, members and status history come in full.
- Tasks are ordered by creation date, with no manual order inside a column.
- Task changes reach the socket gateway through a direct call; only member removal goes through an event.
- Removing a member unassigns their tasks inside the workspaces repository, in the same transaction.
- The client reloads the board on every realtime event instead of patching the cache from it.
- Project names are unique per workspace and case-sensitive.
