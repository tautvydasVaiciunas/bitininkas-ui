# FRONTEND STRUCTURE

## Pages
- /: redirects to /news.
- /news, /news/:id: user news listing/detail (infinite scroll, News + NewsDetail).
- /hives, /hives/:id: hive list/detail pages (Hives, HiveDetail).
- /tasks, /tasks/:id, /tasks/:assignmentId/preview, /tasks/:id/run: assignment listing/detail/run forms.
- /support: support chat.
- /parduotuve*: storefront (product list, detail, cart, checkout, success, order history).
- /admin/*: admin sections (users, groups, steps, tasks, templates, news, support, email test, store management).
- /reports/hives and /reports/assignments: the only reports views currently rendered in the SPA.
- Auth: /auth/login, /auth/forgot, /auth/reset.

## Components
- Layout: MainLayout wraps pages with Sidebar, Topbar, Breadcrumbs.
- UI primitives: reused shadcn Card, Button, Input, Select, Alert, Badge, Table, Dialog, Tabs.
- Shared icons: custom BeekeepingIcons wrapping PNG assets for nav.
- Notifications: Topbar dropdown fetches notifications; Sidebar badge shows unread messages.
- Reports: ReportsTabs renders nav pills; the SPA only renders ReportsHives.tsx and ReportsAssignments.tsx, each building filters and tables.

## Hooks & Providers
- AuthContext: manages user state, bootstrapping from tokens, login/logout, stored in localStorage.
- CartContext: holds cart items for store.
- useQuery/useMutation: React Query for data fetching (news pages, hives, tasks, support, store, reports).
- ProtectedRoute: ensures authenticated access.
- useNavigate, useSearchParams used across pages.

## React Query Usage
- News: infinite query for paginated news; caches each page.
- Hives, Tasks, Reports: queries for groups, hives, tasks, assignments, analytics, user summary.
- Topbar: fetches notifications summary and unread count.
- Support/chat: pi.support queries for threads/message lists.
- Store: queries product list, product detail, creates orders via mutations.

## Global State
- Auth: AuthProvider exports useAuth. Stores tokens/User in context. Toaster + TooltipProvider wrap App for UI feedback.
- Cart: CartProvider exposes cart operations; used by store pages.
- Notifications: Topbar uses useQuery to fetch notifications and useMutation mark read.
- Modals/Dialogs: shadcn Dialog used across admin sections (user/hive selection, support details).

## Navigation
- Sidebar displays different items for admins/managers (admin sections, reports, store). Users see news, hives, tasks, messages, store.
- Topbar includes theme toggle, notifications, user menu, support link, logout.
- Reports tabs run inside MainLayout; each ReportsTabs pill uses NavLink.

## Reports Integration
- Reports pages consume pi.reports endpoints via React Query.
- Filters built via Select, Input, Button. Each report renders tables/cards summarizing tasks/hives/users.
- Drill-down: analytics page interacts with /reports/hives via query params.
