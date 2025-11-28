# DATA MODEL

## Entities\Tables
### users
- Columns: id, email, passwordHash, role, name, phone, address, createdAt, updatedAt.
- Relations: one-to-many to assignments, notifications, groups (through membership).
- Constraints: email unique, password stored hashed.

### groups
- Columns: id, name, handle, createdAt, updatedAt.
- Relations: many-to-many with users (via group_members join table) and hives.
- Cascade: deleting group removes memberships but not hives/users.

### hives
- Columns: id, label, location, number, createdAt, updatedAt.
- Relations: many-to-one to owner user, many-to-many via group assignments, has history entries.

### tasks
- Columns: id, title, description, templateId, startDate, endDate, createdAt.
- Relations: one-to-many to assignments, many-to-one template.

### templates
- Columns: id, name, description, estimatedDuration, createdAt.
- Relations: one-to-many to steps and tasks.

### steps
- Columns: id, templateId, title, description, expectedDuration, requiresMedia.
- Relations: belongs to a template; progress entries reference steps.

### assignments
- Columns: id, hiveId, taskId, status, startDate, endDate, createdAt, updatedAt.
- Relations: many-to-one hive, many-to-one task, one-to-many step progress.
- Constraints: unique per hive/task combination per period.

### step_progress
- Columns: id, assignmentId, stepId, userId, completedAt, isComplete, rating, createdAt.
- Relations: references assignment, step, user. Rating derived from steps requiring feedback.

### notifications
- Columns: id, userId, type, title, body, link, isRead, createdAt.
- Triggers: created after assignment changes, order events, support replies.

### news_posts
- Columns: id, title, content, imageUrl, createdAt, publishedAt.
- Relations: many-to-many groups, optional assigned task.

### orders / store_orders
- Columns: id, userId, totalAmount, status, createdAt, updatedAt.
- Relations: order_items with productId, quantity, unitPrice.

## Enums
- UserRole: user, manager, dmin.
- AssignmentStatus: waiting, ctive, overdue, completed.
- NotificationType: ssignment, 
ews, message, hive_assignment, hive_history, store_order.

## Cascade Rules
- Deleting assignments cascades to step progress entries.
- Deleting users removes related notifications but preserves completed history.

## Typical Use Cases
- News creation links to assignments by creating tasks + per-hive assignments.
- Reports aggregate assignment counts per group/hive/user.
- Orders link to users via stores and generate notifications + emails.
