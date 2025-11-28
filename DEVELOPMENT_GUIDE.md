# DEVELOPMENT GUIDE

## Running Locally
1. 
pm install (bundles frontend + API dependencies). API code under pi/, SPA under root.
2. 
pm run dev launches Vite frontend. For Nest backend, switch to pi/ and 
pm run start:dev.
3. Ensure .env entries match .env.example (API base URL, tokens, database credentials).

## Seeding Data
- Seed scripts located under pi/src/seeds/. Run cd api && npm run seed (or 	s-node src/seeds/seed.ts). Seeds populate users, groups, tasks, news, and orders for demo.

## Migrations
- Modify backend entities or schema? Create a new TypeORM migration (
pm run typeorm migration:generate or via Nest CLI). Apply via 
pm run typeorm migration:run before deploying.

## Adding Endpoints
1. Add DTO under pi/src/<module>/dto with class-validator decorators.
2. Update controller with new route (decorated with @Get, etc.) and service method.
3. Implement service logic via TypeORM repositories, ensuring relations (join, order).
4. Add frontend API helper in src/lib/api.ts matching DTOs.
5. Hook page/component with React Query (query key, fetcher, data mapping).

## Adding Report Pages
1. Backend: extend ReportsService with required aggregation logic; expose via controller route.
2. Frontend: create page under src/pages/reports/. Wrap with MainLayout, include ReportsTabs.
3. Use useQuery to call pi.reports.* endpoints and capture filters.
4. Ensure new tab route is added to ReportsTabs, App.tsx, and Sidebar as needed.
5. Add drill-down logic by using useNavigate/useSearchParams to populate /reports/hives filters.

## Codex Prompt Tips
- Describe minimal change: include affected file(s), summary, tests run.
- If the fix touches both backend and frontend, split explanation into sections.
- Always mention 
pm run typecheck and 
pm run build results.
- Avoid modifying unrelated modules (auth, migrations) without explicit instructions.
