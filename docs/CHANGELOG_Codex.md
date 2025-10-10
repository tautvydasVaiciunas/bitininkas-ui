# Codex Backend Updates

## TypeORM column typing and nullability cleanup
- Standardized text column metadata across user, group, hive, task, progress, notification, and activity log entities to prevent `design:type` "Object" mismatches in PostgreSQL.
- Introduced strict varchar lengths and null defaults aligned with the existing schema and recorded them in a follow-up migration.
- Normalized DTO validation and service-layer sanitization so optional fields consistently persist as `null` instead of `undefined` or empty strings.

## Password reset token integration
- Password reset token fully wired (entities/modules/ormdatasource/migrations/seed). Clean Docker bring-up confirmed.

## Docker build hardening
- Docker image now builds from the API folder with multi-stage steps, ignores host node_modules, and relies on the official lru-cache package to avoid COPY conflicts during compose builds.

## Docker build determinism and compose boot flow
- Ensured `api/package-lock.json` remains committed and included in Docker builds for deterministic `npm ci` installs.
- Switched the compose build context to `./api` so the Dockerfile copies manifests (`package.json` + `package-lock.json`) without globbing and fails fast when the lockfile is missing.
- Hardened `.dockerignore` files (root and API) to keep `package-lock.json` in the context while filtering out `node_modules`, build artifacts, and common clutter.
- Reconfirmed the compose boot sequence (migrations → seed → Nest API) triggered by the API service command.
