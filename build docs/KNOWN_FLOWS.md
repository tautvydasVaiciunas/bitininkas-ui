# KNOWN FLOWS

## Hive creation and assignment
1. Admin creates hive (optionally via /admin/groups linking).
2. Admin creates news with task or standalone, selecting groups/hives.
3. System creates Task (if needed), then creates one Assignment per hive.
4. Each assignment generates AssignmentReportRow data and triggers notification/email to hive members.
5. Emails use shared layout (enderEmailLayout) with CTA when appropriate.

## User completing task steps
1. User visits /tasks/:id/run to view assignment progress.
2. Steps marked equiresMedia show file inputs; uploads go to shared upload endpoint and are linked to AssignmentStepMedia entities.
3. Completing a step calls progress.completeStep; steps tracked in step_progress table.
4. Ratings captured (1–5) on completion; ReportsAssignments and ReportsUsers display averages.

## Admin sending news with optional task
1. /admin/news form lets admin set visibility (all/specific groups) and choose whether to create a news post and/or assignment.
2. If Sukurti užduoti is enabled, assignment fields appear (name, dates, template). If only news is needed, leave checkbox unchecked to skip assignments.
3. Saving creates news record, optionally tasks/assignments, and issues notifications/emails for assigned users.

## Order placement
1. User fills cart, goes through /parduotuve/uzsakymas, calling POST /store/orders to create order.
2. Backend creates order record, triggers email via EmailService, and sends notification to admins (NotificationType.store_order).
3. Admin store page /admin/store/orders lists pending orders; badge on sidebar shows count of non-completed orders.

## Group creation + hive linking
1. Admin creates group via /admin/groups and selects existing hives.
2. Groups aggregate hives; news/assignments targeted to groups apply to all linked hives and members.
3. Group member list used by reports filters and hive detail views.

## Reports overview usage
- /reports/hives: per-hive assignments with filters for group, hive, task, status, date range, user search.
- /reports/assignments: aggregated per-task overview with summary cards and drill-down to /reports/hives filters.
- /reports/calendar: calendar view showing assignments starting/ending per day, drill-down per day to assignment details.
- /reports/users: yearly user summary with per-user counts, averages, and drill-down to assignments per selected user.
- Tabs and nav reduce duplication; all reports reuse MainLayout and ReportsTabs.
