import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPerformanceIndexes1732000000000 implements MigrationInterface {
  name = 'AddPerformanceIndexes1732000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Helperiai
    const hasTable = (t: string) => queryRunner.hasTable(t);
    const hasCol = (t: string, c: string) => queryRunner.hasColumn(t, c);
    const q = (sql: string) => queryRunner.query(sql);

    // --- assignments ---
    if (await hasTable('assignments')) {
      if (await hasCol('assignments', 'group_id')) {
        await q('CREATE INDEX IF NOT EXISTS "IDX_ASSIGNMENTS_GROUP_ID" ON "assignments" ("group_id")');
      }
      if (await hasCol('assignments', 'created_at')) {
        await q('CREATE INDEX IF NOT EXISTS "IDX_ASSIGNMENTS_CREATED_AT" ON "assignments" ("created_at")');
      }
    }

    // --- assignment_progress ---
    if (await hasTable('assignment_progress')) {
      const hasAssignment = await hasCol('assignment_progress', 'assignment_id');
      const hasUser = await hasCol('assignment_progress', 'user_id');

      // palaikyk abi schemas: task_step_id arba step_id
      const hasTaskStep = await hasCol('assignment_progress', 'task_step_id');
      const hasStep = await hasCol('assignment_progress', 'step_id');
      const stepCol = hasTaskStep ? 'task_step_id' : (hasStep ? 'step_id' : null);

      if (hasAssignment) {
        await q('CREATE INDEX IF NOT EXISTS "IDX_assignment_progress_assignment" ON "assignment_progress" ("assignment_id")');
      }
      if (hasUser) {
        await q('CREATE INDEX IF NOT EXISTS "IDX_assignment_progress_user" ON "assignment_progress" ("user_id")');
      }
      if (hasAssignment && hasUser && stepCol) {
        await q(
          `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_assignment_progress_unique" ON "assignment_progress" ("assignment_id", "${stepCol}", "user_id")`
        );
      }
    }

    // --- notifications ---
    if (await hasTable('notifications')) {
      if (await hasCol('notifications', 'user_id')) {
        await q('CREATE INDEX IF NOT EXISTS "IDX_notifications_user_id" ON "notifications" ("user_id")');
      }
      // GUARD: jei nėra is_read – praleidžiam; servise fallback'as naudos read_at IS NULL
      if (await hasCol('notifications', 'is_read')) {
        await q('CREATE INDEX IF NOT EXISTS "IDX_notifications_is_read" ON "notifications" ("is_read")');
      }
      if (await hasCol('notifications', 'created_at')) {
        await q('CREATE INDEX IF NOT EXISTS "IDX_notifications_created_at" ON "notifications" ("created_at")');
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Visi su IF EXISTS – saugu ant skirtingų schemų
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_notifications_created_at"');
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_notifications_is_read"');
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_notifications_user_id"');
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_assignment_progress_user"');
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_assignment_progress_assignment"');
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_assignment_progress_unique"');
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_ASSIGNMENTS_CREATED_AT"');
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_ASSIGNMENTS_GROUP_ID"');
  }
}
