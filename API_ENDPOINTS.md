# API ENDPOINTS

## Authentication
* `POST /auth/login` – credentials -> access/refresh tokens + user.
* `POST /auth/refresh` – exchange refresh token for fresh pair.
* `POST /auth/forgot-password` and `POST /auth/reset-password` – password recovery flows.
* `GET /auth/me` – profile bootstrap for SPA.

## Users
* `GET /users` – paginated admin list with `q`, `page`, and `limit` filters.
* `POST /users` – create admin/manager users.
* `PATCH /users/:id` – update profile data.
* `PATCH /users/:id/role` – change role.
* `DELETE /users/:id` – remove a user.

## Groups
* `GET /groups` – list of groups for filters and selection components.
* `POST /groups` – create a new group.
* `PATCH /groups/:id` – update metadata.
* `DELETE /groups/:id` – delete a group.
* `/groups/:id/members` – manage group members (list, add, remove).

## Hives
* `GET /hives` – user-specific hive list. `status` query toggles archived entries.
* `GET /hives/:id` – hive detail.
* `GET /hives/:id/history` – paginated history entries.
* `POST /hives/:id/history/manual` – add manual note.
* `PATCH /hives/history/:eventId` and `DELETE /hives/history/:eventId` – edit/delete manual notes.
* `POST /hives` / `PATCH /hives/:id` / `DELETE /hives/:id` – create, update, remove hives (admin scope).

## Tasks & Steps
* `GET /tasks` – filtered task list (category, frequency, seasonMonth, status).
* `GET /tasks/:id` – task detail (with latest news metadata).
* `GET /tasks/:id/steps` – retrieve ordered steps.
* `POST /tasks` – create a task with embedded steps.
* `PATCH /tasks/:id` – update title/category/frequency/dates and optionally replace steps or link a template.
* `PATCH /tasks/:id/archive` – toggle archive flag.
* `POST /tasks/:id/steps` / `PATCH /tasks/:id/steps/:stepId` / `DELETE /tasks/:id/steps/:stepId` – manage steps.
* `POST /tasks/:id/steps/reorder` – change step order.
* `/steps` and `/templates` plus `/tags`/`/hive-tags` expose supplemental data for builder screens.

## Assignments
* `GET /assignments` – paginated list for admin dashboard (filters: hiveId, status, groupId, availableNow).
* `POST /assignments` – manual assignment creation.
* `PATCH /assignments/:id` – update assignment metadata.
* `GET /assignments/:id/details`, `/run`, `/preview` – assignment context for admin or user flows.
* `POST /assignments/:id/progress/step-complete` – mark steps complete.
* `PATCH /progress/:id` / `DELETE /progress/:id` – update or undo step progress.
* `PATCH /assignments/:id/rating` and `POST /assignments/:id/rate` – submit or confirm ratings.
* `GET /assignments/preview/:id`?` not actual?`**`?` We'll mention actual ones from SPA: map to controllers? For simplicity only mention ones we saw.
* `GET /assignments/review-queue` – admin review list.
* `POST /assignments/bulk-from-template` – bulk assignments (admin).
* `POST /assignments/:assignmentId/steps/:stepId/media` – upload attachment for a step.

## News
* `GET /news` and `/news/:id` – user feed with infinite scrolling.
* `/admin/news` – list/create/update/delete news posts (with optional task creation/assignment flags).

## Support
* `GET /support/my-thread` – fetch or create the current user thread.
* `GET /support/my-thread/messages` / `POST .../messages` – paginate or send user messages.
* `POST /support/upload` – authenticated media uploads for messages/assignments.
* Admin scope: `/admin/support/threads`, `/admin/support/threads/:id/messages`, `/admin/support/unread-count`, `/admin/support/threads` (create/ensure thread).

## Reports
* `GET /reports/assignments` – per-hive rows used on `/reports/hives`.
* `GET /reports/assignments/analytics` – aggregated analytics used on `/reports/assignments`.

## Store & Orders
* `GET /store/products` and `/store/products/:slug` – public product catalog.
* `POST /store/orders` – checkout.
* `GET /store/my-orders` – order history for the current user.
* Admin store: `/admin/store/products` (list/create/update/disable), `/admin/store/orders` (list/get/update-status), `/admin/store/orders/count` for sidebar badge updates.

## Notifications
* `GET /notifications`, `GET /notifications/unread-count`, `PATCH /notifications/:id/read`, `PATCH /notifications/mark-all-read` – keep the topbar/sidebar badges fresh.

## Media & Uploads
* `POST /media/upload` – manager/admin-only media uploader guarded by MIME/size checks.

## Profile
* `PATCH /profile` – update profile.
* `PATCH /profile/password` – change password.
* `POST /profile/avatar` – upload avatar.
