import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAssignmentRatedAt1740600000000 implements MigrationInterface {
  name = 'AddAssignmentRatedAt1740600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "assignments"
      ADD COLUMN IF NOT EXISTS "rated_at" TIMESTAMPTZ NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "assignments"
      DROP COLUMN IF EXISTS "rated_at"
    `);
  }
}
