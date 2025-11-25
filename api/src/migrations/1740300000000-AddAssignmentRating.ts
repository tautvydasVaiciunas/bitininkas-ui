import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAssignmentRating1740300000000 implements MigrationInterface {
  name = 'AddAssignmentRating1740300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "assignments"
      ADD COLUMN IF NOT EXISTS "rating" SMALLINT NULL DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS "rating_comment" TEXT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "assignments"
      DROP COLUMN IF EXISTS "rating_comment",
      DROP COLUMN IF EXISTS "rating"
    `);
  }
}
