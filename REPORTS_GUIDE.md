# Bus medaus – Ataskaitų specifikacija

Šis failas aprašo, kaip turi veikti ataskaitų zona ir kokie yra apribojimai keičiant kodą.

Prieš darant BET KOKIUS pakeitimus ataskaitų srityje, VISADA:
- pirmiausia perskaityk `AGENTS.md`
- tada perskaityk šį `REPORTS_GUIDE.md`

Tikslas – tvarkingai atskirti operatyvų vaizdą (konkrečių avilių užduotys) nuo aukštesnio lygio analizės (užduočių rezultatyvumas).

---

## 1. Puslapio struktūra ir maršrutai

Ataskaitos yra suskirstytos į dvi logiškai atskiras skiltis:

1. **Avilių užduotys** – operatyvinė peržiūra pagal konkrečius avilius.
2. **Užduočių analizė** – bendroji priskirtų užduočių analitika (per užduotis, ne per avilius).

### 1.1. Navigacija

Kairiajame meniu:

- Rodomas įrašas **„Ataskaitos“**, kuris atsidaro į dvi sub-nuorodas:
  - **„Avilių užduotys“** → maršrutas pvz. `/reports/hives`
  - **„Užduočių analizė“** → maršrutas pvz. `/reports/assignments`

Reikalavimai:

- Nepanaikink ir nepervadink kitų meniu punktų.
- Jei reikia, naudok esamą „Ataskaitos“ įrašą kaip tėvinį ir pridėk du „child“ route’us.
- Jei dėl istorinių priežasčių egzistuoja `/reports` maršrutas – jis gali redirectinti, pvz. į `/reports/hives`, bet nekeisk backend routing be būtinybės.

---

## 2. Avilių užduotys (`Avilių užduotys` vaizdas)

Ši skiltis skirta **admin/manager**, kad matytų, kaip sekasi KONKRETEMS aviliams.

### 2.1. Filtrai

Viršuje turi būti filtravimo juosta (nebūtinai tokia, bet arčiau šito):

- **Grupė** – dropdown („Visos grupės“ + konkrečios).
- **Avilys** – dropdown (pasirenkamas konkretus avilys).
- **Užduotis** – dropdown („Visos užduotys“ + konkrečios).
- **Būsena** – dropdown: „Visos“, „Laukiama“, „Vykdoma“, „Vėluoja“, „Užbaigta“.
- **Vartotojas** (optional) – pagal priskirtą vartotoją.
- **Laikotarpis nuo / iki** – data pickeriai.

Taisyklės:

- Filtrai turi būti neprivalomi.
- „Išvalyti filtrus“ mygtukas grąžina default („Visos“, tuščios datos ir pan.).
- Naudok jau egzistuojančius API / tipų map’us, NERAŠYK naujos schemos, jei nebūtina.

### 2.2. Lentelė

Pagrindinėje dalyje – viena aiški lentelė, kiekviena eilutė = **vienas assignment konkrečiam aviliui**.

Minimalūs stulpeliai:

- **Užduotis** – pavadinimas.
- **Avilys** – avilio pavadinimas.
- **Vartotojas** – vartotojo vardas / el. paštas.
- **Paskirta** – data, kada užduotis priskirta.
- **Būsena** – „Laukiama“, „Vykdoma“, „Vėluoja“, „Užbaigta“ (naudok esamą status logiką).
- **Žingsniai** – pvz. `2/5`.
- **Baigta** – pvz. `40 %` arba rodykle / progress bar (galima pernaudoti komponentus).
- **Paskutinė veikla** – paskutinio žingsnio data (jei yra).
- **Veiksmai**:
  - `Peržiūrėti` → atidaro esamą užduoties vykdymo/istorijos vaizdą (pvz. `/tasks/:assignmentId`).
  - `Priminimas` (optional) → atidaro support/chat su tuo vartotoju (NEPRIVALOMA pirmai iteracijai).

Reikalavimai:

- Nenaikink ir neperrašyk egzistuojančios `/tasks` logikos.
- Lentelės duomenis imk iš esamų endpoint’ų (`reports`, `assignments`, ir pan.). Jei reikia naujo endpoint’o – kurk minimalų, nekeisdamas schemos.
- Pirmoje iteracijoje, jei nėra patogaus endpoint’o „assignment per avilys“, galima rodyti tą pačią info, kuri iki šiol buvo „Progreso ataskaita“ dalyje – bet jau aiškioje lentelėje.

