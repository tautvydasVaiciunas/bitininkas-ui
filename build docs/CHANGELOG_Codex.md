# Changelog (Codex AI updates)

# Changelog (Codex AI updates)

## 2025-02-17
- Pašalinta vieša registracija iš prisijungimo ekrano ir pridėtos naujos pamiršto slaptažodžio bei atstatymo formos (tik UI; backend bus papildytas vėliau).
- API klientas gavo naujus `/auth/forgot-password` ir `/auth/reset-password` kvietimus, o maršrutizatorius papildytas `/auth/reset`.
- Login/Forgot puslapiai atnaujinti su lietuviškais pranešimais ir nuorodomis į naują atstatymo srautą.

## 2025-02-16
- Implemented password reset tokens end-to-end: API now stores one-hour tokens, surfaces dev responses, and the Vite UI consumes the endpoint with proper error handling.
- Normalized email handling across registration and user management to avoid duplicate entries with mixed casing.
- Added QA test script and documentation updates covering the password reset flow and validation steps.

## 2025-02-15
- Introduced role-aware guarding across hives and assignments so basic users only see/manage their own resources while managers retain full CRUD.
- Added groups management (new `/groups` REST resource with membership endpoints) and surfaced the Admin → Groups UI for creating/editing teams.
- Delivered the manager dashboard at `/reports`, backed by `GET /reports/assignments`, to visualize group progress with overdue and completion metrics.
- Fixed profile editing by routing the UI through `PATCH /profile` and refreshing cached session details after a successful update.

## 2025-02-14
- Documented end-to-end integration details in `docs/INTEGRATION_SUMMARY.md` so engineers have a single reference for architecture, configuration, and API touchpoints.
- Expanded `README.md` with a Quick Start guide covering Docker-backed and local workflows to streamline developer onboarding and highlight environment requirements.
- Captured these documentation-focused adjustments in this changelog to provide traceability for Codex-authored updates.
