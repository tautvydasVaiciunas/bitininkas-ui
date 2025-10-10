# Codex Backend Updates

## TypeORM column typing and nullability cleanup
- Standardized text column metadata across user, group, hive, task, progress, notification, and activity log entities to prevent `design:type` "Object" mismatches in PostgreSQL.
- Introduced strict varchar lengths and null defaults aligned with the existing schema and recorded them in a follow-up migration.
- Normalized DTO validation and service-layer sanitization so optional fields consistently persist as `null` instead of `undefined` or empty strings.
