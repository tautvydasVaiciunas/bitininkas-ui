# Codex 5.1 – Bus medaus / bitininkas-ui

## 1. AGENTS.md  

```md
# AGENTS

codex --search --sandbox=danger-full-access --ask-for-approval=never -c
sandbox_workspace_write.network_access=true

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

---------------

# STARTER PACK – SYSTEM OVERVIEW 

Šis skyrius skirtas tam, kad bet kuris naujas agentas ar Codex iškart suprastų projektą, funkcionalumą, duomenų logiką ir ribas, kad galėtų tęsti darbus saugiai ir nuosekliai.

---

## 1. Projekto paskirtis (visos sistemos kontekstas)
„Bus medaus“ – tai SaaS platforma bitininkams ir bitininkystės paslaugų tiekėjams.

Sistema turi dvi pagrindines vartotojų grupes:

### **1) Administratorius / Manageriai**
Jie:
- administruoja vartotojus, grupes, avilius;
- kuria naujienas, šablonus, užduotis;
- mato visus avilius, progresą, ataskaitas;
- valdo parduotuvę ir mato užsakymus.

### **2) Vartotojas – bitininkas**
Jis:
- mato jam priskirtus avilius,
- vykdo jam priskirtas užduotis,
- gauna naujienas,
- gali rašyti žinutes adminams,
- gali naudotis parduotuve.

Abi rolės turi atskirus meniu, skirtingus permissionus ir skirtingus landing pages.

---

## 2. Svarbiausi moduliai (funkciniai blokai)

### ✔ **Aviliai**
- Kiekvienas avilys priklauso vienam ar keliems vartotojams.
- Admin gali priskirti avilius grupėms.

### ✔ **Grupės**
- Grupės sujungia vartotojus ir leidžia vienu veiksmu priskirti užduotis / naujienas daugeliui avilių.

### ✔ **Žingsniai**
- Mažiausia darbo dalis (pvz. „Apžiūrėti perus“).
- Atlieka vartotojas vykdydamas užduotį.

### ✔ **Šablonai**
- Nustato žingsnių seką (pvz. „Pavasarinė apžiūra – 9 žingsniai“).
- Nenaudojami tiesiogiai, tik kaip bazė kuriant užduotis.

### ✔ **Užduotys**
Sudarytos iš:
- pavadinimo,
- šablono kopijos,
- žingsnių,
- datų.

Admin jas priskiria aviliams automatiškai, kai:
- sukuria naujieną **su užduotimi**, arba
- kuria užduotį be naujienos.

### ✔ **Assignment’ai**
- Užduoties kopijos kiekvienam aviliui.
- Vartotojo progresas, žingsnių statusai, media įkelti failai – VISKAS saugoma Assignment lygyje.

### ✔ **Naujienos**
- Tekstinis pranešimas.
- Gali turėti arba neturėti užduoties.
- Matomos tik tam tikroms grupėms arba visiems.

### ✔ **Žinutės**
- Support chat tarp vartotojo ir admin.

### ✔ **Parduotuvė**
- Prekės
- Krepšelis
- Užsakymo procesas
- Notifikacijos adminui apie naujus užsakymus

---

## 3. UI / UX principai

- Visi tekstai turi būti **lietuvių kalba**.
- Dizainas – shadcn + Tailwind, minimalistinis, tvarkingas.
- Nieko skeletinio nepakeisti globaliai – tik modifikuoti vietoje.

---

## 4. Ką draudžiama liesti (kritinė informacija)

- Autentifikacijos logikos (JWT, roles, user model).
- Deployment failų: Cloudflare, Koyeb, build scripts.
- Env failų.
- DB schema be migracijos.
- Roles / RLS / Guard struktūros.

---

## 5. API / DB architektūra (santrauka)

### Lentelės (aukšto lygio)
- `users`
- `hives`
- `groups`, `group_members`, `group_hive_members`
- `news`
- `tasks`, `task_steps`
- `assignments`, `assignment_steps`, `assignment_step_media`
- `products`, `orders`, `order_items`
- `messages`, `message_threads`

### Principai:
- Kainos saugomos centais.
- Media failai laikomi `/uploads`.
- Užduoties žingsniai kopijuojami į Assignmentą, kad nebūtų dependency po pakeitimų.

---