---

## 3. Užduočių analizė (`Užduočių analizė` vaizdas)

Ši skiltis rodo **užduotis kaip vienetus**, ne avilius.  
T.y. admin mato: „Pavasarinė apžiūra“ – kiek avilių priskirta, kiek užbaigė, koks vidutinis įvertinimas.

### 3.1. Filtrai

Viršuje:

- **Užduotis** – dropdown (arba „Visos užduotys“).
- **Laikotarpis nuo / iki** – priskyrimo data (ar ta, kuri naudojama dabar).
- **Grupė** – „Visos grupės“ + konkrečios.
- **Būsena** – „Visos“, „Laukiama“, „Vykdoma“, „Vėluoja“, „Užbaigta“.

Filtrų idėja – nurėžti dataset, kurį analizuojame.

### 3.2. Lentelė: užduočių santrauka

Lentelėje vienas įrašas = viena užduotis:

Stulpeliai:

- **Užduotis**
- **Viso priskirta** – kiek avilių gavo šią užduotį.
- **Baigta** – kiek avilių užbaigė.
- **Vykdoma**
- **Laukiama**
- **Vėluoja**
- **Vidutinis įvertinimas** – 1–5 žvaigždutės pagal step rating funkciją.
- **Vartotojų (baigę/viso)** – pvz. `16 / 32`.
- **Veiksmai** – `Peržiūrėti`.

### 3.3. Drill-down į avilius

Paspaudus `Peržiūrėti`:

- Arba atidarai šoninį panelį su avilių sąrašu,
- Arba naviguoji į „Avilių užduotys“ vaizdą ir automatiškai pritaikai filtrus (užduotis = ta, kurią spaudė).

Svarbu:

- Drill-down neturi kurti naujų duomenų, tik pernaudoti egzistuojančius.
- Nedvigubink loginės – jei jau yra endpoint’as, kuris gražina assignments per užduotį, naudok jį.

---

## 4. Bonus idėjos (vėlesnėms iteracijoms)

ŠIOS DALYS YRA ATEIČIAI. Šiuo metu jų NEĮGYVENDINK, tik laikyk omenyje architektūrą.

### 4.1. Užduočių kalendorius

- Rodyti mėnesio vaizdą su „kiek užduočių laukia/aktyvios konkrečiomis dienomis“.
- Gali būti atskiras tab’as arba sekcija.

### 4.2. Vartotojo progreso suvestinė per metus

- Rodomas vartotojo progresas (kiek užduočių jam buvo priskirta, kiek užbaigė, koks vidutinis vėlavimas, įvertinimai ir pan.).

---

## 5. Bendri principai / apribojimai

Labai svarbu:

1. **Nekeisk to, kas jau veikia, nebent klaida tiesiogiai susijusi su ataskaitomis.**
2. **Nekeisk DB schemos ir nemigruok duomenų**, nebent aiškiai nurodyta užduotyje.
3. Jei reikia naujo endpoint’o:
   - naudok esamus entity ir tipus,
   - nerašyk breaking changes (nedeletink laukų, nekeisk meaning).
4. **Nekeisk el. pašto ir notifikacijų logikos**, nebent užduotyje aiškiai pasakyta priešingai.
5. Visada po pakeitimų paleisk:
   - SPA: `npm run typecheck` ir `npm run build`
   - API: `cd api && npm run typecheck` ir `cd api && npm run build`
6. Jei kažką refaktoriuoji – daryk tai lokaliai, tik ataskaitų zonai, be globalių UI temų ar layout’ų perrašymo.



## 6. Užduočių kalendorius (BONUS)

Ši dalis yra papildoma, bet jei daroma – privalo laikytis šių taisyklių.

Tikslas – matyti, KADA per mėnesį yra daugiausiai užduočių: kada jos startuoja, iki kada turi būti įvykdytos, kada vėluoja.

### 6.1. Maršrutas ir vieta

- Naujas vaizdas, pvz. `/reports/calendar`.
- Kairiajame meniu po „Užduočių analizė“ gali atsirasti trečias įrašas:
  - „Kalendorius“ → `/reports/calendar`.
