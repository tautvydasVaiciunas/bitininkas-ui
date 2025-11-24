import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNotifiedDueSoonToAssignments1740100000000 implements MigrationInterface {
  name = 'AddNotifiedDueSoonToAssignments1740100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "assignments"
      ADD COLUMN IF NOT EXISTS "notified_due_soon" boolean NOT NULL DEFAULT false
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "assignments"
      DROP COLUMN IF EXISTS "notified_due_soon"
    `);
  }
}
