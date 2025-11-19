# Architecture Overview

## Monorepo layout
- **Front-end SPA** lives at the repository root under `src/`, built with Vite + React + TypeScript, serving the user-facing dashboard, hive routes, tasks, admin screens, and shared components/styles (Tailwind + shadcn UI + Radix).
- **Backend API** is isolated in `api/`, a NestJS service with per-domain modules (`auth`, `users`, `hives`, `tasks`, `news`, `assignments`, `notifications`, etc.), TypeORM entities/migrations, seeding, and middleware glue (rate limit, Helmet, schedulers).
- **Auxiliary assets** include `public/` static assets, `docs/` for integration/QA knowledge, `scripts/` for lockfile verification, environment templates (`.env.local.sample`, `api/.env.example`), and Docker tooling (`docker-compose.yml`, `api/Dockerfile`, `api/entrypoint.sh`).

## Front-end runtime
- Entry point `src/main.tsx` renders `App.tsx`, wires React Router v6, global contexts/hooks (auth/session), and Tailwind styling from `App.css`/`index.css`.
- Data layer centers on `src/lib/api.ts`, a typed HTTP client that normalizes `import.meta.env.VITE_API_BASE_URL`, persists JWT tokens in `localStorage`, and exposes domain-specific services (`auth`, `hives`, `tasks`, `support`, `store`, `admin`).
- UI is composed using shadcn UI primitives, Radix components, Sonner toasts, TanStack Query v5 for caching, React Hook Form with Zod validation, and `react-resizable-panels`/`recharts` for dashboards.

## Backend runtime
- Bootstrap in `api/src/main.ts` loads the Nest Config module, applies Helmet and rate limiting, wires scheduled jobs (assignments reminders), and mounts feature modules via `app.module.ts`.
- `api/src/typeorm.config.ts` configures PostgreSQL connections by reading `DATABASE_URL` or individual `POSTGRES_*` env vars, while migrations/seeds under `api/src/migrations` + `api/src/seeds` manage schema evolution and sample data.
- Each Nest module exposes controllers/services/DTOs, keeping validation strict via `class-validator`, ensuring the API responses match the front-end `api.ts` client typings.

## Integration surface
- Environment configuration happens via `.env.local` (root SPA) and `api/.env` (backend) with secrets/URLs described in `README.md` and `docs/INTEGRATION_SUMMARY.md`.
- `docker-compose.yml` orchestrates PostgreSQL + Nest API; front-end assumes `VITE_API_BASE_URL` is set to `http://localhost:3000` (or `http://api:3000` inside Compose) while `scripts/` ensure dependency lock consistency.
- Production deploys target Koyeb (API) and Cloudflare Pages (SPA), so builds stay separated: front-end `npm run build`, backend via `api/npm run build` before migrations/seeding.