- Nepanaikinti kitų ataskaitų skilties įrašų.

### 6.2. Filtrai

Virš kalendoriaus:

- Grupė (Visos grupės + konkrečios).
- Užduotis (Visos užduotys + konkrečios).
- Būsena (Visos / Laukiama / Vykdoma / Vėluoja / Užbaigta).
- (optional) Laikotarpis – mėnesio arba datos pasirinkimas (gali būti „Mėnuo“ su perjungimu pirmyn/atgal).

### 6.3. Kalendoriaus logika

- Rodomas **mėnesio** vaizdas (dienos langeliai).
- Kiekvienoje dienoje rodomi bent du skaičiai (piktogramos ar „ženkliukai“):
  - kiek užduočių **prasidėjo** tą dieną (pagal `startDate`).
  - kiek užduočių **baigiasi** (due) tą dieną (pagal `endDate`).
- Vizualiai galima skirti spalvomis (pvz. kairė/įėjimas, dešinė/išėjimas; naudoti jau naudojamas spalvas).

### 6.4. „Drill-down“

- Paspaudus ant dienos:
  - atidaryti šoninį panelį **arba** lentelę po kalendoriumi,
  - joje rodyti sąrašą užduočių tą dieną (per avilius), su laukais:
    - Užduotis
    - Avilys
    - Vartotojas
    - Būsena
    - Žingsniai / progresas
    - Veiksmai → `Peržiūrėti` (veda į esamą `/tasks/:assignmentId`).
- Jei įmanoma – naudoti tą patį duomenų šaltinį kaip „Avilių užduotys“ vaizde, tik filtrą pagal pasirinktą datą.

### 6.5. Apribojimai

- Nekeisti DB schemos.
- Neliesti email/notifications logikos.
- Jei reikia naujo API metodo – jis turi tik skaityti Assignment duomenis ir remtis esamais laukais (`startDate`, `endDate`, `status` ir pan.).

---

## 7. Vartotojo metinė suvestinė (BONUS)

Tikslas – matyti, kaip konkrečiam vartotojui sekasi per pasirinktus metus: kiek užduočių jam buvo priskirta, kiek baigta, vėlavimai, vidutinis įvertinimas.

### 7.1. Maršrutas ir vieta

- Naujas vaizdas, pvz. `/reports/users`.
- Kairiajame meniu po „Kalendorius“ (arba po „Užduočių analizė“, jei kalendoriaus nėra) galima pridėti:
  - „Vartotojų suvestinė“ → `/reports/users`.

### 7.2. Filtrai

Viršuje:

- Metai (dropdown: pvz. 2024, 2025, ...).
- Grupė (Visos grupės + konkrečios).
- Vartotojas (Visi vartotojai + konkretus).
- Būsena (Visos / Laukiama / Vykdoma / Vėluoja / Užbaigta) – gali riboti skaičiavimus.

### 7.3. Lentelė – per vartotojus

Eilutė = vienas vartotojas.

Stulpeliai (minimaliai):

- Vartotojas (vardas + el. paštas).
- Viso užduočių (priskirta).
- Užbaigta.
- Vykdoma.
- Vėluoja.
- Vidutinis įvertinimas (1–5).
- Vidutinis vėlavimas (pvz. dienomis; jei nėra duomenų – „—“).
- Paskutinė užbaigta užduotis (data).
- Veiksmai → `Peržiūrėti`.

### 7.4. Drill-down per vartotoją

Paspaudus `Peržiūrėti`:

- Atidaromas šoninis panelis **arba** naujas vaizdas, kuriame rodomos **to vartotojo užduotys** per pasirinktus metus:
  - panaši lentelė kaip „Avilių užduotys“, tik filtruota pagal vartotoją.
- Jokių naujų veiksmų (kol kas tik peržiūra).

### 7.5. Duomenys ir apribojimai

- Reikia naudoti egzistuojančius Assignment / Progress / Rating duomenis.
- Jei kuriamas naujas API endpoint’as:
  - jis turi tik agreguoti ir skaičiuoti (COUNT, AVG ir pan.).
  - jokio schemos keitimo.
- Neperrašyti esamos `/admin/users` logikos – tai atskiras „reporting“ vaizdas, ne vartotojų valdymas.

