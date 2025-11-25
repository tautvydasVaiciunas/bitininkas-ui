# Codex 5.1 – Bus medaus / bitininkas-ui

## 1. AGENTS.md  

```md
# AGENTS

## write access 
 - You have enabled write access and confirmation that you can run the necessary patch/apply commands.

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

## Domain logic – Užduotys, žingsniai, šablonai, naujienos

- ŽINGSNIAI (Steps)
  - Mažiausias darbo vienetas (pvz., „Užkurti dūminę“, „Apžiūrėti perų rėmus“).
  - CRUD per /admin/steps.
  - Žingsnis gali būti naudojamas keliuose šablonuose.

- ŠABLONAI (Task templates)
  - Tai žingsnių seka, aprašanti pilną procesą (pvz., „Pavasarinė apžiūra (10 žingsnių)“).
  - Kuriami/redaguojami per /admin/templates (Šablonai).
  - Šablonai nesiunčiami vartotojams tiesiogiai – jie naudojami kuriant užduotis.

- UŽDUOTYS (Tasks)
  - Užduotis = „konkretus iškvietimas“ šablonui: turi
    - pavadinimą,
    - aprašymą (nebūtina),
    - žingsnių seką (kuri paimama iš šablono užduoties sukūrimo metu),
    - pradžios ir pabaigos datas,
    - būseną (aktyvi, baigta ir pan.).
  - Užduotys AUTOMATIŠKAI kuriamos, kai admin/manager per /admin/news prideda užduotį prie naujienos.
  - Admin/tasks puslapis:
    - rodo visų užduočių sąrašą,
    - leidžia redaguoti ar archyvuoti užduotis,
    - NENAUDOJAMAS naujų užduočių kūrimui (create mygtukas paslėptas).

- NAUJIENOS (News) + užduotys
  - Kiekviena naujiena gali:
    - būti vien tekstinė (be užduoties),
    - arba turėti PRIDĖTĄ UŽDUOTĮ.
  - Jei „Pridėti užduotį šiai naujienai“ yra pažymėta:
    - admin pasirenka:
      - užduoties ŠABLONĄ,
      - užduoties pavadinimą,
      - (nebūtinai) užduoties aprašymą,
      - pradžios ir pabaigos datas,
      - ar siųsti pranešimus ir el. laiškus.
    - sistema:
      - sukuria Task įrašą pagal pasirinktą šabloną ir nurodytus laukus,
      - visiems naujienos priskirtų grupių aviliams sukuria Assignment įrašus (po vieną kiekvienam aviliui),
      - kiekvieno Assignment progresas sekamas atskirai.
  - Vėliau redaguojant Task per /admin/tasks:
    - keičiasi šios užduoties tekstinė dalis (pavadinimas, aprašymas, žingsniai, datos) visiems jai priklausančioms Assignments,
    - bet neliečiama būsenų reikšmės, jei ji jau buvo vykdyta.


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