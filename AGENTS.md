# Codex 5.1 – Bus medaus / bitininkas-ui

## 1. AGENTS.md šablonas 

```md
# AGENTS

## Project
- SaaS platforma „Bus medaus“ bitininkams.
- Monorepo: NestJS API (TypeORM, PostgreSQL) + React/Vite SPA (shadcn, Tailwind, React Query).
- Produkcinis deploy: Koyeb (API) + Cloudflare Pages (SPA).

## Global rules
- NELIESK:
  - Node / npm / pnpm versijų, `engines` laukų, Cloudflare build config.
  - Autentifikacijos, autorizacijos ir RLS taisyklių.
  - DB schemos be atskiros TypeORM migracijos.
- PRIVALOMA:
  - Laikyti visus tekstus LT kalba.
  - API validaciją palikti/grąžinti griežtą (class-validator, DTO).
  - Pakeitimus daryti mažuose, aiškiuose žingsniuose.
  - Saugoti UTF‑8 (jokių cp1257, mojibake).
- SAUGUMAS:
  - Jokio eval, dynamic `Function`, nenaudoti slaptažodžių loguose.
  - Nerašyti slapukų ar tokenų į localStorage (išskyrus jau esamą auth logiką).

## Backend (api/)
- NestJS moduliai: neliesti modulio ribų be rimtos priežasties.
- Keisdami entites, BŪTINAI kurkite TypeORM migracijas.
- Eshop logika: VAT 21 %, kainos saugomos centais, viskas perskaičiuojama serveryje.

## Frontend (spa/)
- React + Vite + TypeScript.
- Naudoti esamą dizaino sistemą (shadcn UI, Tailwind).
- Neperrašyti routing / ProtectedRoute struktūros be aiškaus tikslo.

## Review guidelines
- Tikrink:
  - API / SPA kontraktų suderinamumą (DTO ↔ api.ts tipai).
  - Edge case’us (null/undefined, praleisti laukai, tušti sąrašai).
  - PVM skaičiavimą ir pinigų formatavimą.
- Nekeisk Node/Vite versijų, CI/CD skriptų ir deploy nustatymų.
```

„You can apply changes without asking me to confirm them as long as:
– Typecheck and build pass
– You are not touching deployment secrets / env / CI.
Otherwise, ask.“