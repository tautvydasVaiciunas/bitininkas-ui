# Bitininkas Platform

API + SPA monorepo for the Bus medaus beekeeping SaaS (NestJS + TypeORM backend, React/Vite + shadcn/Tailwind frontend).

## Quick start
1. Copy templates and tune secrets:
   ```bash
   cp api/.env.example api/.env
   cp .env.local.sample .env.local
   ```
   The UI needs `VITE_API_BASE_URL`, the API relies on standard `POSTGRES_*`, `JWT_*`, and `ALLOWED_ORIGINS` entries.
2. Start the backend stack:
   ```bash
   docker compose up --build
   ```
   The container runs migrations/seeds and exposes the API on `http://localhost:3000` and Postgres on `localhost:5432`.
3. In another terminal run the UI:
   ```bash
   npm install
   npm run dev
   ```
4. Sign in at `http://localhost:5173` using one of the seeded accounts (passwords are `password`).

## Repo layout
- `src/` and related directories: Vite + React SPA (auth, hives, tasks, news, store, support, reports, admin panels).
- `api/`: NestJS service with modules for auth, users, hives, tasks, assignments, news, store, email, notifications, media, and support.
- `docs/`, `AGENTS.md`, and related Markdown files hold architecture notes, domain rules, and guidelines.

## Backend (api)
- Requirements: Node.js 20+, npm 9+, PostgreSQL 16+ (Docker compose already includes Postgres).
- Run locally when Docker is unnecessary:
  ```bash
  cd api
  npm install
  npm run build
  npm run migration:run
  npm run seed
  npm run start:dev
  ```
- The API enforces JWT auth, rate limiting, validation pipes, and helmet; uploads are guarded by MIME/size checks.

## Front-end (SPA)
- Install and start the dev server in the repo root:
  ```bash
  npm install
  npm run dev
  ```
- Auth context bootstraps via tokens stored in `localStorage`; `ProtectedRoute` guards `/news`, `/hives`, `/tasks`, `/support`, `/parduotuve`, `/reports`, and `/admin` pages.
- Use `npm run build` followed by any static hosting solution (Cloudflare Pages in production) when you need a preview.

## Further reading
- `docs/INTEGRATION_SUMMARY.md`: architecture, deployment, and API insights.
- `DATA_MODEL.md`: table summaries, enums, and cascade rules.
- `FRONTEND_STRUCTURE.md`, `KNOWN_FLOWS.md`, `API_ENDPOINTS.md`, and `EMAIL_AND_NOTIFICATIONS.md`: keep domain flows, endpoints, and notification triggers in sync with the code.
