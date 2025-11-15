# Codex 5.1 – Bus medaus / bitininkas-ui

## 1. AGENTS.md šablonas (įsikelk į repo šaknį)

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

## 2. PR review komentaras GitHub’e

Komentare ant PR rašyk maždaug taip:

```text
@codex review

Kontekstas:
- Projektas: Bus medaus SaaS (NestJS API + React/Vite SPA).
- Pagrindas: LT kalba, VAT 21 %, kainos saugomos centais API, SPA rodo kainas su PVM.

Prašymai šiai apžvalgai:
- Patikrink, ar nauji API endpoint’ai yra saugūs (autentifikacija, validacija, klaidų tvarkymas).
- Patikrink, ar SPA dalis nenaudoja deprecated API ir nepažeidžia esamos routing/auth struktūros.
- Pažiūrėk, ar nėra akivaizdžių bugų, edge case’ų, performance problemų.

Laikykis `AGENTS.md` taisyklių (ypač neliesti Node/Vite versijų ir deploy config).
```

## 3. Codex CLI „pakeisk kodą“ šablonas

Šitą tekstą naudok kaip bazinį promptą CLI užduotims (prireikus pridėk failų pavyzdžius):

```text
Tu dirbi su projektu „Bus medaus“ (bitininkas-ui repo).

Stack:
- Backend: NestJS + TypeORM + PostgreSQL (api/ katalogas).
- Frontend: React + Vite + TypeScript (spa/ katalogas), shadcn UI + Tailwind.

Globalios taisyklės:
- Nekeisk Node/Vite versijų, package.json `engines`, Cloudflare/Koyeb build nustatymų.
- Nekeisk auth/roles/permissions logikos.
- Keisdamas DB schemą, būtinai kurk TypeORM migraciją.
- Laikyk visą tekstą LT kalba.
- Jokio eval/dynamic Function; jokio jautrių duomenų loguose.

Užduotis:
- [TRUMPAI APIŠYK KONKREČIĄ UŽDUOTĮ, pvz.: „sutvarkyk, kad /store/my-orders grąžintų prisijungusio vartotojo užsakymus ir SPA puslapis juos rodytų“]

Pateik:
- Kokius failus keitei ir kodėl.
- Trumpą paaiškinimą, kaip tai išsprendžia problemą.
- Patvirtink, kad `npm run typecheck` ir `npm run build` atitinkamuose paketuose praeina (gali tik įrašyti komandą, mes ją paleisim CI).
```

