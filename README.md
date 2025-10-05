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

## Additional Documentation

- [`docs/INTEGRATION_SUMMARY.md`](docs/INTEGRATION_SUMMARY.md) – Deep dive into architecture, environment variables, API endpoints, tokens, seeding, and deployment paths.
