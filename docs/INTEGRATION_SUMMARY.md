# Integration Summary

## Architecture Overview
- **UI**: Vite + React front-end stored under `src/`, using React Query for data fetching and localStorage-backed session state. Requests are centralized in [`src/lib/api.ts`](../src/lib/api.ts), which wraps the Fetch API and handles authentication concerns.
- **API**: NestJS service under [`api/`](../api) with modular features (`auth`, `users`, `hives`, `tasks`, `assignments`, etc.), TypeORM for persistence, and JWT-based authentication configured in [`api/src`](../api/src). Docker builds the API through the `api` service definition.
- **Database**: PostgreSQL 16, provisioned either locally or via the `db` service in [`docker-compose.yml`](../docker-compose.yml). TypeORM migrations live in `api/src/migrations` and run automatically inside the Docker workflow.
- **Containerization**: `docker-compose.yml` wires the `db` and `api` services. The API container runs migrations then seeds demo data before launching in production mode. The UI runs locally via Vite during development.

## Key Application Files
- [`src/lib/api.ts`](../src/lib/api.ts): Fetch client, endpoint catalog, token persistence, and automatic refresh handling.
- [`src/contexts/AuthContext.tsx`](../src/contexts/AuthContext.tsx): React context for session bootstrap, login, logout, registration, and profile caching.
- [`api/src/seeds/seed.ts`](../api/src/seeds/seed.ts): Populates PostgreSQL with admin/manager/user accounts, sample hives, tasks, assignments, and notifications.
- [`docker-compose.yml`](../docker-compose.yml): Compose stack for PostgreSQL + API with health checks and automated migrations/seed execution.
- [`README.md`](../README.md): Entry point for developer onboarding, including Quick Start and environment variable references.

## Environment Variables
### Front-end (`.env`, `.env.local`, or `.env.development.local`)
- `VITE_API_BASE_URL`: Base URL for the API client. Required for both `npm run dev` and production builds. See [`src/lib/api.ts`](../src/lib/api.ts).

### API (`api/.env`)
- `DATABASE_URL` **or** `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`: Database connection (compose consumes the latter trio).
- `JWT_SECRET` / `JWT_REFRESH_SECRET`: Secrets for signing access and refresh tokens.
- `ALLOWED_ORIGINS`: Comma-separated whitelist for browser origins (`http://localhost:5173` for Vite dev, plus any additional hosts you need).
- `PORT`: HTTP port (defaults to 3000; compose publishes it).
- `THROTTLE_TTL`, `THROTTLE_LIMIT`: Rate limiting settings.
- `NODE_ENV`: Set to `production` inside Docker.

> **Note:** Keep secrets (JWTs, database credentials) out of version control. Copy from `api/.env.example` and override locally or via secret managers.

## Credential Storage & Session Lifecycle
- Access and refresh tokens are stored in `localStorage` under `bitininkas_access_token` and `bitininkas_refresh_token`, while the normalized user profile lives under `bitininkas_user`. [`src/lib/api.ts`](../src/lib/api.ts) exposes `setToken`, `clearCredentials`, and `persistUser` helpers used by [`AuthContext`](../src/contexts/AuthContext.tsx) to sync storage.
- On browser reload, `AuthContext` now enters a `bootstrapping` phase: it restores cached credentials, invokes `api.auth.me()` to confirm the session, and only then lets auth guards decide whether to render protected layouts or redirect. During this boot sequence [`MainLayout`](../src/components/Layout/MainLayout.tsx) shows a loading screen instead of redirecting, which keeps `/hives`, `/tasks`, `/notifications`, and `/admin/*` stable after `F5` refreshes.
- If the profile fetch fails, storage is cleared and users are redirected to `/auth/login` after the bootstrap finishes.

## 401 Handling & Token Refresh
1. Every request automatically appends the `Authorization: Bearer <accessToken>` header when available.
2. When a request returns `401 Unauthorized`, `api.ts` issues a single-flight refresh via `POST /auth/refresh` using the stored refresh token.
3. A successful refresh updates both tokens and retries the original request. If refresh fails, credentials are cleared and the browser is redirected to `/auth/login`.

