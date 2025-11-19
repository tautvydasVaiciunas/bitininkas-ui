# Codex Audit 0--9

## Security  Config risks
- `src/lib/api.ts`
  ```ts
  const ACCESS_TOKEN_KEY = 'bitininkas_access_token';
  const REFRESH_TOKEN_KEY = 'bitininkas_refresh_token';

  const setRefreshToken = (token: string | null) => {
    if (token) {
      window.localStorage.setItem(REFRESH_TOKEN_KEY, token);
    } else {
      window.localStorage.removeItem(REFRESH_TOKEN_KEY);
    }
  };

  export const setToken = (token: string | null, refresh?: string | null) => {
    if (token) {
      window.localStorage.setItem(ACCESS_TOKEN_KEY, token);
    } else {
      window.localStorage.removeItem(ACCESS_TOKEN_KEY);
    }
  };
  ```
  - **Why:** Tokens are persisted in `localStorage`, which is accessible to any script on the page. A single XSS vulnerability can exfiltrate both access and refresh tokens, making account takeover trivial.
  - **Suggested fix:** Store the refresh token in an httpOnly cookie and keep the access token in memory (or rotate it via the cookie on each request) so that JavaScript cannot read persistent credentials; treat the user payload storage similarly if sensitive. (Risk: medium, Complexity: S)

- `api/.env.example`
  ```env
  POSTGRES_PASSWORD=postgres
  JWT_SECRET=supersecret
  JWT_REFRESH_SECRET=anothersecret
  ```
  - **Why:** Sample secrets and database credentials are already committed as literal strings. If the example file is copied into production, the service runs with known credentials, and there is no guard keeping them out of version control.
  - **Suggested fix:** Replace literal values with placeholders or comments (e.g., `JWT_SECRET=<YOUR_SECRET>`), ensure `.env` files never land in git, and enforce a secrets-review CI check before deployment. (Risk: medium, Complexity: S)

- `api/src/seeds/seed.ts`
  ```ts
  const passwordHash = await bcrypt.hash('password', 10);
  const admin = userRepository.create({ email: 'admin@example.com', passwordHash, ... });
  ```
  - **Why:** All seeded users share the same weak, well-known password. If seeds run outside of isolated dev environments (e.g., in staging) or the database is restored from seed data, administrators and managers can be compromised immediately.
  - **Suggested fix:** Generate unique, randomly generated passwords per account and print them securely during seeding or require operators to supply credentials via environment variables; skip seeding real accounts for non-local environments. (Risk: medium, Complexity: S)

## Biggest architecture/code quality smells
- **File:** `src/lib/api.ts` – A single ~1,100-line file meshes every endpoint definition, DTO, and data-mapping logic; this makes it difficult to reason about domain boundaries and slows refactors. Splitting into per-domain modules (`auth`, `hives`, `tasks`, `admin`, etc.) would improve maintainability (risk: medium, complexity: M).
- **File:** `src/pages/*.tsx` – Many feature pages (e.g., `Tasks.tsx`, `TaskRun.tsx`) are extremely large and likely combine data fetching, state management, and markup. Introducing smaller presentational components or hooks per feature would ease readability and testing (risk: medium, complexity: L).

## Potential dead code
- **Path:** `dist/` and `api/dist/` – Built artifacts are committed in the repo and never referenced by the source; removing them from version control (and adding to `.gitignore`) would declutter commits and avoid shipping stale bundles (risk: low, complexity: S).
- **File:** `src/components/ui/carousel.tsx` – Exports a full Embla-powered `Carousel`/`CarouselItem`/`CarouselNext` suite, but `rg -n "Carousel" src` only returns this file, indicating no imports in the app. Before deleting, run the same search and rerun `npm run typecheck` to confirm no residual references (or add feature back if still planned).
- **File:** `src/components/ui/chart.tsx` – Contains a heavy custom chart wrapper, yet `rg -n "ChartContainer" src` and `rg -n "<Chart" src` yield only the file itself, so nothing renders it at run time. Verify with those searches and, if uncertain, grep for the exported symbols (`Chart`, `ChartTooltip`) or run `npm run lint` to see if Tree Shaking already strips it—if not used, remove to avoid shipping unused SVG/styling helpers.

## Suggested refactor roadmap
1. **Audit and split `src/lib/api.ts` into domain-specific clients** (e.g., `src/lib/api/auth.ts`, `src/lib/api/tasks.ts`) so each file stays focused, easier to type, and quicker to test. Risk level: medium, estimated complexity: M.
2. **Introduce shared hooks/services for data-fetching logic inside `src/pages/*`** (move `useQuery` setup into `hooks/` and lean on smaller UI components) to reduce duplication, lower bundle cost, and make the UI layers leaner. Risk level: medium, complexity: L.
3. **Remove committed build outputs (`dist/`, `api/dist/`) and keep them out of git**; ensure CI/build scripts write to `dist/` only in `.gitignore`-tracked directories so future contributors don't accidentally commit generated artifacts. Risk level: low, complexity: S.
