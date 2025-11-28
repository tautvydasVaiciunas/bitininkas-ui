# API ENDPOINTS

## Authentication
- POST /auth/login – payload { email, password }; response { accessToken, refreshToken, user }. Used by login form.
- POST /auth/refresh – uses refresh token; returns new tokens. Called automatically via setToken helper.
- GET /auth/me – returns current user profile. Used by AuthProvider bootstrapping.

## Users
- GET /users – paginated list; query page, limit, q. Used by admin user list & reports user filter.
- POST /users – create new admin/manager user. Frontend admin form.
- PATCH /users/:id – update user profile. Used by profile page.
- PATCH /users/:id/role – change role. Admin-only.
- DELETE /users/:id – remove user (admin).

## Groups
- GET /groups – list groups. Used extensively by frontend filters (reports, admin forms).
- POST /groups – create group with metadata.
- PATCH /groups/:id – update.
- DELETE /groups/:id – delete group.
- /groups/:id/members subroute: GET list members, POST add member, DELETE remove.

## Hives
- GET /hives – list hives for current user. pi.hives.list used on /hives page.
- GET /hives/:id – hive detail, used on HiveDetail page.
- Additional endpoints for hive history, assignment-specific data (not exhaustively listed).

## Tasks & Assignments
- GET /tasks – list task templates. Used extensively by forms.
- GET /tasks/:id – task detail.
- GET /assignments – paginated list of assignments (admin tasks page).
- GET /assignments/:id/run – assignment run data for user execution. TaskRun page.
- POST /assignments/:id/progress/step-complete – mark step complete (used during execution + media uploads). Also progress endpoints list / update / emove.
- Additional assignment endpoints for admin management (archive, status change).

## Steps/Templates
- GET /admin/templates – list templates. AdminTemplates page uses this.
- GET /admin/steps – list steps; used for template creation.
- POST /admin/templates etc. (Admin forms) not detailed but follow same pattern.

## News
- GET /news – paginated news list for users. React queries use infinite scrolling.
- GET /news/:id – detailed news view.
- POST /admin/news – create news (admin). Payload includes optional task info, group IDs, notification flags.
- PATCH / DELETE exist for editing news.

## Notifications
- GET /notifications – list notifications for user; used by topbar menu.
- GET /notifications/unread-count – badge count, used by Topbar and Sidebar.
- PATCH /notifications/:id/read – mark as read.

## Support / Messages
- GET /support/threads – user support threads.
- POST /support – create message.
- GET /support/upload – (Multer route) handles file uploads.

## Reports
- GET /reports/assignments – per-hive assignment report. Returns array of AssignmentReportRow. Used by /reports/hives and other views.
- GET /reports/assignments/analytics – aggregated analytics per task. Response includes summary stats and row data (counts, ratings). Used by /reports/assignments view.
- GET /reports/calendar – not yet built? (maybe aggregated but we rely on /reports/assignments with date filters).
- GET /reports/users – user summary, returns totals per user.
- GET /reports/users/assignments – assignments for a specific user & year.

## Store / Orders
- GET /store/products – product list for storefront.
- GET /store/products/:slug – product detail.
- POST /store/orders – create order (checkout). Sends order confirmation email.
- GET /store/my-orders – user order history.
- Admin store routes: /admin/store/products (list/create/update/disable), /admin/store/orders (list/get/update status), /admin/store/orders/count for badge.

## Email & Testing
- POST /admin/email/test – send a test email via SES. Used by admin email test page.

## Misc
- GET /cart – (handled client-side) not restful.
- /reports/assignments etc. under eports module enforce roles (guarded by @Roles).

