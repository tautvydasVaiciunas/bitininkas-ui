# Bitininkas Platform

This repository now hosts both the existing Vite UI and the new **Busmedaus API** built with NestJS, TypeORM, and PostgreSQL.

## Project Structure

- `src/`, `public/`, etc. – existing Vite front-end.
- `api/` – NestJS backend service.
- `docker-compose.yml` – starts PostgreSQL and the API.

## Backend (api/)

### Requirements

- Node.js 20+
- npm 9+
- PostgreSQL 16+

### Environment variables

Copy `.env.example` to `.env` and adjust:

```bash
cp api/.env.example api/.env
```

Key variables:

- `DATABASE_URL` or the combination of `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`
- `JWT_SECRET`, `JWT_REFRESH_SECRET`
- `ALLOWED_ORIGINS` – comma-separated list of allowed origins for CORS
- `PORT` – defaults to 3000

### Local development (without Docker)

```bash
cd api
npm install
npm run build # first build for migrations
npm run migration:run:dev
npm run seed
npm run start:dev
```

The API is exposed on `http://localhost:3000`. UI applications should reference it via the `VITE_API_BASE_URL` environment variable (for example `http://localhost:3000`).

### Running with Docker

```bash
cp api/.env.example .env
# edit the .env file as necessary
docker-compose up --build
```

The `api` container automatically runs database migrations before starting.

### Tests

```bash
cd api
npm test
npm run test:e2e
```

## Front-end (Vite UI)

Refer to the original instructions for running the Vite project:

```bash
npm install
```

Before starting the UI make sure the API is running (for example via `docker-compose up --build`).
Set the API URL for the UI by creating a `.env` file in the project root:

```
VITE_API_BASE_URL=http://localhost:3000
```

Then launch the development server:

```bash
npm run dev
```

The development server runs on `http://localhost:5173` by default.
