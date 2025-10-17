# Bitininkas Platform

This repository hosts both the Vite UI and the **Busmedaus API** (NestJS + TypeORM + PostgreSQL) that power the Bitininkas beekeeping platform.

## Quick Start

### Flow A – Docker for DB/API + Local Vite Dev Server
1. Copy environment templates:
   ```bash
   cp api/.env.example api/.env
   cp .env.local.sample .env.local
   ```
2. Adjust secrets and URLs in both files. For local development the defaults (`postgres` credentials, `VITE_API_BASE_URL=http://localhost:3000`) usually work.
3. Launch PostgreSQL + API:
   ```bash
   docker compose up --build
   ```
4. In a second terminal run the UI:
   ```bash
   npm install
   npm run dev
   ```
5. Visit `http://localhost:5173` and sign in with demo accounts (all use password `password`):
   - `admin@example.com`
   - `manager@example.com`
   - `jonas@example.com`

> **Note:** Protected routes (dashboard, hives, tasks, notifications, and admin screens) keep their URL after a browser refresh. The auth guard waits for the session bootstrap to finish before deciding whether to redirect, so pressing `F5` on `/hives` or `/admin/users` no longer bounces you back to the home page.

### Flow B – Optional Full Docker Compose
The provided `docker-compose.yml` defines `db` and `api`. If you add a front-end service (for example a Node image that runs `npm run dev` or serves the built `dist` folder), configure its `VITE_API_BASE_URL` to `http://api:3000`, mount the project sources, and expose port 5173. Until that container exists, rely on Flow A for the UI while Compose handles the backend.

> Looking for more context? See [`docs/INTEGRATION_SUMMARY.md`](docs/INTEGRATION_SUMMARY.md) for architecture details, endpoint mappings, and deployment guidance.

## Project Structure

- `src/`, `public/`, etc. – Vite front-end.
- `api/` – NestJS backend service.
- `docker-compose.yml` – Starts PostgreSQL and the API. Extend it if you need a containerized UI.

## Environment Configuration

- **Front-end**: Populate `.env.local` (or `.env`) with `VITE_API_BASE_URL`. A starter file lives at `.env.local.sample`.
- **API**: Copy `api/.env.example` to `api/.env` and adjust `POSTGRES_*`, `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, and `ALLOWED_ORIGINS`.

## Backend (api/)

### Requirements

- Node.js 20+
- npm 9+
- PostgreSQL 16+

### Local development (without Docker)

```bash
cd api
npm install
npm run build # compile once so migrations can run
npm run migration:run
npm run seed
npm run start:dev
```

The API runs on `http://localhost:3000`. Update the UI `.env` so `VITE_API_BASE_URL` points to this URL.

### Running with Docker

```bash
docker compose up --build
```

The `api` container runs migrations and seeds on start. PostgreSQL is exposed on `localhost:5432` if you need admin tooling.

### Transactional email providers

The API sends transactional mail through a pluggable adapter. Configure one of the supported providers in `api/.env`:

- **Postmark** – set `MAIL_PROVIDER=postmark`, `MAIL_FROM`, and `POSTMARK_SERVER_TOKEN`.
- **Resend** – set `MAIL_PROVIDER=resend`, `MAIL_FROM`, and `RESEND_API_KEY`.
- **SMTP** – set `MAIL_PROVIDER=smtp`, `MAIL_FROM`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, and optionally `SMTP_SECURE` (defaults to `false`).

If `MAIL_PROVIDER` or the required secrets are missing the mailer falls back to a no-op implementation and logs a warning instead of throwing errors.

During local development (non-production `NODE_ENV`) you can verify configuration with `POST /debug/test-email`, which is restricted to admin accounts.

### API security defaults

- **Rate limiting:** `RATE_LIMIT_WINDOW_MS` (default `60000`) and `RATE_LIMIT_MAX` (default `10`) control the sliding window limit for sensitive endpoints such as `/auth/*` and media uploads. Adjust them in `api/.env` if you need a different login/upload policy.
- **Upload guardrails:** only `image/jpeg`, `image/png`, `image/webp`, and `video/mp4` are accepted. Maximum sizes are controlled via `UPLOAD_MAX_IMAGE_MB` (default `5`) and `UPLOAD_MAX_VIDEO_MB` (default `100`). Larger or unsupported files return a 400 response with a Lithuanian error message.
- **HTTP hardening:** Helmet is enabled in `api/src/main.ts`; tweak its options there if you need a stricter Content-Security-Policy.

### Performance, observability, and reminders

- **Pagination defaults:** All list endpoints accept `page`/`limit` parameters and respond with `{ data, page, limit, total }`. Configure sane bounds via `DEFAULT_PAGE`, `DEFAULT_LIMIT`, and `MAX_LIMIT` in `api/.env`.
- **Database indexes:** Migration `1732000000000-AddPerformanceIndexes` creates indexes on `assignments`, `assignment_progress`, and `notifications` to speed up frequent lookups.
- **Weekly assignment reminders:** `AssignmentsScheduler` now triggers a weekly cron job (default `REMINDER_CRON="0 9 * * 1"`) that nudges group members about unfinished tasks and emails them through the configured mailer. Admins can trigger it manually in dev with `POST /assignments/debug/run-reminder`.
- **Request logging & counters:** `RequestLoggingMiddleware` logs method, path, status, and latency while keeping in-memory 4xx/5xx counters. Unhandled errors now include stack traces in server logs to aid debugging.

### Tests

```bash
cd api
npm test
npm run test:e2e
```

## Front-end (Vite UI)

```bash
npm install
npm run dev
```

Before starting the UI, ensure the API is reachable and `VITE_API_BASE_URL` is configured. For production builds run `npm run build` followed by your preferred static hosting solution or `npm run preview` for local verification.

## Updated API Endpoints

| Method & Path | Purpose |
| ------------- | ------- |
| `POST /hives` | Accepts optional `ownerUserId` and `members[]` when creating new hives so ownership and collaborators persist. |
| `PATCH /hives/:id` | Updates hive label, location, queen year, and assigned members from the edit screen. |
| `POST /tasks` | Creates tasks together with ordered step definitions supplied from the UI dialog. |
| `POST /progress/step-complete` | Marks a step as finished and stores any note entered at completion time. |
| `PATCH /progress/:id` | Debounced updates for per-step notes while running a task. |
| `DELETE /progress/:id` | Supports the “uncomplete” action by removing step progress without reloading the page. |
| `POST /auth/request-reset` | Persists a one-hour password reset token and returns it in non-production responses for easier QA. |

## Additional Documentation

- [`docs/INTEGRATION_SUMMARY.md`](docs/INTEGRATION_SUMMARY.md) – Deep dive into architecture, environment variables, API endpoints, tokens, seeding, and deployment paths.
- [`docs/QA_TEST_SCRIPT.md`](docs/QA_TEST_SCRIPT.md) – Copy/paste-able curl/PowerShell snippets for regression testing auth, hives, tasks, notifications, and reports.
