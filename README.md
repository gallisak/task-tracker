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

The backend refuses to start in production with the `change-me` JWT secrets or with the same secret for access and refresh tokens. When Docker Compose gets no secrets of its own, the container generates random ones at start, so sessions end when it restarts; set `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` in `.env` to keep them.

## Development and tests

Local development needs Node.js 24 and Docker. All commands start from the repository root. Prepare the database once:

```
cp .env.example .env
docker compose up -d postgres
```

Backend, in one terminal:

```
cd backend
npm install
npm run db:deploy
npm run start:dev
```

Frontend, in a second terminal (http://localhost:5173):

```
cd frontend
npm install
npm run dev
```

Tests and Storybook:

```
npm --prefix backend test
npm --prefix backend run test:e2e
npm --prefix frontend test
npm --prefix frontend run storybook
```

E2E tests need the `postgres` container and use their own database. GitHub Actions runs lint, build and all tests on every push.

## Architecture

- **Backend**: modules `auth`, `users`, `workspaces`, `projects`, `tasks`, `health`, each split into controller, service and repository. Responses are DTOs, validation and error format are global.
- **Auth**: 15-minute access token kept in memory, 7-day refresh token in an HttpOnly cookie. Refresh rotates the token; reuse revokes the session. A token rotated less than 10 seconds ago is answered with the token that replaced it, never with a second one, so a page reload that interrupts a refresh does not log the user out and a stolen token cannot start a session of its own.
- **Access**: non-members get 404, members without the role get 403. Only owners manage members and delete projects.
- **Consistency**: a status change and its history row are written in one transaction with a row lock.
- **Tasks**: cursor pagination, filters by status, assignee and priority, indexes for each.
- **Board**: one column per status, filters by status, assignee and priority kept in the URL, optimistic drag and drop with the mouse or the keyboard (Space to pick up and drop, arrows to change the column), realtime reload through a socket.io room per project.
- **Invitations**: an owner invites by email and the answer is the same whether or not the email has an account. The invitation holds a hash of a random token and expires after 7 days. The link with the token is written to the backend log instead of being emailed. The invited person signs in and accepts it with `POST /api/invitations/accept`; the token works only for the account with the invited email.
- **Security**: argon2, rate limiting on login, registration and token refresh, Helmet, Content Security Policy.

## Realtime protocol

Swagger covers the REST API only. The socket.io server shares the origin of the API (path `/socket.io`).

- Connect with `auth: { token: <access token> }`; a missing or invalid token is rejected with `Unauthorized`.
- `project:join` with `{ projectId }` subscribes to a project and is acknowledged with `{ ok, error? }`. Only workspace members can join. `project:leave` unsubscribes.
- The server sends `task.created` and `task.updated` with `{ task }`, and `task.deleted` with `{ projectId, taskId }`.
- The server disconnects a socket when its access token expires; the client refreshes the session and connects again.
- A member removed from a workspace leaves the rooms of its projects at once.
- A message that fails unexpectedly is answered with an `exception` event carrying `{ statusCode, message, details? }`, and its acknowledgement, if the client asked for one, receives `{ ok: false, error }`.

## Why these tools

- **PostgreSQL**: the data is relational, and foreign keys, unique constraints, transactions and row locks do work that MongoDB would leave to application code.
- **Prisma**: typed queries, migrations, parameterised SQL.
- **socket.io**: rooms and reconnection out of the box.
- **TanStack Query**: caching, invalidation and optimistic updates.
- **react-hook-form, zod, shadcn/ui, dnd-kit**: typed forms, accessible components, drag and drop with keyboard support.

## Not done

- No Redis, invitations are not emailed: the link is only logged.
- Frontend tests cover only pure helpers, there are no component tests.
- Projects cannot be renamed, invitations cannot be cancelled.
- Workspaces cannot be renamed or deleted, and a member cannot leave on their own: only an owner removes members.
- Comments are not realtime.
- Single backend instance: socket rooms are in memory.
- The Prisma CLI stays in the backend image for migrations and brings transitive `npm audit` findings that do not affect the API.

## Simplified on purpose, would change with more time

- Invitation links are logged, not sent. I would deliver them by email through a queue.
- Logout revokes the refresh token; an issued access token stays valid until it expires (15 minutes).
- Only tasks are paginated. Comments, members and status history are returned in full.
- Tasks are ordered by creation date; there is no manual order inside a column.
- The tasks service calls the socket gateway directly. I would publish domain events instead.
- Removing a member unassigns their tasks inside the workspaces repository, so both changes share one transaction. With domain events the tasks module would own that update.
- The client reloads the board on every realtime event and ignores the task sent with it. I would patch the cache from the event instead.
- Project names are unique per workspace with exact case, so `Website` and `website` can coexist.