## UI ↔ API Endpoint Map
The UI routes/components call the following API endpoints (all defined in [`src/lib/api.ts`](../src/lib/api.ts)):
- **Authentication**: `POST /auth/login`, `POST /auth/register`, `POST /auth/refresh`, `GET /auth/me`, `POST /auth/request-reset`.
- **Dashboard Overview**: `GET /hives`, `GET /assignments`, `GET /assignments/:id/details`, `GET /tasks`.
- **Hives**: `GET /hives/:id`, `GET /hives/:id/summary`, `POST /hives` (accepts optional `ownerUserId` plus `members[]` assignments), `PATCH /hives/:id` (update label, location, queen year, and membership), `GET /assignments?hiveId=:id`, `POST /assignments`, `PATCH /assignments/:id`.
- **Task Library**: `GET /tasks`, `GET /tasks/:id`, `GET /tasks/:id/steps`, `POST /tasks`, `PATCH /tasks/:id`, `POST /tasks/:id/steps`, `PATCH /tasks/:id/steps/:stepId`, `POST /tasks/:id/steps/reorder`, `DELETE /tasks/:taskId/steps/:stepId`.
- **Assignments & Progress**: `POST /assignments`, `PATCH /assignments/:id`, `GET /assignments/:id/details`, `POST /progress/step-complete`, `PATCH /progress/:id`, `GET /assignments/:id/progress/list`, `GET /assignments/:id/progress`, `DELETE /progress/:id`.
- **Profile**: `PATCH /profile` (updates name, email, phone, address for the signed-in user).
- **Groups**: `GET /groups`, `POST /groups`, `PATCH /groups/:id`, `DELETE /groups/:id`, `GET /groups/:id/members`, `POST /groups/:id/members`, `DELETE /groups/:id/members/:userId`.
- **Reports**: `GET /reports/assignments?groupId=...&taskId=...`.
- **Notifications**: `GET /notifications`, `PATCH /notifications/:id/read`.
- **Admin Users**: `GET /users`, `PATCH /users/:id`, `DELETE /users/:id`.

## Seeded Demo Data
Running `npm run seed` (locally) or `docker compose up` (inside the container) inserts:
- Accounts: `admin@example.com` (role `admin`), `manager@example.com` (role `manager`), and `jonas@example.com` (role `user`), all with password `password`.
- Sample hives (“Hive Alpha”, “Hive Beta”), tasks with steps, assignments linked to those hives/tasks, notifications, and progress entries. See [`api/src/seeds/seed.ts`](../api/src/seeds/seed.ts) for full data.

## Domain Behavior Notes
- **Hive membership**: The create/edit Hive forms now surface a multi-select for assigning members. Requests send `ownerUserId` (optional) and `members: string[]` to the backend so hive ownership and collaborators persist across reloads.
- **Task runs**: Completing a step continues to POST via `/progress/step-complete`, while per-step note edits debounce a `PATCH /progress/:id` update. Users can revert a finished step with the new “uncomplete” action, which deletes the progress record and re-opens the step without page refreshes.

## Roles & Permissions
- **User**
  - Sees only hives they own or are assigned to. Hive creation/removal UI is hidden and the API rejects these actions for basic users.
  - Assignment listings are filtered to hives where the user is owner or member.
- **Manager**
  - Full CRUD across hives, tasks, assignments, groups, templates, and users (same scope as admins for this iteration).
  - Has access to the Reports dashboard for group progress monitoring.
- **Admin**
  - Unrestricted access.
- Profile updates now go through `PATCH /profile` and automatically refresh the session cache in `AuthContext`.

## Reports
- `/reports` lets managers and administrators inspect a group + task combination using `GET /reports/assignments`.
- Each row returns assignment status, overdue flag, due date, and completed/total step counts so the UI can render badges and progress bars.
- Group options come from the new `/groups` resource; membership management lives under Admin → Groups.

## Startup Paths
### Flow A – Docker (DB + API) & Local Vite Dev Server
1. Copy environment files:
   ```bash
   cp api/.env.example api/.env
   cp .env.local.sample .env.local
   ```
2. Start backend stack:
   ```bash
   docker compose up --build
   ```
3. Run the UI locally:
   ```bash
   npm install
   npm run dev
   ```
4. Visit `http://localhost:5173` and log in with demo credentials.

### Flow B – Full Docker Compose (optional)
- The repository ships with `db` and `api` services only. If you add a front-end service (for example, a Node-based container running `npm run dev`), point its `VITE_API_BASE_URL` to `http://api:3000` and expose port 5173. Until then, continue using Flow A for the UI.

### Local Backend Without Docker
1. Install dependencies and build migrations:
   ```bash
   cd api
   npm install
   npm run build
   npm run migration:run
   npm run seed
   npm run start:dev
   ```
2. Ensure PostgreSQL is reachable at the values from `api/.env`.
3. Run the front-end with the same `npm install && npm run dev` commands as above.

## Production Build & Deployment Notes
- **API**: `npm run build` followed by `npm run start:prod`. Run migrations with `npm run migration:run` and optionally seeds via `npm run seed:prod` (dist assets must exist).
- **UI**: `npm run build` produces the static bundle in `dist/`. Serve it via any static host (e.g., Nginx) or `npm run preview` for local verification. Configure the hosting environment with the correct `VITE_API_BASE_URL` at build time.
- **Docker**: `docker compose up --build -d` creates production-like containers. Persist database data using the `db-data` volume.

## Known Limitations & Considerations
- No out-of-the-box Docker service for the UI; developers must run the Vite dev server locally or add their own container.
- Token refresh relies on stored refresh tokens; if refresh requests fail (network errors or token revocation), users are redirected to the login view with no offline support.
- Seed script is compiled into a single line, which can make diffs hard to read—consider formatting if you plan to maintain it manually.
- CORS origins must be maintained in `ALLOWED_ORIGINS`; mismatches will surface as browser network errors.
