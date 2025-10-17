import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPerformanceIndexes1732000000000 implements MigrationInterface {
  name = 'AddPerformanceIndexes1732000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // assignments
    if (await queryRunner.hasTable('assignments')) {
      if (await queryRunner.hasColumn('assignments', 'group_id')) {
        await queryRunner.query(
          'CREATE INDEX IF NOT EXISTS "IDX_ASSIGNMENTS_GROUP_ID" ON "assignments" ("group_id")'
        );
      }
      if (await queryRunner.hasColumn('assignments', 'created_at')) {
        await queryRunner.query(
          'CREATE INDEX IF NOT EXISTS "IDX_ASSIGNMENTS_CREATED_AT" ON "assignments" ("created_at")'
        );
      }
    }

    // assignment_progress
    if (await queryRunner.hasTable('assignment_progress')) {
      const hasUser = await queryRunner.hasColumn('assignment_progress', 'user_id');
      const hasAssignment = await queryRunner.hasColumn('assignment_progress', 'assignment_id');
      const hasStep = await queryRunner.hasColumn('assignment_progress', 'step_id');

      if (hasUser) {
        await queryRunner.query(
          'CREATE INDEX IF NOT EXISTS "IDX_assignment_progress_user" ON "assignment_progress" ("user_id")'
        );
      }
      if (hasAssignment) {
        await queryRunner.query(
          'CREATE INDEX IF NOT EXISTS "IDX_assignment_progress_assignment" ON "assignment_progress" ("assignment_id")'
        );
      }
      if (hasAssignment && hasUser && hasStep) {
        await queryRunner.query(
          'CREATE UNIQUE INDEX IF NOT EXISTS "IDX_assignment_progress_unique" ON "assignment_progress" ("assignment_id","user_id","step_id")'
        );
      }
    }

    // notifications
    if (await queryRunner.hasTable('notifications')) {
      if (await queryRunner.hasColumn('notifications', 'user_id')) {
        await queryRunner.query(
          'CREATE INDEX IF NOT EXISTS "IDX_notifications_user_id" ON "notifications" ("user_id")'
        );
      }
      if (await queryRunner.hasColumn('notifications', 'is_read')) {
        await queryRunner.query(
          'CREATE INDEX IF NOT EXISTS "IDX_notifications_is_read" ON "notifications" ("is_read")'
        );
      }
      if (await queryRunner.hasColumn('notifications', 'created_at')) {
        await queryRunner.query(
          'CREATE INDEX IF NOT EXISTS "IDX_notifications_created_at" ON "notifications" ("created_at")'
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_notifications_created_at"');
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_notifications_is_read"');
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_notifications_user_id"');
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_assignment_progress_unique"');
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_assignment_progress_assignment"');
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_assignment_progress_user"');
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_ASSIGNMENTS_CREATED_AT"');
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_ASSIGNMENTS_GROUP_ID"');
  }
}
