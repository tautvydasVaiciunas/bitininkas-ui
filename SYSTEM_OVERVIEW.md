# SYSTEM OVERVIEW

## Architecture
- **Frontend**: React + Vite + TypeScript, styling via Tailwind and shadcn UI components. Routing handled by eact-router-dom with BrowserRouter and guarded routes through ProtectedRoute. Global data fetching uses @tanstack/react-query with a single QueryClient wrapped by QueryClientProvider. Authentication/authorization state lives in AuthContext. Shopping cart state is provided via CartContext. UI features reuse shadcn primitives (Button, Card, Dialog, etc.).
- **Backend**: NestJS (TypeScript) structured in modules (auth, users, tasks, reports, hive history, notifications, store). Each module exposes controllers, services, DTOs, and TypeORM entities.

## Domain Areas
- **Hives**: entities representing physical hives, tied to groups and members. Assignments link to hives. Hive history records progress/comments.
- **Tasks**: templates consisting of ordered steps. Task instances (assignments) are created per hive when news/assignments are created. Progress tracking per assignment-step.
- **Steps/Templates**: StepTemplate entities reused across tasks. Templates define sequences of steps, each step may require media.
- **News**: managed via admin UI; can include tasks. Creating news optionally triggers assignment/notifications.
- **Groups**: logical collections of hives/users. News/assignments target groups rather than individual users directly.
- **Users**: roles (admin, manager, user). Auth tokens persisted in localStorage. Users may be assigned to hives via groups.
- **Messages**: support threads between users and admins. File uploads handled via shared upload controller.
- **Reports**: multiple views (/reports/hives, /reports/assignments, /reports/calendar, /reports/users) built on top of aggregator endpoints in eports.service.
- **Shop & Orders**: storefront pages (/parduotuve, /parduotuve/produktas/..., cart, checkout) calling store endpoints; admin store management located under /admin/store.

## Data Flow
1. SPA sends authenticated REST requests via src/lib/api.ts. Each request adds access token header stored in AuthContext/pi.ts helper.
2. Backend controllers (e.g., 
ews.controller, eports.controller, orders.controller) call services that query TypeORM repositories, apply filters, and return DTOs.
3. APIs returning emails/notifications (e.g., email.service.ts, 
otifications.service.ts) are triggered after entity mutations (news create, assignment change, order creation).
4. React Query caches responses keyed by semantic keys; components subscribe via useQuery/useMutation.
5. Shared email layout (enderEmailLayout in pi/src/email/email-template.ts) wraps all transactional emails before SES send.

## Roles
- **Admin**: full access across admin UI, reports, groups, store. Sidebar shows admin nav. Protected routes guard admin endpoints.
- **Manager**: similar to admin but may be scoped; can access reports and manage news/assignments.
- **User**: sees only news, hives, tasks, messages, support, and store pages.

## Authentication Flow
- SPA login form calls pi.auth.login, gets JWT access/refresh tokens, and stores them via setToken.
- AuthContext bootstraps by restoring tokens from localStorage and fetching /auth/me.
- Protected routes and backend guards enforce authentication/roles.

## File Upload / Media Flow
- Shared support-upload.controller.ts handles file uploads with Multer limits and reuses the same storage helpers for assignment media.
- Frontend file inputs send FormData to upload endpoints; responses include URL, MIME type, size, kind.
- Uploaded files are linked to assignments/steps and surfaced in assignment details or support messages.

## Global Providers
- QueryClientProvider wraps the SPA.
- AuthProvider supplies auth state and login/logout helpers.
- CartProvider maintains cart state for store flows.
- TooltipProvider and Toaster provide UI feedback.
