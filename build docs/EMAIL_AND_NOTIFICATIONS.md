# EMAIL AND NOTIFICATIONS

## Email Layout
- enderEmailLayout (api/src/email/email-template.ts) renders a yellow header with Bus Medaus logo, optional green CTA button, and yellow footer with contact info/social icons.
- EmailService ensures every transactional mail (news, assignments, support, password reset, invite, orders) passes HTML through the shared layout. The service adds subject, main HTML body, optional primaryButtonLabel/primaryButtonUrl.
- Emails sent via SES adapter (email.service.ts calling AWS SES client). Api exposes /admin/email/test for manual testing.

## Notification Service
- Notifications stored in Postgres 
otifications table with fields 	ype, 	itle, ody, link, isRead.
- NotificationsService exposes endpoints for listing, unread count, marking read. Triggered by assignment creation, news emails, store orders, support replies.
- Frontend Topbar shows unread badge and dropdown summary; Sidebar shows a small red dot when support has unread.

## Triggered Templates
- **Hive assigned**: subject Jums priskirtas avilys, body includes main text plus optional CTA (primaryButtonLabel = Peržiureti avili). Notification triggered per user.
- **Hive removed**: subject Avilys nebera priskirtas, no CTA button, just plain text. Notification emailed + in-app notice.
- **Order confirmation**: subject Gautas naujas užsakymas, body lists totals and line items, CTA linking to orders page. Admin notification + store badge updates.
- **Password reset / invite**: share layout; CTA button (e.g., Atstatyti slaptažodi). No extra raw URLs.
- **News with task assignment**: when admin creates news, system generates assignments and sends emails per hive (via EmailService). Notification type 
ews used for in-app feed.
- **Support reply**: new messages trigger message type notifications with link to /support.

## Flow
1. Backend events (creating news/assignments, releasing emails, new orders) call EmailService, which uses enderEmailLayout to produce full HTML.
2. NotificationsService creates entries when assignments change state or messages arrive.
3. Frontend Topbar subscribes to pi.notifications.list and 
otifications.unreadCount to keep UI updated.
