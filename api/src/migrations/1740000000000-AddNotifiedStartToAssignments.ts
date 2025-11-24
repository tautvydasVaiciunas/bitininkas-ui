import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNotifiedStartToAssignments1740000000000 implements MigrationInterface {
  name = 'AddNotifiedStartToAssignments1740000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "assignments"
      ADD COLUMN IF NOT EXISTS "notified_start" boolean NOT NULL DEFAULT false
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "assignments"
      DROP COLUMN IF EXISTS "notified_start"
    `);
  }
}
