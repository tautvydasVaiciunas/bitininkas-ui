# KNOWN FLOWS

## Hive creation and assignment
1. Admin creates hive data (optionally linking hives to groups via /admin/groups).
2. Admin publishes a news post, chooses whether it carries an assignment, and selects the target groups.
3. When an assignment is requested, the platform creates a Task (optionally from a template) and one Assignment per hive in the selected groups.
4. Assignment creation logs notifications/emails for hive owners and members; assignment progress feeds the reports table.
5. Emails reuse `renderEmailLayout` from `api/src/email/email-template.ts` and include CTAs to related resources.

## User completing task steps
1. Users open `/tasks/:id/run` to follow their assignment steps and mark progress.
2. Steps that request media upload show file inputs; `/support/upload` stores the files and links them to assignments or support threads.
3. Each completed step calls `/progress/step-complete`, stores notes/ratings, and optionally uploads user media.
4. Ratings to `step_progress` are aggregated in `reports/assignments/analytics` and shown on ReportsAssignments.

## Admin sending news with optional task
1. `/admin/news` lets admins publish text-only news posts or create tasks simultaneously.
2. When assignments are requested, the form validates template, dates, and target groups before creating the Task.
3. Assignments are created per hive, notifications/emails are sent, and the news entry links back via `attachedTaskId`.

## Order placement
1. Users build a cart and use `/parduotuve/uzsakymas` to call `POST /store/orders`.
2. The API persists the order, sends confirmation emails, and notifies admins (`NotificationType.store_order`).
3. `/admin/store/orders` surfaces pending entries; a badge on the sidebar counts non-completed orders.

## Group creation and hive linking
1. Admins create groups via `/admin/groups` and assign existing hives.
2. News/assignments targeting groups apply to all linked hives and their members.
3. Group membership feeds Filters in reports and hive detail views.

## Reports overview usage
- `/reports/hives`: per-hive assignment list with filters for group, hive, task, status, user search, and date range.
- `/reports/assignments`: aggregated task view with summary cards, analytics data, and drill-down links toward `/reports/hives`.
- Both reports reuse `MainLayout`/`ReportsTabs` to keep navigation consistent.

## Support flow
1. Authenticated users use `/support/my-thread` (and `/support/my-thread/messages`) to chat with admins/managers.
2. Files are uploaded via `POST /support/upload` and recorded as message attachments.
3. Admins read threads through `/admin/support/threads` and respond with `/admin/support/threads/:id/messages`.
4. User messages trigger notifications linking back to `/support`, keeping the badge and unread count accurate.
