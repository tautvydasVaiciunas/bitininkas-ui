# Feature Integrity Checks for Prompts 1A–1D

Šis dokumentas aprašo patikrintus failus ir pagrindinius komponentus, užtikrinant, kad pakeitimai iš užduočių 1A–1D liko vientisi po paskutinių merge sprendimų.

## 1A – Žingsnių žymos ir modalai
- **Backend**: `api/src/migrations/1729000000000-AddTags.ts` sukuria `tags` ir `task_step_tags` lenteles, įskaitant indeksus ir ON DELETE CASCADE.
- **Entity lygmuo**: `api/src/tasks/steps/task-step.entity.ts` turi `@ManyToMany` ryšį su `Tag` per `task_step_tags`, o pats `Tag` apibrėžtas `api/src/tasks/tags/tag.entity.ts`.
- **API**: `api/src/tasks/steps/steps.controller.ts` ir `api/src/tasks/steps/task-steps.service.ts` palaiko `tagId` filtrą bei globalų žingsnių sąrašą.
- **Front-end**: `src/pages/admin/Steps.tsx` pateikia žymų filtrą, modalinį kūrimą/redagavimą ir žymų valdymo dialogą. Žingsnių kortelės rodo žymas kaip „pills“.

## 1B – Šablonų modalai ir rikiavimas
- `src/pages/admin/Templates.tsx` naudoja modalinį kūrimo/redagavimo langą, globalių žingsnių parinkimą su žymų filtru ir rodyklių pagrindu veikiančią rikiavimo logiką.
- `api/src/templates/templates.service.ts` įgyvendina `reorderSteps` su validacija, o `api/src/templates/dto/reorder-template-steps.dto.ts` aprašo DTO.

## 1C – Užduočių kūrimas iš šablono
- `api/src/assignments/dto/bulk-from-template.dto.ts` ir `api/src/assignments/assignments.service.ts` palaiko grupių pasirinkimą, datų validaciją ir el. laiškų siuntimą per `MailerPort`.
- `src/pages/admin/Tasks.tsx` turi modalinę formą šablono, grupių, datų bei pranešimų pasirinkimui ir rodo LT toast’us.

## 1D – LT seed’ai ir pranešimai
- `api/src/seeds/seed.ts` lokalizuotas į LT, sukuria demo žymas ir priskiria jas žingsniams bei šablonams.
- `src/i18n/messages.lt.json` praplėstas žingsnių, žymų, šablonų ir užduočių žinutėmis.

## Papildoma
- `npm run lint` sėkmingai praeina (tik egzistuojantys `react-refresh` įspėjimai). Tai patvirtina, kad TypeScript/ESLint taisyklės nebuvo pažeistos tikrinant failus.

Šis failas gali būti naudojamas kaip trumpa atmintinė ateities merge’ų peržiūroms arba QA srautams.
