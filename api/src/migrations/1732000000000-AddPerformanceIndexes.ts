import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPerformanceIndexes1732000000000 implements MigrationInterface {
  name = 'AddPerformanceIndexes1732000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // assignments
    const hasAssignments = await queryRunner.hasTable('assignments');
    if (hasAssignments) {
      const hasGroupId = await queryRunner.hasColumn('assignments', 'group_id');
      if (hasGroupId) {
        await queryRunner.query(
          'CREATE INDEX IF NOT EXISTS "IDX_ASSIGNMENTS_GROUP_ID" ON "assignments" ("group_id")',
        );
      }
      const hasCreatedAt = await queryRunner.hasColumn('assignments', 'created_at');
      if (hasCreatedAt) {
        await queryRunner.query(
          'CREATE INDEX IF NOT EXISTS "IDX_ASSIGNMENTS_CREATED_AT" ON "assignments" ("created_at")',
        );
      }
    }

    // assignment_progress
    const hasAP = await queryRunner.hasTable('assignment_progress');
    if (hasAP) {
      const hasAPUser = await queryRunner.hasColumn('assignment_progress', 'user_id');
      const hasAPAssignment = await queryRunner.hasColumn('assignment_progress', 'assignment_id');
      const hasAPStep = await queryRunner.hasColumn('assignment_progress', 'step_id');

      if (hasAPUser) {
        await queryRunner.query(
          'CREATE INDEX IF NOT EXISTS "IDX_assignment_progress_user" ON "assignment_progress" ("user_id")',
        );
      }
      if (hasAPAssignment) {
        await queryRunner.query(
          'CREATE INDEX IF NOT EXISTS "IDX_assignment_progress_assignment" ON "assignment_progress" ("assignment_id")',
        );
      }
      if (hasAPAssignment && hasAPUser && hasAPStep) {
        await queryRunner.query(
          'CREATE UNIQUE INDEX IF NOT EXISTS "IDX_assignment_progress_unique" ON "assignment_progress" ("assignment_id","user_id","step_id")',
        );
      }
    }

    // notifications
    const hasNotifications = await queryRunner.hasTable('notifications');
    if (hasNotifications) {
      const hasNotifUser = await queryRunner.hasColumn('notifications', 'user_id');
      const hasNotifIsRead = await queryRunner.hasColumn('notifications', 'is_read');
      const hasNotifCreatedAt = await queryRunner.hasColumn('notifications', 'created_at');

      if (hasNotifUser) {
        await queryRunner.query(
          'CREATE INDEX IF NOT EXISTS "IDX_notifications_user_id" ON "notifications" ("user_id")',
        );
      }
      if (hasNotifIsRead) {
        await queryRunner.query(
          'CREATE INDEX IF NOT EXISTS "IDX_notifications_is_read" ON "notifications" ("is_read")',
        );
      }
      if (hasNotifCreatedAt) {
        await queryRunner.query(
          'CREATE INDEX IF NOT EXISTS "IDX_notifications_created_at" ON "notifications" ("created_at")',
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_notifications_created_at"');
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_notifications_is_read"');
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_notifications_user_id"');

    await queryRunner.query('DROP INDEX IF EXISTS "IDX_assignment_progress_user"');
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_assignment_progress_assignment"');
    await queryRunner.qu
